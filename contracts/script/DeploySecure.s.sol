// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SecureVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockVaultToken is ERC20 {
    constructor() ERC20("Mock Vault Token", "MVT") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals()); // 1M tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeploySecure is Script {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying Secure Vault Contract ===");
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);

        // Deploy mock token
        MockVaultToken mockToken = new MockVaultToken();
        console.log("Mock Vault Token deployed at:", address(mockToken));

        // Deploy vault with the deployer as admin
        SecureVault vault = new SecureVault(address(mockToken), msg.sender);
        console.log("Secure Vault Contract deployed at:", address(vault));

        // Fund deployer with test tokens
        mockToken.transfer(msg.sender, 10_000 * 10 ** mockToken.decimals());

        vm.stopBroadcast();

        // Summary
        console.log("=== Deployment Summary ===");
        console.log("Mock Token:", address(mockToken));
        console.log("Vault:", address(vault));
        console.log(
            "Deployer balance:",
            mockToken.balanceOf(msg.sender) / 10 ** mockToken.decimals(),
            "tokens"
        );

        console.log("\n=== Security Features ===");
        console.log(unicode"✓ Role-based access control");
        console.log(unicode"✓ ReentrancyGuard protection");
        console.log(unicode"✓ Pausable contract functions");
        console.log(unicode"✓ Emergency withdrawal with time delay");
        console.log(unicode"✓ Input validation and safe transfers");

        console.log("\n=== Contract Limits ===");
        console.log("Min lock (days):", vault.MIN_LOCK_DURATION() / 86400);
        console.log("Max lock (days):", vault.MAX_LOCK_DURATION() / 86400);
        console.log(
            "Max deposit (tokens):",
            vault.MAX_DEPOSIT_AMOUNT() / 10 ** mockToken.decimals()
        );
        console.log("Emergency delay (hours):", vault.EMERGENCY_DELAY() / 3600);

        console.log("\n=== Test Commands ===");
        console.log("cast call", address(vault), "totalDeposits()(uint256)");
        console.log("cast call", address(vault), "paused()(bool)");

        console.log("\n=== Example Usage ===");

        console.log("1. Approve:");
        console.log(
            "cast send",
            address(mockToken),
            "approve(address,uint256)"
        );
        console.log(address(vault), "1000000000000000000000");

        console.log("2. Deposit:");
        console.log("cast send", address(vault), "deposit(uint256,uint256)");
        console.log("1000000000000000000000", "86400");

        console.log("3. Check deposits:");
        console.log(
            "cast call",
            address(vault),
            "getUserDepositCount(address)(uint256)"
        );
        console.log(msg.sender);
        console.log(
            "2. Deposit: cast send",
            address(vault),
            "deposit(uint256,uint256) 1000000000000000000000 86400"
        );
        console.log(
            "3. Check deposits: cast call",
            address(vault),
            "getUserDepositCount(address)(uint256)",
            msg.sender
        );

        // Save addresses
        string memory addresses = string(
            abi.encodePacked(
                "MOCK_VAULT_TOKEN=",
                vm.toString(address(mockToken)),
                "\n",
                "SECURE_VAULT=",
                vm.toString(address(vault)),
                "\n"
            )
        );
        vm.writeFile("secure-addresses.env", addresses);
        console.log("Saved to secure-addresses.env");
    }
}
