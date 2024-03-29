import 'dotenv/config'
import fetch from 'node-fetch'
import Web3 from 'web3'
import { InfuraProvider } from '@ethersproject/providers'
import { getNetwork } from '@ethersproject/networks'
import {
  ChainId,
  Token,
  Fetcher,
  Trade,
  Route,
  TokenAmount,
  TradeType
} from '@uniswap/sdk'

import {
  ASSET_ADDRESSES,
  EXCHANGE_ADDRESSES,
  getZeroExOrderTuple,
  getTokenDecimals
} from './utils'
import ONE_SPLIT_ABI from './abis/oneSplit.json'
import ZRX_EXCHANGE_ABI from './abis/zrx.json'

/* Setup For Web3 */
const web3 = new Web3(process.env.RPC_URL)

/* ZeroEx Functions */
export const checkZrxOrderBook = async (
  baseAssetSymbol /* What I Want To Sell */,
  quoteAssetSymbol /* What I Want To Buy */
) => {
  /* Worth Of Base Asset In Quote Asset:
   * Example: DAI/WETH - How much is 1 DAI worth in ETH?
   */
  const baseAssetAddress = ASSET_ADDRESSES[baseAssetSymbol].substring(2, 42).toLowerCase()
  const quoteAssetAddress = ASSET_ADDRESSES[quoteAssetSymbol].substring(2, 42).toLowerCase()

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

const checkedZrxOrders = []
const zrxExchangeContract = new web3.eth.Contract(ZRX_EXCHANGE_ABI, EXCHANGE_ADDRESSES.ZRX)
export const isIrrelevantZeroExOrder = async (zrxOrder) => {
  const orderId = JSON.stringify(zrxOrder)

  if (checkedZrxOrders.includes(orderId)) return true
  checkedZrxOrders.push(orderId)

  if (
    zrxOrder.makerFee.toString() !== '0' ||
    zrxOrder.takerFee.toString() !== '0'
  ) return true

  const orderTuple = getZeroExOrderTuple(zrxOrder)
  const orderInfo = await zrxExchangeContract.methods.getOrderInfo(orderTuple).call()
  if (orderInfo.orderTakerAssetFilledAmount.toString() !== '0') return true

  return false
}

/* OneSplit Functions */
const ONE_SPLIT_PARTS = 10
const ONE_SPLIT_FLAGS = 0
const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, EXCHANGE_ADDRESSES.ONE_SPLIT)
export const fetchOneSplitData = async ({ fromToken, toToken, amount }) => {
  try {
    const data = await oneSplitContract.methods.getExpectedReturn(fromToken, toToken, amount, ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
    return data
  } catch (error) {
    console.log(error)
  }
}

/* Uniswap Functions */
const chainId = ChainId.MAINNET
const network = new InfuraProvider(null, process.env.INFURA_PROJECT_ID)
export const getUniswapExecutionPrice = async (baseToken, quoteToken, tradeAmount) => {
  try {
    const base = new Token(chainId, ASSET_ADDRESSES[baseToken], getTokenDecimals(baseToken))
    const quote = new Token(chainId, ASSET_ADDRESSES[quoteToken], getTokenDecimals(baseToken))
    const pair = await Fetcher.fetchPairData(quote, base, network)
    const route = await new Route([pair], base)
    const trade = new Trade(route, new TokenAmount(base, tradeAmount), TradeType.EXACT_INPUT)

    return trade
  } catch (error) {
    console.log(error)
  }
}