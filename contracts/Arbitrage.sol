/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;

contract Arbitrage {
	address payable OWNER;

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

	function withdrawEther(uint256 _amount) public onlyOwner {
		require(
			_amount <= address(this).balance,
			"Specified withdrawal amount exceeds the available funds."
		);
		msg.sender.transfer(_amount);
	}

	/* Allow This Contract To Receive Ether */
	receive() external payable {}
}
