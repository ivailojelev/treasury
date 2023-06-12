// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

contract TreasuryToken is ERC20 {
    constructor() ERC20("TreasuryToken", "TRE") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
