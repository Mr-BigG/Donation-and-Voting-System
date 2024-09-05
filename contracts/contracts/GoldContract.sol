// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 合约：金币合约
contract GoldContract is ERC20 {

    uint private _initial_user_gold; // 领取金币的数量
    mapping(address => bool) claimed_get_gold_user_list; // 已经领取金币的名单，已领取为true

    constructor(string memory name, string memory symbol, uint initial_user_gold) ERC20(name, symbol) {
        _initial_user_gold = initial_user_gold;
    }

    // 可以领取金币的数量
    function getInitialUserGold() public view returns (uint) {
        return _initial_user_gold;
    }

    // 每个用户是否可以领取初始金币
    function getWhetherUserCanGetInitialUserGold() public view returns (bool) {
        // 如果已领取（用户address对应的bool值为true），则返回false（即不能重复领取）
        return !claimed_get_gold_user_list[msg.sender];
    }
}
