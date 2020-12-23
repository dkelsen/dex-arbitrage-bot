/* SPDX-License-Identifier: MIT */
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./Shared.sol";

// These definitions are taken from across multiple dydx contracts, and are
// limited to just the bare minimum necessary to make flash loans work.
library Types {
	enum AssetDenomination { Wei, Par }
	enum AssetReference { Delta, Target }
	struct AssetAmount {
		bool sign;
		AssetDenomination denomination;
		AssetReference ref;
		uint256 value;
	}
}

library Account {
	struct Info {
		address owner;
		uint256 number;
	}
}

library Actions {
	enum ActionType {
		Deposit, // Supply tokens
		Withdraw, // Borrow tokens
		Transfer, // Transfer balance between accounts
		Buy, // Buy an amount of some token (externally)
		Sell, // Sell an amount of some token (externally)
		Trade, // Trade tokens against another account
		Liquidate, // Liquidate an undercollateralized or expiring account
		Vaporize, // Use excess tokens to zero-out a completely negative account
		Call // Send arbitrary data to an address
	}
	struct ActionArgs {
		ActionType actionType;
		uint256 accountId;
		Types.AssetAmount amount;
		uint256 primaryMarketId;
		uint256 secondaryMarketId;
		address otherAddress;
		uint256 otherAccountId;
		bytes data;
	}
}

interface ISoloMargin {
	function operate(
		Account.Info[] memory accounts,
		Actions.ActionArgs[] memory actions
	) external;
}

// The interface for a contract to be callable after receiving a flash loan
interface ICallee {
	function callFunction(
		address sender,
		Account.Info memory accountInfo,
		bytes memory data
	) external;
}

abstract contract DyDxFlashLoan is ICallee {
	/* Supported Tokens */
	address public WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
	address public SAI = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359;
	address public USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
	address public DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
	mapping(address => uint256) internal tokens;
	address payable OWNER;

	// The dydx Solo Margin contract, as can be found here:
	// https://github.com/dydxprotocol/solo/blob/master/migrations/deployed.json
	ISoloMargin private soloMargin =
		ISoloMargin(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);

	constructor() {
		tokens[WETH] = 1;
		tokens[SAI] = 2;
		tokens[USDC] = 3;
		tokens[DAI] = 4;
		OWNER = msg.sender;
	}

	modifier onlyDyDx() {
		require(
			msg.sender == address(soloMargin),
			"Wait a minute... You're not the dydx Solo Margin contract!"
		);
		_;
	}

	modifier onlyOwner() {
		require(
			msg.sender == OWNER,
			"Wait a minute... You're not the owner of this contract!"
		);
		_;
	}

	function tokenToMarketId(address _token) public view returns (uint256) {
		uint256 marketId = tokens[_token];
		require(marketId != 0, "FlashLoan: Unsupported token");
		return marketId - 1;
	}

	/* The Function Called By The Arbitrage Bot */
	function initiateFlashLoan(address _token, uint256 _loanAmount)
		external
		onlyOwner
	{
		IERC20(_token).approve(address(soloMargin), uint256(-1));

		Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

		operations[0] = Actions.ActionArgs({
			actionType: Actions.ActionType.Withdraw,
			accountId: 0,
			amount: Types.AssetAmount({
				sign: false,
				denomination: Types.AssetDenomination.Wei,
				ref: Types.AssetReference.Delta,
				value: _loanAmount
			}),
			primaryMarketId: tokenToMarketId(_token),
			secondaryMarketId: 0,
			otherAddress: address(this),
			otherAccountId: 0,
			data: ""
		});

		operations[1] = Actions.ActionArgs({
			actionType: Actions.ActionType.Call,
			accountId: 0,
			amount: Types.AssetAmount({
				sign: false,
				denomination: Types.AssetDenomination.Wei,
				ref: Types.AssetReference.Delta,
				value: 0
			}),
			primaryMarketId: 0,
			secondaryMarketId: 0,
			otherAddress: address(this),
			otherAccountId: 0,
			data: abi.encode(
				// Replace or add any additional variables that you want
				// to be available to the receiver function
				msg.sender,
				_loanAmount
			)
		});

		operations[2] = Actions.ActionArgs({
			actionType: Actions.ActionType.Deposit,
			accountId: 0,
			amount: Types.AssetAmount({
				sign: true,
				denomination: Types.AssetDenomination.Wei,
				ref: Types.AssetReference.Delta,
				value: _loanAmount + 2 /* Repayment Amount With 2 Wei Fee */
			}),
			primaryMarketId: tokenToMarketId(_token),
			secondaryMarketId: 0,
			otherAddress: address(this),
			otherAccountId: 0,
			data: ""
		});

		Account.Info[] memory accountInfos = new Account.Info[](1);
		accountInfos[0] = Account.Info({ owner: address(this), number: 1 });

		soloMargin.operate(accountInfos, operations);
	}
}
