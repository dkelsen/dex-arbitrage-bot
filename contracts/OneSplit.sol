/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;

import "./Shared.sol";

interface IOneSplit {
	function swap(
		IERC20 fromToken,
		IERC20 toToken,
		uint256 amount,
		uint256 minReturn,
		uint256[] memory distribution,
		uint256 disableFlags
	) external payable;
}
