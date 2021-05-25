Starter repo for all things Switchboard.

# Example 1: Calling a Data Feed

In this example, we will post an example Solana program that will parse and
print a provided data feed.

```
cd $(git rev-parse --show-toplevel)
cd example-program
cargo build-bpf --manifest-path=Cargo.toml --bpf-out-dir=$PWD
PROGRAM_PUBKEY=$(solana program deploy switchboard_example.so | tee /dev/tty | grep "Program Id:" | awk '{print $NF}')
cd ../ts-example
solana-keygen new --outfile example-keypair.json
solana airdrop 5 example-keypair.json
# Find Data Feed Pubkeys at https://switchboard.xyz/#/explorer
FEED_PUBKEY="<YOUR FEED PUBKEY HERE>"
ts-node main.ts --payerFile=example-keypair.json --programPubkey=${PROGRAM_PUBKEY?} --dataFeedPubkey=${FEED_PUBKEY?}
```
