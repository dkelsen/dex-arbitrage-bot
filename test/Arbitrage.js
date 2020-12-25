const Arbitrage = artifacts.require('Arbitrage')
const ONE_SPLIT_ABI = require('../src/abis/oneSplit.json')

const {
  toWei,
  toEther,
  checkZrxOrderBook,
  wethAddress,
  daiAddress,
  oneSplitExchange
} = require('./utils')

contract('Arbitrage', async (accounts) => {
  let arbitrage
  let contractAddress
  let etherBalance /* 100 Wei Available On Deployment */
  let wethBalance
  let daiBalance

  describe('Deposits and withdrawals', async () => {
    before(async () => {
      arbitrage = await Arbitrage.deployed()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should allow regular Ether deposits', async () => {
      await arbitrage.send(toWei('100'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance, toWei('200'))
    })

    it('Should convert Ether to Weth', async () => {
      await arbitrage.convertEtherToWeth({ value: toWei('500') })
      wethBalance = await arbitrage.getTokenBalance(wethAddress)
      assert.equal(wethBalance, toWei('500'))
    })

    it('Should convert Weth to Ether', async () => {
      await arbitrage.convertWethToEther(toWei('300'))
      wethBalance = await arbitrage.getTokenBalance(wethAddress)
      assert.equal(wethBalance, toWei('200'))
    })

    it('Should not allow other users to withdraw Ether', async () => {
      try {
        await arbitrage.withdrawEther(toWei('200'), { from: accounts[1] })
      } catch (error) {
        assert.include(error.message, 'Wait a minute... You\'re not the owner of this contract!')
        return
      }
      assert(false)
    })

    it('Should allow the contract owner to withdraw Ether', async () => {
      await arbitrage.withdrawEther(toWei('500'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance, toWei('0'))
    })

    it('Should allow the contract owner to withdraw Weth', async () => {
      await arbitrage.withdrawToken(wethAddress, toWei('200'))
      wethBalance = await arbitrage.getTokenBalance(wethAddress)
      assert.equal(wethBalance, toWei('0'))
    })
  })

  describe('Flashloan', async () => {
    before(async () => {
      arbitrage = await Arbitrage.new()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should fail as expected', async () => {
      try {
        await arbitrage.initiateFlashLoan(wethAddress, toEther('5000'))
      } catch (error) {
        assert.include(error.message, 'Not enough funds to repay the flash loan!')
        return
      }
      assert(false)
    })

    it('Should execute properly', async () => {
      try {
        await arbitrage.convertEtherToWeth({ value: toWei('50') })
        await arbitrage.initiateFlashLoan(wethAddress, toEther('5000'))
        const wethBalance = await arbitrage.getTokenBalance(wethAddress)
        assert.equal(wethBalance, toWei('48'))
      } catch (error) {
        assert(false)
      }
    })
  })

  describe('ZeroX Exchange', async () => {
    before(async () => {
      arbitrage = await Arbitrage.new()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should trade Weth for Dai', async () => {
      const { order } = await checkZrxOrderBook(wethAddress, daiAddress)
      await arbitrage.convertEtherToWeth({ value: toWei(order.takerAssetAmount) })
      const orderTuple = [
        order.makerAddress,
        order.takerAddress,
        order.feeRecipientAddress,
        order.senderAddress,
        order.makerAssetAmount,
        order.takerAssetAmount,
        order.makerFee,
        order.takerFee,
        order.expirationTimeSeconds,
        order.salt,
        order.makerAssetData,
        order.takerAssetData,
        order.makerFeeAssetData,
        order.takerFeeAssetData
      ]
      await arbitrage.swapOnZeroEx(
        orderTuple,
        order.takerAssetAmount,
        order.signature,
        wethAddress,
        order.takerAssetAmount,
        { value: toWei(order.takerAssetAmount) }
      )
      daiBalance = await arbitrage.getTokenBalance(daiAddress)
      assert.equal(daiBalance.toString(), order.makerAssetAmount)
    })
  })

  describe('OneSplit Exchange', async () => {
    before(async () => {
      arbitrage = await Arbitrage.new()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, oneSplitExchange)
    const ONE_SPLIT_PARTS = 10
    const ONE_SPLIT_FLAGS = 0

    it('Should trade Weth for Dai', async () => {
      await arbitrage.convertEtherToWeth({ value: toWei('100') })
      const data = await oneSplitContract.methods.getExpectedReturn(wethAddress, daiAddress, toWei('100'), ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
      await arbitrage.swapOnOneSplit(wethAddress, daiAddress, toWei('100'), data.returnAmount, data.distribution)
      daiBalance = await arbitrage.getTokenBalance(daiAddress)
      assert.equal(daiBalance.toString(), data.returnAmount)
    })
  })
})