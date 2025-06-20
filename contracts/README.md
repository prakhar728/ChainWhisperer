
# 🔧 Foundry Smart Contract Toolkit (Mantle Deployment)

This repo uses **[Foundry](https://book.getfoundry.sh/)** — a blazing fast, portable, and modular toolkit for Ethereum development, written in Rust.

---

## 🔗 Deployed Contracts

| Contract               | Source File                                                             | Status      | Deployed Address                                                                                          |
|------------------------|--------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [VulnerableStaking.sol](./src/VulnerableStaking.sol) | `src/VulnerableStaking.sol`                                              | ✅ Verified  | [0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91](https://sepolia.mantlescan.xyz/address/0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91) |
| [Vulnerable2.sol](./src/VulnerableStaking2.sol)             | `src/VulnerableStaking2.sol`                                                    | —           | [0xA6919BaA319Ee57a3fbb978C3efD60b332218966](https://sepolia.mantlescan.xyz/address/0xA6919BaA319Ee57a3fbb978C3efD60b332218966) |

---

## 🧰 Foundry Toolkit Overview

**Foundry** includes:

- 🔬 **Forge**: Testing framework for Solidity (like Truffle/Hardhat)
- 🛠️ **Cast**: CLI tool for interacting with contracts and chain data
- 🧪 **Anvil**: Local Ethereum node (like Ganache/Hardhat Network)
- 🧱 **Chisel**: Solidity REPL

📚 Full Docs: [book.getfoundry.sh](https://book.getfoundry.sh/)

---

## 🧪 Common Usage

### 🏗️ Build Contracts

```bash
forge build
```

### ✅ Run Tests

```bash
forge test
```

### 🧹 Format Code

```bash
forge fmt
```

### ⛽ Gas Snapshot

```bash
forge snapshot
```

### ⚙️ Local Node

```bash
anvil
```

---

## 🚀 Deploy to Mantle Testnet

### Deploy Vulnerable Contract (Verified)

```bash
forge script script/DeployVulnerable.s.sol \
  --tc DeployVulnerable \
  --rpc-url $MANTLE_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Verify on MantleScan

```bash
forge verify-contract \
  --constructor-args 0x0000000000000000000000001838bb5e7c8351a1d3c3b876130f0f7c840b263e \
  --verifier-url https://api-sepolia.mantlescan.xyz/api \
  --etherscan-api-key $MANTLESCAN_API_KEY \
  --compiler-version "v0.8.28" \
  0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91 \
  src/VulnerableStaking.sol:VulnerableStaking \
  --watch
```

### Deploy Secure Contract

```bash
forge script script/DeploySecure.s.sol \
  --tc DeploySecure \
  --rpc-url $MANTLE_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Example Script Execution

```bash
forge script script/Counter.s.sol:CounterScript \
  --rpc-url <your_rpc_url> \
  --private-key <your_private_key>
```

---

## 🧠 Notes

- Use `.env` to manage secrets like `PRIVATE_KEY` and RPC URLs.
- Scripts are written in `script/` and correspond to the source contracts in `src/`.
- Verified contracts can be inspected on [Mantle Explorer](https://explorer.mantlenetwork.io/).

---

## 🛡️ Security Notice

These contracts are **educational** and include **intentionally vulnerable logic**. Do not use them in production or with real funds.

---
