import * as fs from "node:fs";
import path from "node:path";
import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { type Resource, WalletBuilder } from "@midnight-ntwrk/wallet";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { getZswapNetworkId, NetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

const currentDir = path.resolve(new URL(import.meta.url).pathname, "..");
const testnetWalletSeeds = {
  alice:
    "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim",
  bob: "jaguar false movie since grief relief fatigue rose core squirrel music dawn envelope ritual imitate minor put eager label split industry original wave dune",
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export class TestnetLocalConfig implements Config {
  logDir = path.resolve(
    currentDir,
    "..",
    "logs",
    "standalone",
    `${new Date().toISOString()}.log`,
  );
  indexer = "http://127.0.0.1:8088/api/v1/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v1/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

const createWallet = async (
  wallet: string,
): Promise<Wallet & Resource> => {
  let config = new TestnetLocalConfig();
  switch (wallet) {
    case "alice":
      return await buildWalletAndWaitForFunds(
        config,
        "0000000000000000000000000000000000000000000000000000000000000001",
        "",
      );
    case "bob":
      return await buildWalletAndWaitForFunds(
        config,
        mnemonicToEntropy(testnetWalletSeeds.bob),
        "",
      );
    default:
      throw new Error("Wallet seed is required for testnet");
  }
};

const streamToString = async (stream: fs.ReadStream): Promise<string> => {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) =>
      chunks.push(
        typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk,
      ),
    );
    stream.on("error", (err) => {
      reject(err);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
};

const isAnotherChain = async (
  wallet: Wallet,
  offset: number,
): Promise<boolean> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return (
    state.syncProgress !== undefined &&
    offset > (state.syncProgress as any).nextIndexToWatch
  );
};

export const waitForSync = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress !== undefined && state.syncProgress.synced;
      }),
    ),
  );

export const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress?.synced === true;
      }),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  seed: string,
  filename: string,
): Promise<Wallet & Resource> => {
  const directoryPath = process.env.SYNC_CACHE;
  let wallet: Wallet & Resource;
  if (directoryPath !== undefined) {
    if (fs.existsSync(`${directoryPath}/${filename}`)) {
      console.log(
        `Attempting to restore state from ${directoryPath}/${filename}`,
      );
      try {
        const serializedStream = fs.createReadStream(
          `${directoryPath}/${filename}`,
          "utf-8",
        );
        const serialized = await streamToString(serializedStream);
        serializedStream.on("finish", () => {
          serializedStream.close();
        });
        3;
        wallet = await WalletBuilder.restore(
          indexer,
          indexerWS,
          proofServer,
          node,
          seed,
          serialized,
          "info",
        );
        wallet.start();
        const stateObject = JSON.parse(serialized);
        if (
          (await isAnotherChain(wallet, Number(stateObject.offset))) === true
        ) {
          console.log("The chain was reset, building wallet from scratch");
          wallet = await WalletBuilder.build(
            indexer,
            indexerWS,
            proofServer,
            node,
            seed,
            getZswapNetworkId(),
            "info",
          );
          wallet.start();
        } else {
          const newState = await waitForSync(wallet);
          if (newState.syncProgress?.synced) {
            console.log("Wallet was able to sync from restored state");
          } else {
            console.log(`Offset: ${stateObject.offset}`);
            console.log(
              `SyncProgress.lag.applyGap: ${newState.syncProgress?.lag.applyGap}`,
            );
            console.log(
              `SyncProgress.lag.sourceGap: ${newState.syncProgress?.lag.sourceGap}`,
            );
            console.log(
              "[WARNING]: Wallet was not able to sync from restored state, building wallet from scratch",
            );
            wallet = await WalletBuilder.build(
              indexer,
              indexerWS,
              proofServer,
              node,
              seed,
              getZswapNetworkId(),
              "info",
            );
            wallet.start();
          }
        }
      } catch (e) {
        console.log(`[WARNING]: Failed to restore wallet from cache: ${e}`);
        wallet = await WalletBuilder.build(
          indexer,
          indexerWS,
          proofServer,
          node,
          seed,
          getZswapNetworkId(),
          "info",
        );
        wallet.start();
      }
    } else {
      wallet = await WalletBuilder.build(
        indexer,
        indexerWS,
        proofServer,
        node,
        seed,
        getZswapNetworkId(),
        "info",
      );
      wallet.start();
    }
  } else {
    wallet = await WalletBuilder.build(
      indexer,
      indexerWS,
      proofServer,
      node,
      seed,
      getZswapNetworkId(),
      "info",
    );
    wallet.start();
  }

  const state = await Rx.firstValueFrom(wallet.state());
  console.log(`Your wallet seed is: ${seed}`);
  console.log(
    `Your wallet address is: ${state.address} ; ${state.coinPublicKeyLegacy}`,
  );
  let balance = state.balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    console.log(`Your wallet balance is: 0`);
    console.log(`Waiting to receive tokens...`);
    balance = await waitForFunds(wallet);
  }
  console.log(`Your wallet balance is: ${balance}`);
  return wallet;
};

const wallet = await createWallet('alice');
await wallet.close();
