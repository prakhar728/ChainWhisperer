// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/VulnerableStaking2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Staking Token", "MST") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeployVulnerable is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();
        
        console.log("=== Deploying Vulnerable Staking Contract ===");
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);
        
        // Deploy mock token first
        MockToken mockToken = new MockToken();
        console.log("Mock Token deployed at:", address(mockToken));
        
        // Deploy vulnerable staking contract
        VulnerableStaking2 stakingContract = new VulnerableStaking2(address(mockToken));
        console.log("Vulnerable Staking Contract deployed at:", address(stakingContract));
        
        // Setup some initial state to make it look legitimate
        mockToken.transfer(address(stakingContract), 100000 * 10**18); // 100k tokens for rewards
        
        // Add some seemingly legitimate authorized users (but anyone can add more!)
        stakingContract.addAuthorizedUser(msg.sender);
        
        // Set a reasonable-looking reward rate (but can be changed to extreme values)
        stakingContract.setRewardRate(100); // 1% per day
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("Mock Token:", address(mockToken));
        console.log("Vulnerable Staking:", address(stakingContract));
        console.log("Initial token balance in contract:", mockToken.balanceOf(address(stakingContract)) / 10**18, "tokens");
        
        console.log("\n=== Security Issues Present ===");
        console.log("1. Missing access control on addAuthorizedUser()");
        console.log("2. Integer overflow in reward calculation");
        console.log("3. Reward tokens drain from same pool as staked tokens");
        console.log("4. Weak emergency mode access control");
        console.log("5. Emergency operator can be changed by any authorized user");
        console.log("6. Owner can drain all funds instantly");
        console.log("7. Unbounded reward rate setting");
        console.log("8. Batch operations can drain contract");
        
        console.log("\n=== Test Commands ===");
        console.log("To interact with the contract:");
        console.log("cast call", address(stakingContract), "rewardRate()(uint256)");
        console.log("cast call", address(stakingContract), "totalStaked()(uint256)");
        console.log("cast call", address(stakingContract), "emergencyMode()(bool)");
        
        // Save addresses to a file for easy access
        string memory addresses = string(
            abi.encodePacked(
                "MOCK_TOKEN=", vm.toString(address(mockToken)), "\n",
                "VULNERABLE_STAKING=", vm.toString(address(stakingContract)), "\n"
            )
        );
        vm.writeFile("vulnerable-addresses2.env", addresses);
        console.log("\nAddresses saved to vulnerable-addresses2.env");
    }
}