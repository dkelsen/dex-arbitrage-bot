module.exports = {
  toWei: function (amount) {
    return web3.utils.toWei(amount, 'wei')
  },
  toEther: function (amount) {
    return web3.utils.toWei(amount, 'ether')
  },
  wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  saiAddress: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  daiAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  oneSplitExchange: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E'
}
