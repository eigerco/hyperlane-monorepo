import { stringify as yamlStringify } from 'yaml';

import { ChainName, HyperlaneCore, HyperlaneRelayer } from '@hyperlane-xyz/sdk';
import { addressToBytes32, timeout } from '@hyperlane-xyz/utils';

import { MINIMUM_TEST_SEND_GAS } from '../consts.js';
import { CommandContext, WriteCommandContext } from '../context/types.js';
import { runPreflightChecksForChains } from '../deploy/utils.js';
import { errorRed, log, logBlue, logGreen } from '../logger.js';
import { runSingleChainSelectionStep } from '../utils/chains.js';
import { indentYamlOrJson } from '../utils/files.js';
import { stubMerkleTreeConfig } from '../utils/relay.js';

export async function sendTestMessage({
  context,
  origin,
  destination,
  messageBody,
  timeoutSec,
  skipWaitForDelivery,
  selfRelay,
}: {
  context: WriteCommandContext;
  origin?: ChainName;
  destination?: ChainName;
  messageBody: string;
  timeoutSec: number;
  skipWaitForDelivery: boolean;
  selfRelay?: boolean;
}) {
  log(`CHECKPOINT 7`);
  const { chainMetadata } = context;

  if (!origin) {
    origin = await runSingleChainSelectionStep(
      chainMetadata,
      'Select the origin chain',
    );
  }

  if (!destination) {
    destination = await runSingleChainSelectionStep(
      chainMetadata,
      'Select the destination chain',
    );
  }

  await runPreflightChecksForChains({
    context,
    chains: [origin, destination],
    chainsToGasCheck: [origin],
    minGas: MINIMUM_TEST_SEND_GAS,
  });

  await timeout(
    executeDelivery({
      context,
      origin,
      destination,
      messageBody,
      skipWaitForDelivery,
      selfRelay,
    }),
    timeoutSec * 1000,
    'Timed out waiting for messages to be delivered',
  );
}

async function executeDelivery({
  context,
  origin,
  destination,
  messageBody,
  skipWaitForDelivery,
  selfRelay,
}: {
  context: CommandContext;
  origin: ChainName;
  destination: ChainName;
  messageBody: string;
  skipWaitForDelivery: boolean;
  selfRelay?: boolean;
}) {
  log(`CHECKPOINT 8: executeDelivery`);
  const { registry, multiProvider } = context;
  const chainAddresses = await registry.getAddresses();
  const core = HyperlaneCore.fromAddressesMap(chainAddresses, multiProvider);

  try {
    const recipient = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    // const recipient = "0x0";
    if (!recipient) {
      throw new Error(`Unable to find TestRecipient for ${destination}`);
    }
    const formattedRecipient = addressToBytes32(recipient);

    log('Dispatching message CHECKPOINT 3');
    const { dispatchTx, message } = await core.sendMessage(
      origin,
      destination,
      formattedRecipient,
      messageBody,
      // override the the default hook (with IGP) for self-relay to avoid race condition with the production relayer
      selfRelay ? chainAddresses[origin].merkleTreeHook : undefined,
    );
    log(`CHECKPOINT 9: executeDelivery`);
    logBlue(`Sent message from ${origin} to ${recipient} on ${destination}.`);
    logBlue(`Message ID: ${message.id}`);
    log(`Message:\n${indentYamlOrJson(yamlStringify(message, null, 2), 4)}`);

    if (selfRelay) {
      const relayer = new HyperlaneRelayer({ core });

      const hookAddress = await core.getSenderHookAddress(message);
      const merkleAddress = chainAddresses[origin].merkleTreeHook;
      stubMerkleTreeConfig(relayer, origin, hookAddress, merkleAddress);

      log('Attempting self-relay of message');
      await relayer.relayMessage(dispatchTx);
      logGreen('Message was self-relayed!');
    } else {
      if (skipWaitForDelivery) {
        return;
      }

      log('Waiting for message delivery on destination chain...');
      // Max wait 10 minutes
      await core.waitForMessageProcessed(dispatchTx, 10000, 60);
      logGreen('Message was delivered!');
    }
  } catch (e) {
    errorRed(
      `Encountered error sending message from ${origin} to ${destination}`,
    );
    throw e;
  }
}
