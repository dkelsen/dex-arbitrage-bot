import 'dotenv/config'
import express from 'express'
import fetch from 'node-fetch'
import Web3 from 'web3'

import ZRX_EXCHANGE_ABI from './abis/zrx.json'
import ONE_SPLIT_ABI from './abis/oneSplit.json'
import { now, logArbitrageCheck } from './utils'

/* Application Setup */
const app = express();
const PORT = process.env.PORT

const ASSET_ADDRESSES = {
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
}
const EXCHANGE_ADDRESSES = {
  ZRX: '0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef',
  ONE_SPLIT: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E'
}

const web3 = new Web3(process.env.RPC_URL)
web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)
const zrxExchangeContract = new web3.eth.Contract(ZRX_EXCHANGE_ABI, EXCHANGE_ADDRESSES.ZRX)
const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, EXCHANGE_ADDRESSES.ONE_SPLIT);

app.listen(PORT, () =>
  console.log(`NodeJS app listening on port ${PORT}!`),
);

/* Function Definitions */
const checkZrxOrderBook = async (baseAssetSymbol, quoteAssetSymbol) => {
  /* Worth Of Base Asset In Quote Asset:
   * Example: DAI/WETH - How much is 1 DAI worth in ETH?
   */
  const baseAssetAddress = ASSET_ADDRESSES[baseAssetSymbol].substring(2, 42)
  const quoteAssetAddress = ASSET_ADDRESSES[quoteAssetSymbol].substring(2, 42)

  const queryUrl = `
    https://api.0x.org/sra/v3/orderbook?\
baseAssetData=0xf47261b0000000000000000000000000${baseAssetAddress}&\
quoteAssetData=0xf47261b0000000000000000000000000${quoteAssetAddress}&\
perPage=1000
  `

  const zrxResponse = await fetch(queryUrl)
  const zrxData = await zrxResponse.json()
  /* Bid: Highest price someone will pay
   * Ask: Lowest price someone will sell
   */
  return zrxData.bids.records
}

const ONE_SPLIT_PARTS = 10
const ONE_SPLIT_FLAGS = 0
const fetchOneSplitData = async ({ fromToken, toToken, amount }) => {
  const data = await oneSplitContract.methods.getExpectedReturn(fromToken, toToken, amount, ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
  return data
}

const checkedZrxOrders = []
const checkArbitrage = async ({ bidOrder: { order: zrxOrder }, assetOrder }) => {
  const orderId = JSON.stringify(zrxOrder)

  /* Skip these orders */
  if (checkedZrxOrders.includes(orderId)) return false
  checkedZrxOrders.push(orderId)

  if (
    zrxOrder.makerFee.toString() !== '0' ||
    zrxOrder.takerFee.toString() !== '0'
  ) return false

  const orderTuple = [
    zrxOrder.makerAddress,
    zrxOrder.takerAddress,
    zrxOrder.feeRecipientAddress,
    zrxOrder.senderAddress,
    zrxOrder.makerAssetAmount,
    zrxOrder.takerAssetAmount,
    zrxOrder.makerFee,
    zrxOrder.takerFee,
    zrxOrder.expirationTimeSeconds,
    zrxOrder.salt,
    zrxOrder.makerAssetData,
    zrxOrder.takerAssetData,
    zrxOrder.makerFeeAssetData,
    zrxOrder.takerFeeAssetData
  ]

  const orderInfo = await zrxExchangeContract.methods.getOrderInfo(orderTuple).call()
  if (orderInfo.orderTakerAssetFilledAmount.toString() !== '0') return false

  const oneSplitData = await fetchOneSplitData({
    fromToken: ASSET_ADDRESSES[assetOrder[1]],
    toToken: ASSET_ADDRESSES[assetOrder[2]],
    amount: zrxOrder.makerAssetAmount,
  })

  /* Asset Amount At Start And End Of Potential Trade */
  const inputAssetAmount = new web3.utils.BN(zrxOrder.takerAssetAmount)
  const outputAssetAmount = new web3.utils.BN(oneSplitData.returnAmount)
  let estimatedGasFee = new web3.utils.BN(0)

  const netProfit = outputAssetAmount.sub(inputAssetAmount).sub(estimatedGasFee)
  const isProfitable = netProfit.gt(new web3.utils.BN(0))

  logArbitrageCheck({
    isProfitable,
    assetOrder,
    inputAssetAmount,
    outputAssetAmount,
    netProfit,
    web3
  })
  
  return isProfitable
}

let checkingMarkets = false
const checkMarkets = async () => {
  if (checkingMarkets) return
  console.log(`Fetching market data @ ${now()} ...\n`)
  checkingMarkets = true

  try {
    const assetOrder = ['DAI', 'WETH', 'DAI']
    let bids = await checkZrxOrderBook('DAI', 'WETH')
    bids.map(async (bidOrder) => {
      const isArbitrage = await checkArbitrage({ bidOrder, assetOrder })
      if (isArbitrage) console.log("Arbitrage Found!")
    })
  } catch (error) {
    console.error(error)
    checkingMarkets = false
    return
  }

  checkingMarkets = false
}

/* Run Application */
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000
const marketChecker = setInterval(async () => await checkMarkets(), POLLING_INTERVAL)
