const Arbitrage = artifacts.require('Arbitrage')
const ONE_SPLIT_ABI = require('../src/abis/oneSplit.json')
const { 
  toWei,
  toEther,
  wethAddress,
  daiAddress,
  oneSplitExchange
} = require('./utils')

contract('Arbitrage', async (accounts) => {
  let arbitrage
  let contractAddress

  before(async () => {
    arbitrage = await Arbitrage.deployed()
    contractAddress = arbitrage.address
  })

  it('Should deploy', async () => {
    assert.notEqual(arbitrage.address, '')
  })

  describe('Deposits and withdrawals', async () => {
    let etherBalance
    let wethBalance

    it('Should allow regular Ether deposits', async () => {
      await arbitrage.send(toWei('5'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance, toWei('5'))
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
        await arbitrage.withdrawEther(toWei('205'), { from: accounts[1] })
      } catch (error) {
        assert.include(error.message, 'Wait a minute... You\'re not the owner of this contract!')
        return
      }
      assert(false)
    })

    it('Should allow the contract owner to withdraw Ether', async () => {
      await arbitrage.withdrawEther(toWei('305'))
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

  describe('OneSplit', async () => {
    const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, oneSplitExchange)
    const amount = toWei('48')
    const ONE_SPLIT_PARTS = 10
    const ONE_SPLIT_FLAGS = 0

    it('Should trade Weth for Dai', async () => {
      const data =  await oneSplitContract.methods.getExpectedReturn(wethAddress, daiAddress, amount, ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
      await arbitrage.swapOnOneSplit(wethAddress, daiAddress, amount, data.returnAmount, data.distribution)
      const daiBalance = await arbitrage.getTokenBalance(daiAddress)
      assert.equal(daiBalance, data.returnAmount)
    })
  })
})