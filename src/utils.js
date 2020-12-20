import moment from 'moment-timezone'

export const now = () => (moment().tz('Europe/Luxembourg').format())

export const logArbitrageCheck = ({
  isProfitable,
  assetOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  const displayTokens = (amount, symbol) => {
    switch (symbol) {
      default: /* 18 decimals */
        return web3.utils.fromWei(amount.toString(), 'Ether')
    }
  }

  console.table([{
    'Profitable?': isProfitable,
    'Asset Order': assetOrder.join(', '),
    'Exchange Order': 'ZRX, 1Split',
    'Input': displayTokens(inputAssetAmount, assetOrder[0]).padEnd(24, ' '),
    'Output': displayTokens(outputAssetAmount, assetOrder[0]).padEnd(24, ' '),
    'Profit': displayTokens(netProfit.toString(), assetOrder[0]).padEnd(24, ' '),
    'Timestamp': now(),
  }])
}