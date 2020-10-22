#!/bin/bash
set -ex

cd eth

(
  sleep 1
  yarn run deploy:dev
) &

# start up local blockchain with buidler
npx buidler node
