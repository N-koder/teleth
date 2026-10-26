import { run } from "@grammyjs/runner";
import { createBot } from "./bot/bot";
import { startHttpServer } from "./server/http.server";
import { ENV } from "./config/env";
import { CONTRACT_ADDRESSES } from "./config/contracts";
import { VanityService } from "./services/vanity.service";
import { platformService } from "./services/platform.service";
import { BlockService } from "./services/block.service";
import { walletService } from "./services/wallet.service";
import { IndexerService } from "./services/indexer.service";
import prisma from "./db/client";
import { logger } from "./utils/logger";

async function main() {
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logger.info("✦  T E L E T H  •  E T H E R E U M   L A U N C H P A D  ✦");
  logger.info("Pangea.trade ⭐ • Stockereum.com • Sender.family • Programmable.market");
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logger.info(`Chain ID            : ${ENV.CHAIN_ID} (Ethereum Mainnet)`);
  logger.info(`HTTP Port           : ${process.env.PORT || ENV.PORT}`);
  logger.info(`Primary RPC         : ${ENV.ETH_RPC_PRIMARY}`);
  logger.info(`Uniswap V4 Manager  : ${CONTRACT_ADDRESSES.UNISWAP_V4_POOL_MANAGER}`);
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Bind HTTP Health & Live Launches API Server immediately (prevents Render Port Binding Timeout)
  const { server, stopKeepAlive } = startHttpServer();

  // 2. Connect to Persistent External PostgreSQL Database & Pre-Warm All RAM Caches
  try {
    await prisma.$connect();
    logger.info("✅ Connected to persistent PostgreSQL database.");
    await Promise.all([
      platformService.init(),
      BlockService.init(),
      walletService.init(),
      IndexerService.getRecentLaunches(24),
    ]);
  } catch (dbErr: unknown) {
    const errorMsg = (dbErr as Error).message;
    logger.warn(`⚠️ PostgreSQL connection notice: ${errorMsg}`);
  }

  // 3. Ready Deterministic CREATE2 Engine (0ms Launch Latency)
  VanityService.replenishPool().catch(() => {});

  // 4. Initialize Telegram Bot
  const bot = createBot();
  let runner: ReturnType<typeof run> | undefined;

  // 5. Graceful Shutdown Handlers
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down Teleth gracefully...`);
    try {
      stopKeepAlive();
      server.close();
      if (runner && runner.isRunning()) {
        await runner.stop();
      } else {
        await bot.stop();
      }
      await prisma.$disconnect();
      logger.info("Teleth stopped cleanly.");
      process.exit(0);
    } catch (err) {
      logger.error(`Error during shutdown: ${(err as Error).message}`);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  // 6. Start Telegram Bot High-Concurrency Runner
  if (
    ENV.TELEGRAM_BOT_TOKEN === "mock_telegram_token" ||
    ENV.TELEGRAM_BOT_TOKEN === "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" ||
    ENV.TELEGRAM_BOT_TOKEN.startsWith("mock_token")
  ) {
    logger.warn("⚠️ Placeholder TELEGRAM_BOT_TOKEN detected in .env.");
    logger.warn("Set your Telegram Bot Token from @BotFather in .env to enable live chat polling.");
    logger.info("HTTP server (/health, /api/launches, /) is active and serving requests.");
  } else {
    logger.info("Connecting to Telegram Bot API...");
    const botInfo = await bot.api.getMe();

    try {
      await bot.api.setMyDescription(
        "Teleth is a non-custodial multi-launchpad bot on Ethereum Mainnet (Chain ID: 1).\n\n" +
          "• 🌍 Pangea ($PANGEA) [Featured] — 5-Chain Omnichain Launch (ETH, Base, SOL, BNB, Robinhood) • 5B Supply • LayerZero OFT • 0.3%–5% Fee\n" +
          "• 🏛️ Stockereum ($STOCKER) — Tokenized Stocks (NVDAon, TSLAon, AAPLon, SPCXon) & ETH\n" +
          "• 📡 Sender.family ($SEND) — Direct Locked V4 Pool + Multi-Wallet Disperse\n" +
          "• 🦄 Programmable ($V4) — Uniswap V4 Module Mode & Custom Hooks\n\n" +
          "Tap Start below to initialize your Ethereum Dev Vault."
      );
      await bot.api.setMyShortDescription(
        "Non-custodial Ethereum V4 launchpad terminal featuring Pangea ($PANGEA), Stockereum, Sender.family & Programmable ($V4)."
      );
      await bot.api.setMyCommands([
        { command: "start", description: "Open dashboard & switch protocol" },
        { command: "launch", description: "Launch a token on Ethereum" },
        { command: "wallet", description: "View your Ethereum Dev Vault & balances" },
        { command: "deposit", description: "Deposit ETH to your Dev Vault" },
        { command: "withdraw", description: "Withdraw ETH to an external wallet" },
        { command: "import", description: "Import an existing private key" },
        { command: "export", description: "Export your private key" },
        { command: "coins", description: "View deployed tokens & claim fees" },
        { command: "trending", description: "View live Ethereum launches" },
        { command: "help", description: "View protocol guide & commands" },
      ]);
      logger.info("✅ Telegram bot description & menu commands registered.");
    } catch (descErr) {
      logger.warn(`Could not sync bot description: ${(descErr as Error).message}`);
    }

    runner = run(bot, {
      runner: {
        fetch: {
          allowed_updates: ["message", "callback_query"],
          timeout: 10,
        },
        silent: true,
        retryInterval: 500,
        maxRetryTime: Infinity,
      },
    });

    runner?.task()?.catch((err) => {
      logger.error(`[Telegram Polling] Runner task error: ${(err as Error).message}`);
    });

    logger.info(`🤖 Teleth is live: @${botInfo.username}`);
  }
}

main().catch((error) => {
  logger.error(`Fatal application startup error: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
