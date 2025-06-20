## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy Testnet

```shell
forge script script/DeployVulnerable.s.sol \
    --tc DeployVulnerable \
    --rpc-url $MANTLE_TESTNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast

forge verify-contract  --constructor-args 0x0000000000000000000000001838bb5e7c8351a1d3c3b876130f0f7c840b263e --verifier-url https://api-sepolia.mantlescan.xyz/api --etherscan-api-key $MANTLESCAN_API_KEY --compiler-version "v0.8.28" 0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91 src/VulnerableStaking.sol:VulnerableStaking --watch

forge script script/DeploySecure.s.sol \
 --tc DeploySecure \
    --rpc-url $MANTLE_TESTNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast


$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```


Verified Vulnerable Contract:  0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91

Unverified Vulnerable Contract:
0x1Df974A24e7F9E66458cfD9c55F21b605219d673

Verified Secure Vault:
0x43BafD5F20d1F89d8ACEA7b1FD4Da562fd322935

Vulnerable2: 0xA6919BaA319Ee57a3fbb978C3efD60b332218966