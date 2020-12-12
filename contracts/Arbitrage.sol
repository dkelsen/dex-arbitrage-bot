/* SPDX-License-Identifier: MIT */
pragma solidity ^0.6.12;

contract Arbitrage {
	address payable OWNER;

	constructor() public {
		OWNER = msg.sender;
	}

	modifier onlyOwner() {
		require(
			msg.sender == OWNER,
			"Wait a minute... You're not the owner of this contract!"
		);
		_;
	}

	/* Allow This Contract To Receive Ether */
	receive() external payable {}
}
