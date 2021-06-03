import {
  Account,
  Cluster,
  Context,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  SignatureResult,
} from '@solana/web3.js';
import {
  AggregatorState,
  FulfillmentManagerAuth,
  FulfillmentManagerState,
  OracleJob,
  SWITCHBOARD_DEVNET_PID,
  SwitchboardAccountType,
  SwitchboardInstruction,
  addFeedJob,
  createDataFeed,
  createFulfillmentManager,
  createFulfillmentManagerAuth,
  createOwnedStateAccount,
  initFulfillmentManagerAccount,
  publishSwitchboardAccount,
  removeFeedJob,
  setDataFeedConfigs,
  setFulfillmentManagerConfigs,
  updateFeed,
} from '@switchboard-xyz/switchboard-api';
import { EventEmitter } from "events";
import { waitFor } from "wait-for-event";
const yargs = require('yargs/yargs');
const resolve = require('resolve-dir');
const bs58 = require('bs58');
const fs = require('fs');

let argv = yargs(process.argv).options({
  'updateAuthPubkey': {
    type: 'string',
    describe: 'The public key of the auth account permitting data feed updates.',
    demand: true,
  },
  'dataFeedPubkey': {
    type: 'string',
    describe: 'The public key of the data feed being updated.',
    demand: true,
  },
  'payerFile': {
    type: 'string',
    describe: 'Keypair file to pay for transactions.',
    demand: true,
  },
}).argv;

function toCluster(cluster: string): Cluster {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta": {
      return cluster;
    }
  }
  throw new Error("Invalid cluster provided.");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let cluster = 'devnet';
  let connection = new Connection(clusterApiUrl(toCluster(cluster), true), 'finalized');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let payerAccount = new Account(payerKeypair);
  let dataFeedPubkey = new PublicKey(argv.dataFeedPubkey);
  let updateAuthPubkey = new PublicKey(argv.updateAuthPubkey);
  let signature = await updateFeed(
    connection,
    payerAccount, 
    dataFeedPubkey,
    updateAuthPubkey
  );
  console.log("Awaiting update transaction finalization...");
  let emitter = new EventEmitter();
  let callback = async function (signatureResult: SignatureResult, ctx: Context) {
    let feedAccountInfo = await connection.getAccountInfo(dataFeedPubkey);
    let state: AggregatorState = AggregatorState.decodeDelimited(feedAccountInfo!.data.slice(1));
    // It may take a few more seconds for the oracle response to be confirmed.
    await sleep(5000);
    console.log(`(${dataFeedPubkey.toBase58()}) state.\n`,
                JSON.stringify(state.toJSON(), null, 2));
    emitter.emit("Done");
  };
  connection.onSignature(signature, callback, 'finalized');
  await waitFor("Done", emitter);
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
