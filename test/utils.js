const fetch = require('node-fetch')

module.exports = {
  toWei: function (amount) {
    return web3.utils.toWei(amount, 'wei')
  },
  toEther: function (amount) {
    return web3.utils.toWei(amount, 'ether')
  },
  wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  saiAddress: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  daiAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  oneSplitExchange: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E',
  checkZrxOrderBook: async function (baseAssetAddress /* What I Want To Sell */, quoteAssetAddress /* What I Want To Buy */) {
    baseAssetAddress = baseAssetAddress.substring(2, 42)
    quoteAssetAddress = quoteAssetAddress.substring(2, 42)
    const queryUrl = `
    https://api.0x.org/sra/v3/orderbook?\
baseAssetData=0xf47261b0000000000000000000000000${baseAssetAddress}&\
quoteAssetData=0xf47261b0000000000000000000000000${quoteAssetAddress}&\
perPage=1000
  `
    const zrxResponse = await fetch(queryUrl)
    const zrxData = await zrxResponse.json()
    return zrxData.bids.records[0] /* Trade First Bid */
  }
}
