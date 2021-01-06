import moment from 'moment-timezone'

export const ASSET_ADDRESSES = {
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  SAI: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  CEL: '0xaaAEBE6Fe48E54f431b0C390CfaF0b017d09D42d',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  SWAP: '0xCC4304A31d09258b0029eA7FE63d032f52e44EFe',
  MAHA: '0xB4d930279552397bbA2ee473229f89Ec245bc365',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  SUSHI: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  YFI: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
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
    case 'USDC':
    case 'USDT': /* 6 decimals */
      return web3.utils.fromWei(amount.toString(), 'picoether')
    case 'WBTC': /* 8 decimals */
      return (new web3.utils.BN(amount.toString())).div(new web3.utils.BN(1e8))
    default: /* 18 decimals */
      return web3.utils.fromWei(amount.toString(), 'Ether')
  }
}

export const getTokenDecimals = (tokenSymbol) => {
  switch (tokenSymbol) {
    case 'CEL':
      return 4
    case 'USDC':
    case 'USDT':
      return 6
    case 'WBTC':
      return 8
    default:
      return 18
  }
}

export const logArbitrageCheck = ({
  isProfitable,
  arbitrageOrder,
  exchangeOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  console.table([{
    'Profitable?': isProfitable,
    'Arbitrage Order': arbitrageOrder.join(', ').padEnd(17, ' '),
    'Exchange Order': exchangeOrder.join(', ').padEnd(16, ' '),
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

export const calculateSlippage = (orderAmount, web3) => {
  return (new web3.utils.BN(orderAmount)).mul(new web3.utils.BN('990')).div(new web3.utils.BN('1000'))
}