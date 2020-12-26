import moment from 'moment-timezone'

export const ASSET_ADDRESSES = {
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  SAI: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
}

export const EXCHANGE_ADDRESSES = {
  ZRX: '0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef',
  ONE_SPLIT: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E'
}

export const toWei = (amount) => {
  return web3.utils.toWei(amount, 'wei')
}

export const toEther = (amount) => {
  return web3.utils.toWei(amount, 'ether')
}

export const now = () => (moment().tz('Europe/Luxembourg').format())

export const displayTokens = (amount, symbol, web3) => {
  switch (symbol) {
    default: /* 18 decimals */
      return web3.utils.fromWei(amount.toString(), 'Ether')
  }
}

export const logArbitrageCheck = ({
  isProfitable,
  assetOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  console.table([{
    'Profitable?': isProfitable,
    'Asset Order': assetOrder.join(', '),
    'Exchange Order': 'ZRX, 1Split',
    'Input': displayTokens(inputAssetAmount, assetOrder[0], web3).padEnd(24, ' '),
    'Output': displayTokens(outputAssetAmount, assetOrder[0], web3).padEnd(24, ' '),
    'Profit': displayTokens(netProfit.toString(), assetOrder[0], web3).padEnd(24, ' '),
    'Timestamp': now(),
  }])
}
