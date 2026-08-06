# 🚀 Robinhood Chain NFT Minting Telegram Bot

A production-ready, high-performance Telegram Bot for monitoring and minting NFTs on **Robinhood Chain** (EVM Layer 2). Built with Node.js, TypeScript, Telegraf, Ethers.js v6, and SQLite.

---

## ✨ Features

- **Telegram-First Control**: 100% manageable via Telegram chat with interactive inline keyboards.
- **AES-256-GCM Encryption**: All wallet private keys are encrypted before saving to SQLite and decrypted strictly in-memory during transaction signing.
- **Multi-Wallet Support**: Manage multiple wallets simultaneously with parallel non-blocking transaction submission.
- **Multi-RPC Failover**: Benchmark RPC latency automatically and switch to fallback endpoints instantly if primary fails.
- **Automated Contract Monitoring**: Continuously polls target contracts for public mint availability and triggers instant transaction execution.
- **Full Field Customization**: Edit contract address, function signature/selector, price, quantity, gas limit, max fee, and priority fee directly from Telegram.
- **Production DevOps**: Docker, Docker Compose, PM2, GitHub Actions CI, and Vitest test suite included.

---

## 🛠️ Architecture Overview

```
                      ┌────────────────────────┐
                      │   Telegram App (User)  │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │    Telegraf Bot UI     │
                      └───────────┬────────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
┌───────────────┐        ┌──────────────────┐       ┌─────────────────┐
│ SQLite DB     │        │ AES-256 Crypto   │       │ Winston Logger  │
│ (WAL Mode)    │        │ Key Protection   │       │ In-Memory Buffer│
└───────▲───────┘        └────────▲─────────┘       └─────────────────┘
        │                         │
        └─────────────────────────┼──────────────────────────┐
                                  │                          │
                                  ▼                          ▼
                       ┌────────────────────┐     ┌────────────────────┐
                       │   RPC Manager      │     │  Contract Monitor  │
                       │  (Auto-Failover)   │     │  (Active Poller)   │
                       └──────────┬─────────┘     └──────────┬─────────┘
                                  │                          │
                                  ▼                          ▼
                       ┌───────────────────────────────────────────────┐
                       │            Mint Execution Engine              │
                       │   (EIP-1559, Nonces, Parallel Submission)     │
                       └──────────────────────┬────────────────────────┘
                                              │ (JSON-RPC)
                                              ▼
                                   ┌─────────────────────┐
                                   │ Robinhood Chain L2  │
                                   └─────────────────────┘
```

---

## 📋 Bot Commands Reference

| Command | Description |
|---|---|
| `/start` | Launch interactive menu and welcome message |
| `/help` | Detailed command usage reference |
| `/addwallet <name> <key>` | Encrypt and store a new EVM private key |
| `/listwallets` | View saved wallets, ETH balances, and status |
| `/removewallet <target>` | Delete a saved wallet |
| `/importwallet <name> <key>` | Alias for `/addwallet` |
| `/setrpc <name> <url> [prio]`| Add/update custom RPC node with failover priority |
| `/listrpc` | Benchmark latency and display active RPC nodes |
| `/addcontract <name> <addr> [fn] [price]` | Save target NFT contract configuration |
| `/contracts` | Display interactive menu to edit every field of contracts |
| `/deletecontract <target>` | Delete target contract configuration |
| `/startmonitor` | Start continuous background monitoring for public mint |
| `/stopmonitor` | Stop active contract monitoring loop |
| `/status` | Display operational system status & balances |
| `/logs` | View recent 20 application log entries in Telegram |
| `/backup` | Export JSON database backup |

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js >= 20.x
- npm / npx
- SQLite3

### 2. Installation & Setup

```bash
# Clone repository
git clone https://github.com/yourusername/robinhunt-nft-mint-bot.git
cd robinhunt-nft-mint-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` with your settings:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_ADMIN_ID=your_numeric_telegram_user_id
ENCRYPTION_KEY=32_byte_secret_encryption_key_string
DEFAULT_RPC_URLS=https://rpc.robinhoodchain.com
```

### 3. Build & Run Locally

```bash
# Run unit tests
npm test

# Build TypeScript project
npm run build

# Start bot in production mode
npm start
```

---

## 🐳 Deployment Options

### Option A: Docker Compose (Recommended for Linux VPS)

```bash
docker-compose up -d --build
```

### Option B: PM2 Process Manager

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

---

## 🔒 Security Best Practices

1. **Private Key Protection**: Private keys are encrypted using AES-256-GCM before writing to SQLite. Never commit your `.env` file or `ENCRYPTION_KEY`.
2. **Access Control**: Configure `TELEGRAM_ADMIN_ID` in `.env` to restrict bot usage exclusively to your numeric Telegram user ID.
3. **VPS Security**: Run the application as a non-root user and keep SQLite database files permissions strictly restricted (`chmod 600 data/robinhunt.db`).

---

## 🧪 Testing

```bash
# Run unit tests with Vitest
npm test

# Run linter & type-checker
npm run lint
```

---

## 📄 License
MIT
