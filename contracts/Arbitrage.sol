/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;
pragma abicoder v2;

import "./Shared.sol";
import "./FlashLoan.sol";
import "./OneSplit.sol";
import "./ZeroEx.sol";

contract Arbitrage is DyDxFlashLoan {
	IWETH WETH_CONTRACT = IWETH(WETH);

	/* OneSplit Configuration */
	address ONESPLIT_ADDRESS = 0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E;
	IOneSplit ONESPLIT_CONTRACT = IOneSplit(ONESPLIT_ADDRESS);
	uint256 PARTS = 10;
	uint256 FLAGS = 0;

	/* ZeroEx Configuration */
	address ZRX_EXCHANGE_ADDRESS = 0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef;
	address ZRX_ERC20_PROXY_ADDRESS = 0x95E6F48254609A6ee006F7D493c8e5fB97094ceF;
	address ZRX_STAKING_PROXY = 0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777; /* Fee Collector */

	constructor() payable {
		convertEtherToWeth();
		approveZeroExFee();
	}

	/* Deposits And Withdrawals */
	function withdrawEther(uint256 _amount) external onlyOwner {
		require(
			_amount <= address(this).balance,
			"Specified withdrawal amount exceeds the available funds."
		);
		msg.sender.transfer(_amount);
	}

	function withdrawToken(address _tokenAddress, uint256 _amount)
		external
		onlyOwner
	{
		require(
			_amount <= IERC20(_tokenAddress).balanceOf(address(this)),
			"Specified withdrawal amount exceeds the available funds."
		);
		IERC20(_tokenAddress).transfer(OWNER, _amount);
	}

	function convertWethToEther(uint256 _amount) external onlyOwner {
		WETH_CONTRACT.withdraw(_amount);
	}

	function convertEtherToWeth() public payable {
		WETH_CONTRACT.deposit{ value: msg.value }();
	}

	function getTokenBalance(address _tokenAddress)
		external
		view
		returns (uint256)
	{
		return IERC20(_tokenAddress).balanceOf(address(this));
	}

	receive() external payable {}

	/* ZeroEx Swap Trade */
	function swapOnZeroEx(
		Order memory order,
		uint256 takerAssetFillAmount,
		bytes memory signature,
		address _fromToken,
		uint256 _amount
	) public payable onlyDyDxAndOwner returns (uint256) {
		IERC20(_fromToken).approve(ZRX_ERC20_PROXY_ADDRESS, _amount);

		FillResults memory fillResults =
			ZeroEx(ZRX_EXCHANGE_ADDRESS).fillOrder{ value: msg.value }(
				order,
				takerAssetFillAmount,
				signature
			);

		/* Reset Approval */
		IERC20(_fromToken).approve(ZRX_ERC20_PROXY_ADDRESS, 0);
		return fillResults.makerAssetFilledAmount;
	}

	/* OneSplit Swap Trade */
	function swapOnOneSplit(
		address _fromToken,
		address _toToken,
		uint256 _amount,
		uint256 _minReturn,
		uint256[] memory _distribution
	) public onlyDyDxAndOwner {
		IERC20(_fromToken).approve(ONESPLIT_ADDRESS, _amount);

		ONESPLIT_CONTRACT.swap(
			IERC20(_fromToken),
			IERC20(_toToken),
			_amount,
			_minReturn,
			_distribution,
			FLAGS
		);

		/* Reset Approval */
		IERC20(_fromToken).approve(ONESPLIT_ADDRESS, 0);
	}

	function approveZeroExFee() private {
		WETH_CONTRACT.approve(ZRX_STAKING_PROXY, uint256(-1));
	}

  event LogArbitrage(string description, uint balance);

	/* Function Invoked By DyDx */
	function callFunction(
		address _sender,
		Account.Info memory _accountInfo,
		bytes memory _data
	) external override onlyDyDx {
		(
			uint256 loanAmount,
			address loanToken,
			address arbitrageToken,
			uint256 oneSplitMinReturn,
			uint256[] memory oneSplitDistribution,
			Order memory zeroExOrder,
			uint256 zeroExTakerAssetFillAmount,
			bytes memory zeroExSignature
		) =
			abi.decode(
				_data,
				(
					uint256,
					address,
					address,
					uint256,
					uint256[],
					Order,
					uint256,
					bytes
				)
			);

		require(
			IERC20(loanToken).balanceOf(address(this)) > loanAmount + 2,
			"Contract did not receive the flash loan."
		);

		uint256 makerAssetFilledAmount =
			swapOnZeroEx(
				zeroExOrder,
				zeroExTakerAssetFillAmount,
				zeroExSignature,
				loanToken,
				loanAmount
			);

    emit LogArbitrage("makerAssetFilledAmount", makerAssetFilledAmount);

		swapOnOneSplit(
			arbitrageToken,
			loanToken,
			makerAssetFilledAmount,
			oneSplitMinReturn,
			oneSplitDistribution
		);

		uint256 loanBalance = IERC20(loanToken).balanceOf(address(this));
		require(
			loanBalance >= loanAmount,
			"Insufficient funds to repay the flash loan."
		);
	}
}
