/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;
pragma abicoder v2;

import "./Shared.sol";
import "./FlashLoan.sol";

contract Arbitrage is DyDxFlashLoan {
	address payable OWNER;
	IWETH WETH_CONTRACT = IWETH(WETH);

	constructor() {
		OWNER = msg.sender;
	}

	modifier onlyOwner() {
		require(
			msg.sender == OWNER,
			"Wait a minute... You're not the owner of this contract!"
		);
		_;
	}

	/* Deposits And Withdrawals */
	function withdrawEther(uint256 _amount) public onlyOwner {
		require(
			_amount <= address(this).balance,
			"Specified withdrawal amount exceeds the available funds."
		);
		msg.sender.transfer(_amount);
	}

	function withdrawWeth(uint256 _amount) external onlyOwner {
		WETH_CONTRACT.withdraw(_amount);
	}

	function depositWeth() external payable {
		WETH_CONTRACT.deposit{ value: msg.value }();
	}

	function getWethBalance() external view returns (uint256) {
		return WETH_CONTRACT.balanceOf(address(this));
	}

	/* Allow This Contract To Receive Ether */
	receive() external payable {}

	/* Function Invoked By DyDx */
	function callFunction(
		address sender,
		Account.Info memory accountInfo,
		bytes memory data
	) external view override {
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
