
<p align="center">
  <img src="extension/src/assets/icons/icon.png" alt="ChainWhisperer Logo" width="120"/>
</p>

# 🧙‍♂️ ChainWhisperer — Onchain AI Copilot (Browser Extension)

> “Talk to your contracts before they talk back.”

---


*ChainWhisperer is a browser extension that acts as your personal AI copilot—analyzing smart contracts, flagging risks, and explaining interactions in real-time before you ever click "Confirm."*

---

## Description

ChainWhisperer is a browser extension that lets Web3 users chat with smart contracts, flag risks, and understand transactions in plain language before signing. Built for users of MantleExplorer, dApps, and MetaMask, it's ideal for anyone who wants safer, smarter onchain interactions without needing to read Solidity.

---

## What It Does

1. **Verified Contracts**: When you open MantleExplorer with a contract address in the URL, ChainWhisperer initiates a chat session, summarizes the contract's read/write functions, and allows you to talk to it to understand what the contract does—all in natural language.
2. **Unverified Contracts**: If the contract is unverified, ChainWhisperer uses the [Dedaub API](https://app.dedaub.com/) to decompile the bytecode into human-readable Solidity, then passes that to Nebula AI to generate a plain-English analysis.
3. **Manual Fallback**: If automatic decompilation fails, users can manually upload bytecode to [Dedaub's Decompiler](https://app.dedaub.com/decompile?network=ethereum) and paste the result into the extension for review.
4. **No Coding Required**: Enables anyone to understand and interact with Mantle smart contracts—no Solidity knowledge or coding required.

---

## Demo

To try out the ChainWhisperer extension:

1. **Download** the `dist` file from the Google Drive link provided to judges in the submission form.
2. Open Chrome and go to `chrome://extensions/`.
3. **Enable Developer Mode** (toggle in the top right).
4. Click **“Load unpacked”** and select the **unzipped `dist` folder**.
5. Ensure that `manifest.json` is present in the root of the folder.
6. The extension should now be active — open MantleExplorer or a dApp and start interacting with smart contracts using ChainWhisperer.

Boom — safe, intelligent Web3 transactions at your fingertips.

---

## Why This Matters

Smart contract interactions today are risky, opaque, and developer-centric. Millions of users are expected to sign transactions they don’t fully understand — often leading to scams, exploits, and irreversible loss.

ChainWhisperer addresses this through:

- Introducing **safer transaction flows** through real-time AI explanations and risk flagging
- Eliminating the need to read or understand Solidity — users get human-readable summaries and Q&A
- Enabling interaction with even **unverified contracts**, which are typically red flags — by decompiling bytecode and reviewing it through AI
- Empowering users to **make informed decisions**, not blind approvals

As this evolves into a full wallet, ChainWhisperer becomes not just a safety net — but a smarter, more transparent gateway to the Mantle Ecosystem.

---

## What I'm Proud Of

- I’m proud of the *roasts* I got early on — and how I used that feedback to build something real. Instead of making just another webpage, I created a browser extension to reduce user friction and meet users where they are.
- I figured out a working flow to interact with **unverified contracts**, turning a major red flag into a solvable challenge.
- I managed to design, build, and ship the **MVP in a short time**, competing head-to-head with more mature tools and teams.

---

## ✨ Features

- Parses and understands both **verified** and **unverified** contracts using AI and bytecode decompilation
- Auto-detects contracts on MantleExplorer and MantleScan
- Ask questions like “What does this function do?” or “Is this contract malicious?”
- Flags risky functions and patterns before you sign
- Explains contract logic and transaction intent in natural language
- Built on Mantle Network for low-cost, fast contract reads


---

## 🛠️ Tech Stack

- **Extension**: Manifest v3 + React
- **Blockchain Reads**: Mantle RPC, Thirdweb SDK
- **AI Layer**: Nubla (OpenAI backend)
- **Contract Metadata**: Sourcify & MantleScan APIs

---

## Current Status

We’re actively building ChainWhisperer with:

- Ability to parse both verified and unverified contracts
- Chat-based conversation with the contract to understand its functions and risks
- Contract summarization and natural language explanations
- Basic heuristic risk detection and flagging


---


## Roadmap

- [x] Auto-detect contracts on supported pages
- [x] Natural language summaries and contract Q&A
- [ ] Transaction simulation previews
- [ ] Safe-mode wallet with auto-blocking for risky interactions
- [ ] Production-level integration with Dedaub for unverified contract analysis
- [ ] Ability to execute transactions directly based on user signatures
- [ ] Publish extension to the Chrome Developer Dashboard


---

## Built With

- [Mantle Network](https://mantlenetwork.io/)
- [Thirdweb](https://thirdweb.com/)
- [Nebula AI](https://portal.thirdweb.com/nebula)
- [Ethers.js](https://docs.ethers.org/)

---


## Deployed Contracts

| Contract               | Source File                                                             | Status      | Deployed Address                                                                                          |
|------------------------|--------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [VulnerableStaking.sol](contracts/src/VulnerableStaking.sol) | `src/VulnerableStaking.sol`                                              | ✅ Verified  | [0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91](https://sepolia.mantlescan.xyz/address/0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91) |
| [Vulnerable2.sol](contracts/src/VulnerableStaking2.sol)             | `src/VulnerableStaking2.sol`                                                    | —           | [0xA6919BaA319Ee57a3fbb978C3efD60b332218966](https://sepolia.mantlescan.xyz/address/0xA6919BaA319Ee57a3fbb978C3efD60b332218966) |

---

## Contribute

ChainWhisperer is being built for the Web3 community. Contributions, feature ideas, and feedback are all welcome. Feel free to fork the repo, submit PRs, or open issues.

---

## Disclaimer

This tool is in early development. While it uses AI to surface contract insights and flag risks, **always DYOR** before signing any transaction. ChainWhisperer provides helpful guidance but cannot guarantee full safety.

---
