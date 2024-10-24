// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 合约：金币合约
contract GoldContract is ERC20 {

    uint private _initialUserGold; // 每次购买金币的数量

    uint public goldPrice = 0.01 ether; // 购买10000 gold的价格

    mapping(address => bool) claimedGetGoldUserList; // 已经领取金币的名单，已领取为true 注：该功能已基本弃用，因为原系统为免费一次性领取gold，本系统为花费ETH购买

    constructor(string memory name, string memory symbol, uint initialUserGold) ERC20(name, symbol) {
        _initialUserGold = initialUserGold;
    }

    // 可以领取金币的数量 注：该功能已基本弃用
    function getInitialUserGold() public view returns (uint) {
        return _initialUserGold;
    }

    // TODO: 修改为可以无限次领取(已完成)
    function getGold() public payable {
        require(msg.value == goldPrice, "You need to send 0.01 ETH to get 10000 gold");

        // 接收ETH并给用户发放_initialUserGold数量的gold
        _mint(msg.sender, _initialUserGold);
    }

    // 每个用户是否可以领取金币 注：该功能已基本弃用
    function getWhetherUserCanGetInitialUserGold() public view returns (bool) {
        // 如果已领取（用户address对应的bool值为true），则返回false（即不能重复领取） 注：该功能已基本弃用，因为永远返回true
        return !claimedGetGoldUserList[msg.sender];
    }

    // TODO: 将gold提现为ETH(已完成)
    // gold => ETH
    function getETH() public {
        uint userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "You have no gold to convert to ETH");

        uint ethAmount = (userBalance * goldPrice) / _initialUserGold;
        require(address(this).balance >= ethAmount, "Not enough ETH in contract");

        // 销毁用户的gold代币
        _burn(msg.sender, userBalance);

        // 给用户转账ETH
        payable(msg.sender).transfer(ethAmount);

    }

    // 扣除1gold刷新排行榜，抵消排行榜的数据异步加载BUG
    function reloadRankingList() public payable {
        // 扣除用户1个gold
        _burn(msg.sender, 1);
    }
}
