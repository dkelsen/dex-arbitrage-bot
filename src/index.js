import 'dotenv/config'
import express from 'express'
import Web3 from 'web3'

import { now, logArbitrageCheck } from './utils'
import { sendNotificationEmail } from './email'
import {
  checkZrxOrderBook,
  fetchOneSplitData,
  isIrrelevantZeroExOrder,
  getUniswapExecutionPrice
} from './orders'
import { ASSET_ADDRESSES } from './utils'

/* Application Setup */
const app = express()
const PORT = process.env.PORT

const web3 = new Web3(process.env.RPC_URL)
web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

app.listen(PORT, () =>
  console.log(`NodeJS app listening on port ${PORT}!`),
)

/* Function Definitions */
const checkOnZeroEx = async ({ arbitrageOrder, exchangeOrder }) => {
  let bids = await checkZrxOrderBook(arbitrageOrder[0], arbitrageOrder[1])
  bids.map(async (bidOrder) => {
    const zrxOrder = bidOrder.order
    if (await isIrrelevantZeroExOrder(zrxOrder)) return

    const exchangeFees = (new web3.utils.BN(web3.utils.toWei(process.env.GAS_PRICE.toString(), 'Gwei'))).mul(new web3.utils.BN('70000'))
    const isArbitrage = await checkArbitrage({
      makerAssetAmount: zrxOrder.makerAssetAmount,
      takerAssetAmount: zrxOrder.takerAssetAmount,
      arbitrageOrder,
      exchangeOrder,
      exchangeFees
    })

    if (isArbitrage) console.log("Arbitrage Found!")
  })
}

const checkOnUniswap = async ({ arbitrageOrder, exchangeOrder }) => {
  const { inputAmount, outputAmount } = await getUniswapExecutionPrice(
    arbitrageOrder[0],
    arbitrageOrder[1],
    web3.utils.toWei('100', 'Ether')
  )

  const exchangeFees = (new web3.utils.BN(String(inputAmount.numerator))).mul(new web3.utils.BN('3')).div(new web3.utils.BN('1000'))
  const isArbitrage = await checkArbitrage({
    makerAssetAmount: String(outputAmount.numerator),
    takerAssetAmount: String(inputAmount.numerator),
    arbitrageOrder,
    exchangeOrder,
    exchangeFees
  })

  if (isArbitrage) console.log("Arbitrage Found!")
}

const checkArbitrage = async ({ 
  makerAssetAmount,
  takerAssetAmount,
  arbitrageOrder,
  exchangeOrder,
  exchangeFees = new web3.utils.BN(0) 
}) => {

  const oneSplitData = await fetchOneSplitData({
    fromToken: ASSET_ADDRESSES[arbitrageOrder[1]],
    toToken: ASSET_ADDRESSES[arbitrageOrder[2]],
    amount: makerAssetAmount,
  })

  /* Asset Amount At Start And End Of Potential Trade */
  const inputAssetAmount = new web3.utils.BN(takerAssetAmount)
  const outputAssetAmount = new web3.utils.BN(oneSplitData.returnAmount)
  const gasPrice = new web3.utils.BN(web3.utils.toWei(process.env.GAS_PRICE.toString(), 'Gwei'))
  const estimatedGas = new web3.utils.BN(process.env.ESTIMATED_GAS)
  let estimatedGasFee = (gasPrice).mul(estimatedGas) /* NEEDS TO BE ADJUSTED WHEN NOT (W)ETH */

  const netProfit = outputAssetAmount.sub(inputAssetAmount).sub(estimatedGasFee).sub(exchangeFees)
  const isProfitable = netProfit.gt(new web3.utils.BN(0))

  const loggingInput = {
    isProfitable,
    arbitrageOrder,
    exchangeOrder,
    inputAssetAmount,
    outputAssetAmount,
    netProfit,
    web3
  }

  /* Logging And Reporting */
  logArbitrageCheck(loggingInput)
  if (isProfitable && process.env.NODE_ENV !== 'development') sendNotificationEmail(loggingInput)

  return isProfitable
}

const checkPairs = async ({ arbitrageOrder, exchangeOrder }) => {
  try {
    if (exchangeOrder[0] === 'ZeroEx') checkOnZeroEx({ arbitrageOrder, exchangeOrder })
    if (exchangeOrder[0] === 'Uniswap') checkOnUniswap({ arbitrageOrder, exchangeOrder })
  } catch (error) {
    console.error(error)
    checkingMarkets = false
    return
  }
}

let checkingMarkets = false
const checkMarkets = async () => {
  if (checkingMarkets) return
  console.log(`Fetching market data @ ${now()} ...\n`)
  checkingMarkets = true

  /* Limit To 4 Pairs On 3 Second Interval 
   * ZeroEx Blocks Too Frequent Requests
   */
  checkPairs({ arbitrageOrder: ['WETH', 'WBTC', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })
  checkPairs({ arbitrageOrder: ['WETH', 'CEL', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })
  checkPairs({ arbitrageOrder: ['WETH', 'LINK', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })
  checkPairs({ arbitrageOrder: ['WETH', 'YFI', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })
  checkPairs({ arbitrageOrder: ['WETH', 'DAI', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })
  checkPairs({ arbitrageOrder: ['WETH', 'USDC', 'WETH'], exchangeOrder: ['Uniswap', 'OneInch'] })

  checkingMarkets = false
}

/* Run Application */
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000
const marketChecker = setInterval(async () => await checkMarkets(), POLLING_INTERVAL)
