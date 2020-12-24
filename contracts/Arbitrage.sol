/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;
pragma abicoder v2;

import "./Shared.sol";
import "./FlashLoan.sol";
import "./OneSplit.sol";

contract Arbitrage is DyDxFlashLoan {
	IWETH WETH_CONTRACT = IWETH(WETH);

	/* OneSplit Configuration */
	address ONESPLIT_ADDRESS = 0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E;
	IOneSplit ONESPLIT_CONTRACT = IOneSplit(ONESPLIT_ADDRESS);
	uint256 PARTS = 10;
	uint256 FLAGS = 0;

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

	function convertEtherToWeth() external payable {
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

	/* OneSplit Swap Trade */
	function swapOnOneSplit(
		address _fromToken,
		address _toToken,
		uint256 _amount,
		uint256 _minReturn,
		uint256[] memory _distribution
	) external onlyOwner {
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

	/* Function Invoked By DyDx */
	function callFunction(
		address sender,
		Account.Info memory accountInfo,
		bytes memory data
	) external view override onlyDyDx {
		// Decode the passed variables from the data object
		(
			// This must match the variables defined in the Call object above
			address payable actualSender,
			uint256 loanAmount
		) = abi.decode(data, (address, uint256));

		// We now have a WETH balance of loanAmount. The logic for what we
		// want to do with it goes here. The code below is just there in case
		// it's useful.

		// It can be useful for debugging to have a verbose error message when
		// the loan can't be paid, since dydx doesn't provide one
		require(
			WETH_CONTRACT.balanceOf(address(this)) > loanAmount + 2,
			"Not enough funds to repay the flash loan!"
		);

		// TODO: Encode your logic here
		// E.g. arbitrage, liquidate accounts, etc
	}
}
