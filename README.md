# Teleth — Ethereum Multi-Launchpad Bot & Live Feed Website

Non-custodial multi-launchpad Telegram bot on **Ethereum Mainnet (Chain ID: 1)** with an integrated companion website and real-time launch feed.

---

## Supported Ethereum Launchpads

1. **🏛️ Stokerium Launchpad (`stokerium`)**
   - **Specialty**: RWA / Stock-Backed & Synthetic Index Curves (`NVDAx`, `TSLAx`, `SPYx`, `AAPLx`, `QQQx`, `GLDx`, `MSTRx`, `COINx`, `WETH`, `USDC`).
   - **CREATE2 Vanity Suffix**: `...4444`
   - **Official Attribution Link**: `https://stokerium.io/token/<CA>`

2. **📡 Sender Protocol Launchpad (`sender`)**
   - **Specialty**: Token launch with an integrated, gas-optimized **Multi-Wallet Distribution / Disperse Engine** in Block 0.
   - **CREATE2 Vanity Suffix**: `...7777`
   - **Official Attribution Link**: `https://sender.xyz/token/<CA>`

3. **🦄 Programmable Launchpad (`programmable`)**
   - **Specialty**: Deploys directly into the **Uniswap V4 PoolManager** (`0x000000000004444c5dc75cB358380D2e3dE08A90`) utilizing modular Hooks:
     - *Dynamic Swap Fee Hook* (volatility-adjusted fees)
     - *Permanent Liquidity Lock Hook* (non-withdrawable on-chain LP)
     - *Creator Fee Split Hook* (streams ongoing swap fees to the creator's Dev Vault)
   - **CREATE2 Vanity Suffix**: `...8888`
   - **Official Attribution Link**: `https://app.uniswap.org/explore/pools/ethereum/<PoolId>`

---

## Zero-Data-Loss & Render Free Tier 24/7 Architecture

- **Persistent External PostgreSQL (Neon / Supabase)**:
  - All users, AES-256-GCM encrypted Dev Vaults, platform preferences, block states, and token launches are stored in PostgreSQL via `DATABASE_URL` (`pgbouncer=true`).
  - Zero local `.json` or `.db` files are used, so container rebuilds on Render or Git deployments never lose state.
- **512MB RAM Protection**:
  - `npm start` executes `node --max-old-space-size=400 dist/index.js`.
  - Token logo uploads use streaming `sharp` transforms with `sharp.cache(false)` and `sharp.concurrency(1)`.
- **Built-in HTTP Server (`src/server/http.server.ts`)**:
  - Binds to `process.env.PORT || 3000` immediately on startup:
    - `GET /health` $\rightarrow$ Returns `200 OK` JSON health status.
    - `GET /api/launches` $\rightarrow$ Returns real-time JSON feed of deployed tokens for the companion website.
    - `GET /` $\rightarrow$ Serves the interactive companion website (`web/index.html`).
- **24/7 Keep-Alive Setup (Render + cron-job.org)**:
  1. Set `RENDER_EXTERNAL_URL="https://your-app.onrender.com"` in your Render environment variables (enables the internal 10-minute self-ping).
  2. Create a free account at [cron-job.org](https://cron-job.org) and add an HTTP `GET` job pointing to `https://your-app.onrender.com/health` every **10 minutes**.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client & push schema to PostgreSQL
npm run prisma:generate
npm run prisma:push

# 3. Build TypeScript
npm run build

# 4. Run verification suite
npm run verify

# 5. Start in development or production
npm run dev
# or
npm start
```
