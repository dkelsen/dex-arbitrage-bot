const Arbitrage = artifacts.require('Arbitrage')
const { toWei, wethAddress } = require('./utils')

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
      await arbitrage.depositWeth({ value: toWei('500') })
      wethBalance = await arbitrage.getWethBalance()
      assert.equal(wethBalance, toWei('500'))
    })

    it('Should convert Weth to Ether', async () => {
      await arbitrage.withdrawWeth(toWei('500'))
      wethBalance = await arbitrage.getWethBalance()
      assert.equal(wethBalance, toWei('0'))
    })

    it('Should not allow other users to withdraw Ether', async () => {
      try {
        await arbitrage.withdrawEther(toWei('505'), { from: accounts[1] })
      } catch (error) {
        assert.include(error.message, "Wait a minute... You're not the owner of this contract!")
        return
      }
      assert(false)
    })

    it('Should allow the contract owner to withdraw Ether', async () => {
      await arbitrage.withdrawEther(toWei('505'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance, toWei('0'))
    })
  })

  describe('Flashloan', async () => {
    it('Should execute properly', async () => {
      try {
        await arbitrage.depositWeth({ value: toWei('50') })
        await arbitrage.initiateFlashLoan(wethAddress, web3.utils.toWei('5000', 'ether'))
        const wethBalance = await arbitrage.getWethBalance()
        assert.equal(wethBalance, toWei('48'))
      } catch (error) {
        console.log(error)
        assert(false)
      }
    })
  })
})