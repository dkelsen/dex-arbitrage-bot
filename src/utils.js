import moment from 'moment-timezone'

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
