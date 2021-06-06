import { Account, Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import {
  addFeedJob,
  createDataFeed,
  createFulfillmentManager,
  createFulfillmentManagerAuth,
  OracleJob,
  setDataFeedConfigs,
  setFulfillmentManagerConfigs,
  SWITCHBOARD_DEVNET_PID,
} from "@switchboard-xyz/switchboard-api";
import * as fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";

let argv = yargs(process.argv).options({
  'payerFile': {
    type: 'string',
    describe: "Keypair file to pay for transactions.",
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

async function main() {
  let cluster = 'devnet';
  let connection = new Connection(clusterApiUrl(toCluster(cluster), true), 'processed');
  let payerKeypair = JSON.parse(fs.readFileSync(resolve(argv.payerFile), 'utf-8'));
  let payerAccount = new Account(payerKeypair);
  console.log("Creating aggregator...");
  let dataFeedAccount = await createDataFeed(connection, payerAccount, SWITCHBOARD_DEVNET_PID);
  console.log("Adding job to aggregator...");
  await addFeedJob(connection, payerAccount, dataFeedAccount, [
    OracleJob.Task.create({
      httpTask: OracleJob.HttpTask.create({
        url: `https://www.binance.us/api/v3/ticker/price?symbol=BTCUSD`
      }),
    }),
    OracleJob.Task.create({
      jsonParseTask: OracleJob.JsonParseTask.create({ path: "$.price" }),
    }),
  ]);

  console.log(`FEED_PUBKEY=${dataFeedAccount.publicKey}`);
  console.log("Creating fulfillment manager...");
  let fulfillmentManagerAccount = await createFulfillmentManager(connection, payerAccount, SWITCHBOARD_DEVNET_PID);
  await setFulfillmentManagerConfigs(connection, payerAccount, fulfillmentManagerAccount, {
    "heartbeatAuthRequired": true,
    "usageAuthRequired": true,
    "lock": false
  });
  console.log(`FULFILLMENT_MANAGER_KEY=${fulfillmentManagerAccount.publicKey}`);
  console.log("Configuring aggregator...");
  await setDataFeedConfigs(connection, payerAccount, dataFeedAccount, {
    "minConfirmations": 1,
    "minUpdateDelaySeconds": 5,
    "fulfillmentManagerPubkey": fulfillmentManagerAccount.publicKey.toBuffer(),
    "lock": false
  });
  console.log(`Creating authorization account to permit account `
              + `${payerAccount.publicKey} to join fulfillment manager ` +
                `${fulfillmentManagerAccount.publicKey}`);
  let authAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    payerAccount.publicKey, {
      "authorizeHeartbeat": true,
      "authorizeUsage": false
    });
  console.log(`AUTH_KEY=${authAccount.publicKey}`);
  console.log(`Creating authorization account for the data feed. This will be ` +
              `used in part 2b.`);
  let updateAuthAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    dataFeedAccount.publicKey, {
      "authorizeHeartbeat": false,
      "authorizeUsage": true
    });
  console.log(`UPDATE_AUTH_KEY=${updateAuthAccount.publicKey}`);
}

main().then(
  () => process.exit(),
  err => {
    console.error("Failed to complete action.");
    console.error(err);
    process.exit(-1);
  },
);
