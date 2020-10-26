#!/bin/bash
set -ex

cd eth

(
  sleep 1
  yarn run deploy:dev
) &

# start up local blockchain with hardhat
npx hardhat node
