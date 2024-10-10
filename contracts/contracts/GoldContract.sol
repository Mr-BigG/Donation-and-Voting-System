// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 合约：金币合约
contract GoldContract is ERC20 {

    uint private _initialUserGold; // 领取金币的数量
    mapping(address => bool) claimedGetGoldUserList; // 已经领取金币的名单，已领取为true

    constructor(string memory name, string memory symbol, uint initialUserGold) ERC20(name, symbol) {
        _initialUserGold = initialUserGold;
    }

    // 可以领取金币的数量
    function getInitialUserGold() public view returns (uint) {
        return _initialUserGold;
    }

    // 每个用户仅有一次领取金币Gold的机会
    function getGold() public {
        // 检查消息发起者是否已经领取过金币Gold
        require(claimedGetGoldUserList[msg.sender] == false, "You have got GOLD already");
        claimedGetGoldUserList[msg.sender] = true;
        // 领取
        _mint(msg.sender, _initialUserGold);
    }

    // 每个用户是否可以领取初始金币
    function getWhetherUserCanGetInitialUserGold() public view returns (bool) {
        // 如果已领取（用户address对应的bool值为true），则返回false（即不能重复领取）
        return !claimedGetGoldUserList[msg.sender];
    }
}
