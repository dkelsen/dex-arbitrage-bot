## Setup
```
$ npm install
$ npm start
```

## Mainnet Fork
```
$ npm install -g ganache-cli
$ ganache-cli -f <Infura Endpoint Link> -u <Ethereum Address>
```
* Infura Endpoint Link: Access to mainnet blockchain through an Ethereum node. Should look similiar to this example:
https://mainnet.infura.io/v3/8d10330382da446c76d5d7b37123d802
* Ethereum Address: Foreign account to be unlocked in the fork, i.e. get unrestricted access to its funds.

Last used mainnet fork mnemonic: `fancy slow uncover journey heart bright twenty dentist damage never eye pumpkin`

### Ganache Related Bug
In some cases, transactions on the forked blockchain may fail to execute. This bug is most likely caused by an underlying issue in Ganache. It's recommended to start fresh and create a new fork.

## Debugging
```
$ truffle console --network <Name>
```
* Name: name of the network as specified in `truffle-config.js`. By default, the Truffle console will access the `development` network.

Details on how to interact with a contract through the console can by found in the [Truffle documentation](https://www.trufflesuite.com/docs/truffle/reference/contract-abstractions#contract-abstractions).

## Testing
```
npm test <Network Name>
```
By default, Truffle will run tests on the network `development`. A full list of available networks can be found in `truffle-config.js`.