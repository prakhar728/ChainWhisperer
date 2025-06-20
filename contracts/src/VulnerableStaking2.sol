// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VulnerableStaking2
 * @dev A staking contract with subtle vulnerabilities that require AI analysis to detect
 * WARNING: This contract contains intentional vulnerabilities for testing purposes
 */
contract VulnerableStaking2 is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
    }
    
    mapping(address => Stake) public stakes;
    mapping(address => bool) public authorized;
    
    uint256 public totalStaked;
    uint256 public rewardRate = 100; // 1% per day (100 basis points)
    uint256 public constant REWARD_PRECISION = 10000;
    uint256 public lastUpdateTime;
    uint256 public accRewardPerToken;
    
    // Emergency functions - seems reasonable but has issues
    bool public emergencyMode;
    address public emergencyOperator;
    
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event EmergencyActivated(address operator);
    
    constructor(address _stakingToken) Ownable(msg.sender){
        stakingToken = IERC20(_stakingToken);
        lastUpdateTime = block.timestamp;
        emergencyOperator = msg.sender;
    }
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // VULNERABILITY 1: Missing access control - anyone can add authorized users
    function addAuthorizedUser(address user) external {
        authorized[user] = true;
    }
    
    // VULNERABILITY 2: Integer overflow in reward calculation (subtle)
    function calculateReward(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - userStake.timestamp;
        // This can overflow with large amounts or long time periods
        uint256 reward = (userStake.amount * rewardRate * timeElapsed) / (86400 * REWARD_PRECISION);
        return reward;
    }
    
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Claim existing rewards first
        if (stakes[msg.sender].amount > 0) {
            claimReward();
        }
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        stakes[msg.sender] = Stake({
            amount: stakes[msg.sender].amount + amount,
            timestamp: block.timestamp,
            rewardDebt: 0
        });
        
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(stakes[msg.sender].amount >= amount, "Insufficient stake");
        require(!emergencyMode, "Emergency mode active");
        
        // Claim rewards first
        claimReward();
        
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        
        if (stakes[msg.sender].amount == 0) {
            delete stakes[msg.sender];
        } else {
            stakes[msg.sender].timestamp = block.timestamp;
        }
        
        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    function claimReward() public nonReentrant {
        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards available");
        
        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].rewardDebt += reward;
        
        // VULNERABILITY 3: Reward tokens come from the same pool as staked tokens
        // This can drain the contract if rewards exceed available balance
        stakingToken.transfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, reward);
    }
    
    // VULNERABILITY 4: Emergency functions with weak access control
    function setEmergencyMode(bool _emergencyMode) external {
        require(msg.sender == emergencyOperator, "Only emergency operator");
        emergencyMode = _emergencyMode;
        emit EmergencyActivated(msg.sender);
    }
    
    // VULNERABILITY 6: Owner can drain all funds with no timelock
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = stakingToken.balanceOf(address(this));
        stakingToken.transfer(owner(), balance);
    }
    
    // VULNERABILITY 7: Reward rate can be set to extremely high values
    function setRewardRate(uint256 newRate) external onlyAuthorized {
        rewardRate = newRate; // No bounds checking
    }
    
    // Seems helpful but creates attack vector
    function batchClaimForUsers(address[] calldata users) external onlyAuthorized {
        for (uint i = 0; i < users.length; i++) {
            if (stakes[users[i]].amount > 0) {
                uint256 reward = calculateReward(users[i]);
                if (reward > 0) {
                    stakes[users[i]].timestamp = block.timestamp;
                    stakingToken.transfer(users[i], reward);
                    emit RewardClaimed(users[i], reward);
                }
            }
        }
    }
    
    // View functions
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 timestamp,
        uint256 pendingReward
    ) {
        Stake memory userStake = stakes[user];
        return (
            userStake.amount,
            userStake.timestamp,
            calculateReward(user)
        );
    }
}