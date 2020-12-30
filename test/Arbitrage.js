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
  getZeroExOrderTuple,
  calculateSlippage
} = require('../src/utils')

contract('Arbitrage', async (accounts) => {
  let arbitrage
  let contractAddress
  let etherBalance
  let wethBalance
  let daiBalance

  const daiContract = new web3.eth.Contract(DAI_TOKEN_ABI, ASSET_ADDRESSES.DAI);
  const unlockedDaiAddress = '0x7AD1243179857B04763ECbCCe1F92C8572d46255'
  const unlockedEtherAddress = '0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e'

  describe('Deposits and withdrawals', async () => {
    before(async () => {
      arbitrage = await Arbitrage.deployed()
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should allow regular Ether deposits', async () => {
      await arbitrage.send(toWei('100'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance, toWei('100'))
    })

    it('Should allow ERC20 token desposits', async () => {
      await daiContract.methods.transfer(contractAddress, toWei('700')).send({ from: unlockedDaiAddress })
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.equal(daiBalance, toWei('700'))
    })

    it('Should convert Ether to Weth', async () => {
      await arbitrage.convertEtherToWeth({ value: toWei('500') })
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
      assert.equal(wethBalance, toWei('600'))
    })

    it('Should convert Weth to Ether', async () => {
      await arbitrage.convertWethToEther(toWei('300'))
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
      assert.equal(wethBalance, toWei('300'))
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
      await arbitrage.withdrawEther(toWei('400'))
      etherBalance = await web3.eth.getBalance(contractAddress)
      assert.equal(etherBalance.toString(), toWei('0'))
    })

    it('Should allow the contract owner to withdraw Weth', async () => {
      await arbitrage.withdrawToken(ASSET_ADDRESSES.WETH, toWei('300'))
      wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
      assert.equal(wethBalance, toWei('0'))
    })
  })

  describe('ZeroX Exchange', async () => {
    before(async () => {
      /* Cover ZeroEx WETH Fees */
      arbitrage = await Arbitrage.new({ value: toEther('0.01') })
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should trade Weth for Dai', async () => {
      const allOrders = await checkZrxOrderBook('WETH', 'DAI')
      /* Select A Different Order From Previous Test */
      const { order } = allOrders[4]
      /* Cover Swap Amount */
      await arbitrage.convertEtherToWeth({ value: toWei(order.takerAssetAmount) })
      const orderTuple = getZeroExOrderTuple(order)
      await arbitrage.swapOnZeroEx(
        orderTuple,
        order.takerAssetAmount,
        order.signature,
        ASSET_ADDRESSES.WETH,
        order.takerAssetAmount
      )
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.equal(daiBalance.toString(), order.makerAssetAmount)
    })
  })

  describe('OneSplit Exchange', async () => {
    before(async () => {
      arbitrage = await Arbitrage.new({ value: toWei('100') })
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0
    })

    it('Should trade Weth for Dai', async () => {
      await arbitrage.convertEtherToWeth({ value: toEther('1') })
      const data = await fetchOneSplitData({
        fromToken: ASSET_ADDRESSES.WETH,
        toToken: ASSET_ADDRESSES.DAI,
        amount: toEther('1')
      })

      /* Take 1% Slippage Into Account */
      const minReturnWtihSplippage = (new web3.utils.BN(data.returnAmount)).mul(new web3.utils.BN('990')).div(new web3.utils.BN('1000')).toString()
      await arbitrage.swapOnOneSplit(ASSET_ADDRESSES.WETH, ASSET_ADDRESSES.DAI, toEther('1'), minReturnWtihSplippage, data.distribution)
      daiBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.DAI)
      assert.isAtLeast(parseInt(daiBalance), parseInt(minReturnWtihSplippage))
    })
  })

  describe('Flashloan', async () => {
    const assetOrder = ['WETH', 'DAI', 'WETH']
    let allOrders
    let zeroExOrder
    let zeroExOrderTuple
    let oneSplitData

    before(async () => {
      /* Cover ZeroEx WETH Fees */
      arbitrage = await Arbitrage.new({ value: toEther('0.01') })
      contractAddress = arbitrage.address
      etherBalance = wethBalance = daiBalance = 0

      /* Preparations To Call Flash Loan */
      allOrders = await checkZrxOrderBook('WETH', 'DAI')
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
          toEther('10000'),
          oneSplitData.returnAmount,
          oneSplitData.distribution,
          zeroExOrderTuple,
          zeroExOrder.takerAssetAmount,
          zeroExOrder.signature
        )
      } catch (error) {
        assert.include(error.message, 'Contract did not receive the flash loan.')
        return
      }
      assert(false)
    })

    it('Should execute properly', async () => {
      try {
        /* Cover Flash Loan Deficit */
        await arbitrage.convertEtherToWeth({ from: unlockedEtherAddress, value: toEther('10000') })
        /* Take 1% Slippage Into Account On OneSplit */
        const minReturnWtihSplippage = calculateSlippage(zeroExOrder.returnAmount)
        const startWethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
        await arbitrage.initiateFlashLoan(
          ASSET_ADDRESSES.WETH,
          ASSET_ADDRESSES.DAI,
          toEther('10000'),
          minReturnWtihSplippage,
          oneSplitData.distribution,
          zeroExOrderTuple,
          zeroExOrder.takerAssetAmount,
          zeroExOrder.signature
        )
        wethBalance = await arbitrage.getTokenBalance(ASSET_ADDRESSES.WETH)
        assert.notEqual(wethBalance.toString(), startWethBalance.toString())
      } catch (error) {
        console.log(error)
        assert(false)
      }
    })
  })
})