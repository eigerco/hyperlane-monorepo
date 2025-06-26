import {
  AccountInfo,
  ActiveChainInfo,
  ChainTransactionFns,
  WalletDetails,
} from './types.js';
import {  useCallback, useMemo } from 'react';
import {
  ChainName,
  MultiProtocolProvider,
  ProviderType,
  WarpTypedTransaction,
} from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';


export function useSovereignAccount(
  _multiProvider: MultiProtocolProvider,
): AccountInfo {
  // const { publicKey, connected, wallet } = useWallet();
  // TODO: Add actual account connections
  const isReady = true; //!!(publicKey && wallet && connected);

  return useMemo<AccountInfo>(
    () => ({
      protocol: ProtocolType.Sovereign,
      addresses: [],
      isReady: isReady,
    }),
    [isReady],
  );
}


export function useSovereignWalletDetails() {

  return useMemo<WalletDetails>(
    () => ({
    }),
    [],
  );
}

export function useSovereignConnectFn(): () => void {
  // const { setVisible } = useWalletModal();
  // return useCallback(() => setVisible(true), [setVisible]);
  return () => {};
}

export function useSovereignDisconnectFn(): () => Promise<void> {
  // const { disconnect } = useWallet();
  // return disconnect;
  return () => Promise.resolve();
}

export function useSovereignActiveChain(
  multiProvider: MultiProtocolProvider,
): ActiveChainInfo {
  // const { connection } = useConnection();
  // const connectionEndpoint = connection?.rpcEndpoint;
  return useMemo<ActiveChainInfo>(() => {
    // try {
    //   const hostname = new URL(connectionEndpoint).hostname;
    //   const metadata = findChainByRpcUrl(multiProvider, hostname);
    //   if (!metadata) return {};
    //   return {
    //     chainDisplayName: metadata.displayName,
    //     chainName: metadata.name,
    //   };
    // } catch (error) {
    //   logger.warn('Error finding sol active chain', error);
    //   return {};
    // }
    return {
      chainDisplayName: 'Sovereign Placeholder',
      chainName: 'sovereign',
    }
    
  }, [multiProvider]);
}

export function useSovereignTransactionFns(
  multiProvider: MultiProtocolProvider,
): ChainTransactionFns {
  // const { sendTransaction: sendSolTransaction } = useWallet();

  const onSwitchNetwork = useCallback(async (chainName: ChainName) => {
    // logger.warn(`Sovereign SDK chain (${chainName})is not supported`);
  }, []);

  const onSendTx = useCallback(
    async ({
      tx,
      chainName,
      activeChainName,
    }: {
      tx: WarpTypedTransaction;
      chainName: ChainName;
      activeChainName?: ChainName;
    }) => {
      if (tx.type !== ProviderType.Sovereign)
        throw new Error(`Unsupported tx type: ${tx.type}`);
      // if (activeChainName && activeChainName !== chainName)
      //   await onSwitchNetwork(chainName);
      // const rpcUrl = multiProvider.getRpcUrl(chainName);
      // const connection = new Connection(rpcUrl, 'confirmed');
      // const {
      //   context: { slot: minContextSlot },
      //   value: { blockhash, lastValidBlockHeight },
      // } = await connection.getLatestBlockhashAndContext();

      // logger.debug(`Sending tx on chain ${chainName}`);
      // const signature = await sendSolTransaction(tx.transaction, connection, {
      //   minContextSlot,
      // });

      // const confirm = (): Promise<TypedTransactionReceipt> =>
      //   connection
      //     .confirmTransaction({ blockhash, lastValidBlockHeight, signature })
      //     .then(() => connection.getTransaction(signature))
      //     .then((r) => ({
      //       type: ProviderType.SolanaWeb3,
      //       receipt: r!,
      //     }));

      return { hash: 'signature', confirm: () => Promise.reject() };
      // return {};
    },
    [],
  );

  return { sendTransaction: onSendTx, switchNetwork: onSwitchNetwork };
}
