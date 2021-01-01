import moment from 'moment-timezone'

export const ASSET_ADDRESSES = {
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  SAI: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  CEL: '0xaaaebe6fe48e54f431b0c390cfaf0b017d09d42d',
  WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  SWAP: '0xcc4304a31d09258b0029ea7fe63d032f52e44efe',
  MAHA: '0xb4d930279552397bba2ee473229f89ec245bc365',
  '1INCH': '0x111111111117dc0aa78b770fa6a738034120c302',
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  SUSHI: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
  UNI: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  YFI: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
  SNX: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f'
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
    case 'CEL': /* 4 decimals */
      return (new web3.utils.BN(amount.toString())).div(new web3.utils.BN(1e4))
    case 'USDC': /* 6 decimals */
      return web3.utils.fromWei(amount.toString(), 'picoether')
    case 'USDT': /* 6 decimals */
      return web3.utils.fromWei(amount.toString(), 'picoether')
    case 'WBTC': /* 8 decimals */
      return (new web3.utils.BN(amount.toString())).div(new web3.utils.BN(1e8))
    default: /* 18 decimals */
      return web3.utils.fromWei(amount.toString(), 'Ether')
  }
}

export const logArbitrageCheck = ({
  isProfitable,
  arbitrageOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  console.table([{
    'Profitable?': isProfitable,
    'Arbitrage Order': arbitrageOrder.join(', ').padEnd(17, ' '),
    'Exchange Order': 'ZRX, 1Split',
    'Input': displayTokens(inputAssetAmount, arbitrageOrder[0], web3).padEnd(24, ' '),
    'Output': displayTokens(outputAssetAmount, arbitrageOrder[0], web3).padEnd(24, ' '),
    'Profit': displayTokens(netProfit.toString(), arbitrageOrder[0], web3).padEnd(24, ' '),
    'Timestamp': now(),
  }])
}

export const getZeroExOrderTuple = (zeroExOrder) => {
  return [
    zeroExOrder.makerAddress,
    zeroExOrder.takerAddress,
    zeroExOrder.feeRecipientAddress,
    zeroExOrder.senderAddress,
    zeroExOrder.makerAssetAmount,
    zeroExOrder.takerAssetAmount,
    zeroExOrder.makerFee,
    zeroExOrder.takerFee,
    zeroExOrder.expirationTimeSeconds,
    zeroExOrder.salt,
    zeroExOrder.makerAssetData,
    zeroExOrder.takerAssetData,
    zeroExOrder.makerFeeAssetData,
    zeroExOrder.takerFeeAssetData
  ]
}

export const calculateSlippage = (orderAmount) => {
  return (new web3.utils.BN(orderAmount)).mul(new web3.utils.BN('995')).div(new web3.utils.BN('1000')).toString()
}