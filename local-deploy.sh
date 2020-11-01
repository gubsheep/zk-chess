#!/bin/bash
set -ex

cd eth

(
  sleep 1
  truffle migrate
) &

# start up local blockchain with hardhat
npx hardhat node
