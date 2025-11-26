import pino from "pino";
import * as Rx from "rxjs";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { type Wallet } from "@midnight-ntwrk/wallet-api";

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export const waitForSync = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap(() => {
        logger.info('Waiting for wallet to sync...');
      }),
      Rx.filter((state) =>
        state.syncProgress?.synced === true &&
        state.syncProgress?.lag.applyGap === 0n &&
        state.syncProgress?.lag.sourceGap === 0n
      ),
    ),
  );
