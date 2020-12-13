module.exports = {
  toWei: function (amount) {
    return web3.utils.toWei(amount, 'wei')
  }
}
