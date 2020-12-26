import 'dotenv/config'
import fetch from 'node-fetch'
import Web3 from 'web3'

import { ASSET_ADDRESSES, EXCHANGE_ADDRESSES } from './utils'
import ONE_SPLIT_ABI from './abis/oneSplit.json'

/* Setup For Web3 */
const web3 = new Web3(process.env.RPC_URL)

export const checkZrxOrderBook = async (
  baseAssetSymbol /* What I Want To Sell */,
  quoteAssetSymbol /* What I Want To Buy */
) => {
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
const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, EXCHANGE_ADDRESSES.ONE_SPLIT)
export const fetchOneSplitData = async ({ fromToken, toToken, amount }) => {
  const data = await oneSplitContract.methods.getExpectedReturn(fromToken, toToken, amount, ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
  return data
}