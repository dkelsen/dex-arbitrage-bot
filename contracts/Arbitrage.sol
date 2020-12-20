/* SPDX-License-Identifier: MIT */
pragma solidity >=0.4.22 <0.8.0;

/* A partial IERC20 interface */
interface IERC20 {
  function balanceOf(address owner) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transfer(address to, uint256 amount) external returns (bool);
}

/* A partial WETH interface */
interface IWETH is IERC20 {
  function deposit() external payable;
  function withdraw(uint256 _amount) external;
}

contract Arbitrage {
	address payable OWNER;
  IWETH WETHCONTRACT = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

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
    WETHCONTRACT.withdraw(_amount);
  }

  function depositWeth() external payable {
    WETHCONTRACT.deposit{value: msg.value}();
  }

  function getWethBalance() external view returns (uint256) {
    return WETHCONTRACT.balanceOf(address(this));
  }

	/* Allow This Contract To Receive Ether */
	receive() external payable {}
}
