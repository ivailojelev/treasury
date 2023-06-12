# Sample Hardhat Project

To view all of the available commands, run:

```shell
npx hardhat
```

# Installation

## To install the dependencies run:
```shell
npm install
```

# To verify the contract run:

## You need to change the value of the .env variables to your own values

```shell
npx hardhat deploy --network sepolia
```
## Get the contract address from the output and run:

```shell
npx hardhat verify --network sepolia ${deployedContractAddress}"
```

# To run the tests run:
## Reached 100% coverage

```shell
npx hardhat test
```

# To generate the coverage report run:

```shell
npx hardhat coverage
```
You can see the coverage report in the coverage folder

# Deployed and verified

## https://sepolia.etherscan.io/address/0x13a824a4a644c80dE51DD40fb91e55161517a2c1
