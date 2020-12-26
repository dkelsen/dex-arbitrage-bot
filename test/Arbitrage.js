const Arbitrage = artifacts.require('Arbitrage')
const ONE_SPLIT_ABI = require('../src/abis/oneSplit.json')
const DAI_TOKEN_ABI = require('../src/abis/daiToken.json')
const {
  checkZrxOrderBook,
  fetchOneSplitData
} = require('../src/orders')
const {
  ASSET_ADDRESSES,
  EXCHANGE_ADDRESSES,
  toWei,
  toEther,
  getZeroExOrderTuple
} = require('../src/utils')

contract('Arbitrage', async (accounts) => {
  let arbitrage
  let contractAddress
  let etherBalance /* 100 Wei Available On Deployment */
  let wethBalance
  let daiBalance

  const daiContract = new web3.eth.Contract(DAI_TOKEN_ABI, ASSET_ADDRESSES.DAI);
  const unlockedAddress = '0x7AD1243179857B04763ECbCCe1F92C8572d46255'

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

    it('Should allow ERC20 token desposits', async () => {
      await daiContract.methods.transfer(contractAddress, toWei('700')).send({ from: unlockedAddress })
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.equal(daiBalance, toWei('700'))
    })

    it('Should convert Ether to Weth', async () => {
      await arbitrage.convertEtherToWeth({ value: toWei('500') })
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
      assert.equal(wethBalance, toWei('500'))
    })

    it('Should convert Weth to Ether', async () => {
      await arbitrage.convertWethToEther(toWei('300'))
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
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
      await arbitrage.withdrawToken(ASSET_ADDRESSES.WETH, toWei('200'))
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
      assert.equal(wethBalance, toWei('0'))
    })
  })

  describe('Flashloan', async () => {
    const assetOrder = ['DAI', 'WETH', 'DAI']
    let allOrders
    let zeroExOrder
    let zeroExOrderTuple
    let oneSplitData

    before(async () => {
      arbitrage = await Arbitrage.new()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0

      /* Preparations To Call Flash Loan */
      allOrders = await checkZrxOrderBook('DAI', 'WETH')
      const { order } = allOrders[0]
      zeroExOrder = order
      zeroExOrderTuple = getZeroExOrderTuple(zeroExOrder)

      oneSplitData = await fetchOneSplitData({
        fromToken: ASSET_ADDRESSES[assetOrder[1]],
        toToken: ASSET_ADDRESSES[assetOrder[2]],
        amount: zeroExOrder.makerAssetAmount,
      })
    })

    it('Should fail as expected', async () => {
      try {
        await arbitrage.initiateFlashLoan(
          ASSET_ADDRESSES.DAI,
          ASSET_ADDRESSES.WETH,
          toEther('100000'),
          oneSplitData.returnAmount,
          oneSplitData.distribution,
          zeroExOrderTuple,
          zeroExOrder.takerAssetAmount,
          zeroExOrder.signature
        )
      } catch (error) {
        assert.include(error.message, 'Not enough funds to repay the flash loan!')
        return
      }
      assert(false)
    })

    it('Should execute properly', async () => {
      try {
        await daiContract.methods.transfer(contractAddress, toWei('100')).send({ from: unlockedAddress })
        await arbitrage.initiateFlashLoan(
          ASSET_ADDRESSES.DAI,
          ASSET_ADDRESSES.WETH,
          toEther('100000'),
          oneSplitData.returnAmount,
          oneSplitData.distribution,
          zeroExOrderTuple,
          zeroExOrder.takerAssetAmount,
          zeroExOrder.signature
        )
        const daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
        assert.equal(daiBalance, toWei('98'))
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
      const allOrders = await checkZrxOrderBook('WETH', 'DAI')
      const { order } = allOrders[0]
      await arbitrage.convertEtherToWeth({ value: toWei(order.takerAssetAmount) })
      const orderTuple = getZeroExOrderTuple(order)
      await arbitrage.swapOnZeroEx(
        orderTuple,
        order.takerAssetAmount,
        order.signature,
        ASSET_ADDRESSES.WETH,
        order.takerAssetAmount,
        { value: toWei(order.takerAssetAmount) }
      )
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.equal(daiBalance.toString(), order.makerAssetAmount)
    })
  })

  describe('OneSplit Exchange', async () => {
    before(async () => {
      arbitrage = await Arbitrage.new()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    const oneSplitContract = new web3.eth.Contract(ONE_SPLIT_ABI, EXCHANGE_ADDRESSES.ONE_SPLIT)
    const ONE_SPLIT_PARTS = 10
    const ONE_SPLIT_FLAGS = 0

    it('Should trade Weth for Dai', async () => {
      await arbitrage.convertEtherToWeth({ value: toWei('100') })
      const data = await oneSplitContract.methods.getExpectedReturn(ASSET_ADDRESSES.WETH, ASSET_ADDRESSES.DAI, toWei('100'), ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS).call()
      await arbitrage.swapOnOneSplit(ASSET_ADDRESSES.WETH, ASSET_ADDRESSES.DAI, toWei('100'), data.returnAmount, data.distribution)
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.equal(daiBalance.toString(), data.returnAmount)
    })
  })
})