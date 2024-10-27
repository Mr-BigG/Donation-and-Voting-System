// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 合约：金币合约 // Contract: GoldContract
contract GoldContract is ERC20 {

    uint private _initialUserGold; // 每次购买金币的数量 / The number of gold coins purchased per purchase

    uint public goldPrice = 0.01 ether; // 购买10000 gold的价格 / The price of buying 10,000 gold

    mapping(address => bool) claimedGetGoldUserList; // 已弃用的变量 / Deprecated variable

    constructor(string memory name, string memory symbol, uint initialUserGold) ERC20(name, symbol) {
        _initialUserGold = initialUserGold;
    }

    // 已弃用的函数 / Deprecated function
    function getInitialUserGold() public view returns (uint) {
        return _initialUserGold;
    }

    // ETH => gold
    function getGold() public payable {
        require(msg.value == goldPrice, "You need to send 0.01 ETH to get 10000 gold");

        // 接收ETH并给用户发放_initialUserGold数量的gold / Receives ETH and issues _initialUserGold amount of gold to the user
        _mint(msg.sender, _initialUserGold);
    }

    // 已弃用的函数 / Deprecated function
    function getWhetherUserCanGetInitialUserGold() public view returns (bool) {
        return !claimedGetGoldUserList[msg.sender];
    }

    // gold => ETH
    function getETH() public {
        uint userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "You have no gold to convert to ETH.");

        uint ethAmount = (userBalance * goldPrice) / _initialUserGold;
        require(address(this).balance >= ethAmount, "Not enough ETH in contract.");

        // 销毁用户的gold代币 / Destroy the user's gold tokens
        _burn(msg.sender, userBalance);

        // 给用户转账ETH / Transfer ETH to the user
        payable(msg.sender).transfer(ethAmount);

    }

    // 扣除1gold刷新排行榜，抵消排行榜的数据异步加载BUG / Deduct 1gold to refresh the leaderboard and offset the data asynchronous loading BUG in the leaderboard
    function reloadRankingList() public payable {
        // 扣除用户1个gold / Deduct 1 gold from the user
        _burn(msg.sender, 1);
    }
}
