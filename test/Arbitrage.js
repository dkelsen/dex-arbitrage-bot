const Arbitrage = artifacts.require('Arbitrage')
const { toWei } = require('./utils')

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
    let contractBalance

    it('Should allow deposits', async () => {
      await arbitrage.send(toWei('5'))
      contractBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(contractBalance, toWei('5'))
    })

    it('Should not allow other users to withdraw Ether', async () => {
      try {
        await arbitrage.withdrawEther(toWei('5'), { from: accounts[1] })
      } catch (error) {
        assert.include(error.message, "Wait a minute... You're not the owner of this contract!")
        return
      }
      assert(false)
    })

    it('Should allow the contract owner to withdraw Ether', async () => {
      await arbitrage.withdrawEther(toWei('5'))
      contractBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(contractBalance, toWei('0'))
    })
  })


})