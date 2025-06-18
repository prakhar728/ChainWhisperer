// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title SecureVault
 * @dev A secure token vault with time-locked withdrawals and proper access controls
 * This contract demonstrates security best practices
 */
contract SecureVault is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    using Math for uint256;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    IERC20 public immutable token;
    
    struct Deposit {
        uint256 amount;
        uint256 depositTime;
        uint256 lockDuration;
        bool withdrawn;
    }
    
    mapping(address => Deposit[]) public userDeposits;
    mapping(address => uint256) public totalUserDeposits;
    
    uint256 public totalDeposits;
    uint256 public constant MIN_LOCK_DURATION = 1 days;
    uint256 public constant MAX_LOCK_DURATION = 365 days;
    uint256 public constant MAX_DEPOSIT_AMOUNT = 1000000 * 10**18; // 1M tokens
    
    // Emergency withdrawal delay for security
    uint256 public constant EMERGENCY_DELAY = 48 hours;
    uint256 public emergencyWithdrawInitiated;
    address public emergencyWithdrawRecipient;
    
    event Deposited(address indexed user, uint256 amount, uint256 lockDuration, uint256 depositIndex);
    event Withdrawn(address indexed user, uint256 amount, uint256 depositIndex);
    event EmergencyWithdrawInitiated(address indexed recipient, uint256 timestamp);
    event EmergencyWithdrawExecuted(address indexed recipient, uint256 amount);
    event EmergencyWithdrawCancelled();
    
    constructor(address _token, address _admin) {
        require(_token != address(0), "Invalid token address");
        require(_admin != address(0), "Invalid admin address");
        
        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    /**
     * @dev Deposit tokens with a specified lock duration
     * @param amount Amount of tokens to deposit
     * @param lockDuration Duration to lock tokens (in seconds)
     */
    function deposit(uint256 amount, uint256 lockDuration) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_DEPOSIT_AMOUNT, "Amount exceeds maximum");
        require(lockDuration >= MIN_LOCK_DURATION, "Lock duration too short");
        require(lockDuration <= MAX_LOCK_DURATION, "Lock duration too long");
        
        // Check contract balance to prevent issues
        require(
            token.balanceOf(address(this)) + amount >= totalDeposits + amount,
            "Contract balance insufficient"
        );
        
        // Transfer tokens safely
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Create deposit record
        userDeposits[msg.sender].push(Deposit({
            amount: amount,
            depositTime: block.timestamp,
            lockDuration: lockDuration,
            withdrawn: false
        }));
        
        totalUserDeposits[msg.sender] += amount;
        totalDeposits += amount;
        
        emit Deposited(msg.sender, amount, lockDuration, userDeposits[msg.sender].length - 1);
    }
    
    /**
     * @dev Withdraw tokens from a specific deposit
     * @param depositIndex Index of the deposit to withdraw from
     */
    function withdraw(uint256 depositIndex) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(depositIndex < userDeposits[msg.sender].length, "Invalid deposit index");
        
        Deposit storage userDeposit = userDeposits[msg.sender][depositIndex];
        require(!userDeposit.withdrawn, "Already withdrawn");
        require(
            block.timestamp >= userDeposit.depositTime + userDeposit.lockDuration,
            "Tokens still locked"
        );
        
        uint256 amount = userDeposit.amount;
        userDeposit.withdrawn = true;
        
        totalUserDeposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        // Safe transfer
        token.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, depositIndex);
    }
    
    /**
     * @dev Get information about a specific deposit
     */
    function getDepositInfo(address user, uint256 depositIndex) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 depositTime,
            uint256 lockDuration,
            bool withdrawn,
            uint256 unlockTime,
            bool canWithdraw
        ) 
    {
        require(depositIndex < userDeposits[user].length, "Invalid deposit index");
        
        Deposit memory userDeposit = userDeposits[user][depositIndex];
        uint256 _unlockTime = userDeposit.depositTime + userDeposit.lockDuration;
        
        return (
            userDeposit.amount,
            userDeposit.depositTime,
            userDeposit.lockDuration,
            userDeposit.withdrawn,
            _unlockTime,
            !userDeposit.withdrawn && block.timestamp >= _unlockTime
        );
    }
    
    /**
     * @dev Get total number of deposits for a user
     */
    function getUserDepositCount(address user) external view returns (uint256) {
        return userDeposits[user].length;
    }
    
    /**
     * @dev Get all withdrawable deposits for a user
     */
    function getWithdrawableDeposits(address user) 
        external 
        view 
        returns (uint256[] memory withdrawableIndices, uint256 totalWithdrawable) 
    {
        uint256[] memory tempIndices = new uint256[](userDeposits[user].length);
        uint256 count = 0;
        uint256 total = 0;
        
        for (uint256 i = 0; i < userDeposits[user].length; i++) {
            Deposit memory userDeposit = userDeposits[user][i];
            if (!userDeposit.withdrawn && 
                block.timestamp >= userDeposit.depositTime + userDeposit.lockDuration) {
                tempIndices[count] = i;
                total += userDeposit.amount;
                count++;
            }
        }
        
        // Resize array to actual count
        withdrawableIndices = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            withdrawableIndices[i] = tempIndices[i];
        }
        
        return (withdrawableIndices, total);
    }
    
    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Initiate emergency withdrawal (admin only)
     * @param recipient Address to receive funds
     */
    function initiateEmergencyWithdraw(address recipient) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(recipient != address(0), "Invalid recipient");
        require(emergencyWithdrawInitiated == 0, "Emergency withdraw already initiated");
        
        emergencyWithdrawInitiated = block.timestamp;
        emergencyWithdrawRecipient = recipient;
        
        emit EmergencyWithdrawInitiated(recipient, block.timestamp);
    }
    
    /**
     * @dev Execute emergency withdrawal after delay
     */
    function executeEmergencyWithdraw() 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(emergencyWithdrawInitiated > 0, "Emergency withdraw not initiated");
        require(
            block.timestamp >= emergencyWithdrawInitiated + EMERGENCY_DELAY,
            "Emergency delay not met"
        );
        
        uint256 balance = token.balanceOf(address(this));
        address recipient = emergencyWithdrawRecipient;
        
        // Reset emergency state
        emergencyWithdrawInitiated = 0;
        emergencyWithdrawRecipient = address(0);
        
        if (balance > 0) {
            token.safeTransfer(recipient, balance);
        }
        
        emit EmergencyWithdrawExecuted(recipient, balance);
    }
    
    /**
     * @dev Cancel emergency withdrawal
     */
    function cancelEmergencyWithdraw() 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(emergencyWithdrawInitiated > 0, "No emergency withdraw to cancel");
        
        emergencyWithdrawInitiated = 0;
        emergencyWithdrawRecipient = address(0);
        
        emit EmergencyWithdrawCancelled();
    }
    
    /**
     * @dev Get contract information
     */
    function getContractInfo() 
        external 
        view 
        returns (
            uint256 contractBalance,
            uint256 _totalDeposits,
            bool isPaused,
            uint256 _emergencyWithdrawInitiated,
            address _emergencyWithdrawRecipient
        ) 
    {
        return (
            token.balanceOf(address(this)),
            totalDeposits,
            paused(),
            emergencyWithdrawInitiated,
            emergencyWithdrawRecipient
        );
    }
}