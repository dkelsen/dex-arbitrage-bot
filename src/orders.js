import fetch from 'node-fetch'
import { ASSET_ADDRESSES } from './utils'

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