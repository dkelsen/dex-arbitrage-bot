import 'dotenv/config'
import express from 'express'
import Web3 from 'web3'

import ZRX_EXCHANGE_ABI from './abis/zrx.json'
import { now, logArbitrageCheck } from './utils'
import { sendNotificationEmail } from './email'
import { checkZrxOrderBook, fetchOneSplitData } from './orders'
import { 
  ASSET_ADDRESSES,
  EXCHANGE_ADDRESSES,
  getZeroExOrderTuple
} from './utils'

/* Application Setup */
const app = express()
const PORT = process.env.PORT

const web3 = new Web3(process.env.RPC_URL)
web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)
const zrxExchangeContract = new web3.eth.Contract(ZRX_EXCHANGE_ABI, EXCHANGE_ADDRESSES.ZRX)

app.listen(PORT, () =>
  console.log(`NodeJS app listening on port ${PORT}!`),
)

/* Function Definitions */
const checkedZrxOrders = []
const checkArbitrage = async ({ bidOrder: { order: zrxOrder }, arbitrageOrder }) => {
  const orderId = JSON.stringify(zrxOrder)

  /* Skip These Orders */
  if (checkedZrxOrders.includes(orderId)) return false
  checkedZrxOrders.push(orderId)

  if (
    zrxOrder.makerFee.toString() !== '0' ||
    zrxOrder.takerFee.toString() !== '0'
  ) return false

  const orderTuple = getZeroExOrderTuple(zrxOrder)
  const orderInfo = await zrxExchangeContract.methods.getOrderInfo(orderTuple).call()
  if (orderInfo.orderTakerAssetFilledAmount.toString() !== '0') return false

  const oneSplitData = await fetchOneSplitData({
    fromToken: ASSET_ADDRESSES[arbitrageOrder[1]],
    toToken: ASSET_ADDRESSES[arbitrageOrder[2]],
    amount: zrxOrder.makerAssetAmount,
  })

  /* Asset Amount At Start And End Of Potential Trade */
  const inputAssetAmount = new web3.utils.BN(zrxOrder.takerAssetAmount)
  const outputAssetAmount = new web3.utils.BN(oneSplitData.returnAmount)
  const gasPrice = new web3.utils.BN(web3.utils.toWei(process.env.GAS_PRICE.toString(), 'Gwei'))
  const estimatedGas = new web3.utils.BN(process.env.ESTIMATED_GAS)
  let estimatedGasFee = (gasPrice).mul(estimatedGas) /* NEEDS TO BE ADJUSTED WHEN NOT (W)ETH */

  const netProfit = outputAssetAmount.sub(inputAssetAmount).sub(estimatedGasFee)
  const isProfitable = netProfit.gt(new web3.utils.BN(0))

  const loggingInput = {
    isProfitable,
    arbitrageOrder,
    inputAssetAmount,
    outputAssetAmount,
    netProfit,
    web3
  }

  /* Logging And Reporting */
  logArbitrageCheck(loggingInput)
  if (isProfitable) sendNotificationEmail(loggingInput)

  return isProfitable
}

const checkPairs = async ({ arbitrageOrder }) => {
  try {
    let bids = await checkZrxOrderBook(arbitrageOrder[0], arbitrageOrder[1])
    bids.map(async (bidOrder) => {
      const isArbitrage = await checkArbitrage({ bidOrder, arbitrageOrder })
      if (isArbitrage) console.log("Arbitrage Found!")
    })
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
  checkPairs({ arbitrageOrder: ['WETH', 'USDT', 'WETH']})
  checkPairs({ arbitrageOrder: ['WETH', 'DAI', 'WETH']})
  checkPairs({ arbitrageOrder: ['WETH', 'USDC', 'WETH']})
  checkPairs({ arbitrageOrder: ['WETH', 'SUSHI', 'WETH']})
  
  checkingMarkets = false
}

/* Run Application */
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000
const marketChecker = setInterval(async () => await checkMarkets(), POLLING_INTERVAL)
