// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// 合约：奖励合约
contract AwardContract is ERC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds; // NFT计数器

    address manager; // 管理员，即VotingSystemContract合约

    // 纪念品(奖励)的结构structure
    struct Award {
        uint itemId; // 奖励的id
        string tokenURI; // 奖励的URI
        uint awardTime; // 获得奖励的时间
    }

    // 所有纪念品(奖励)的结构structure
    struct Awards {
        mapping(address => Award[]) getAwardWithAddress; // 由地址获取所拥有的奖励，映射关系
    }

    Awards private _awards;
    mapping(string => mapping(address => bool)) claimedGetAwardsUserList; // 已经获得指定2TokenURI奖励的用户名单

    // 初始化
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        manager = msg.sender; // VotingSystemContract合约管理员
    }

    // 给某个用户发放纪念品（奖励）
    function awardItem(address user, string memory tokenURI) public {
        // Solidity需要将中文进行unicode转码
        // 只有系统可以访问此函数(awardTime) => \u53ea\u6709\u7cfb\u7edf\u53ef\u4ee5\u8bbf\u95ee\u6b64\u51fd\u6570(awardTime)
        require(msg.sender == manager, "\u53ea\u6709\u7cfb\u7edf\u53ef\u4ee5\u8bbf\u95ee\u6b64\u51fd\u6570(awardTime)");
        // 您已获得此奖励 => \u60a8\u5df2\u83b7\u5f97\u6b64\u5956\u52b1
        require(claimedGetAwardsUserList[tokenURI][msg.sender] == false, "");

        // 将该用户设定为已获取纪念品(奖励)
        claimedGetAwardsUserList[tokenURI][user] = true;

        // 由计数器获取现在的id值
        uint256 newItemId = _tokenIds.current();

        // 给对应的地址发送对应的NFT
        _mint(user, newItemId);

        // 匹配URI和id的关系
        _setTokenURI(newItemId, tokenURI);

        // 计数器增加，准备下一次发放NFT
        _tokenIds.increment();

        // 将新的纪念品记录下来
        Award memory newAward = Award({
            itemId: newItemId,
            tokenURI: tokenURI,
            awardTime:block.timestamp
        });
        _awards.getAwardWithAddress[user].push(newAward);
    }

    // 用户的所有award信息
    function getAwardInformation(address user) public view returns (uint[] memory, string[] memory, uint[] memory) {
        uint i;
        Award[] memory userAwards = _awards.getAwardWithAddress[user];
        uint[] memory itemId = new uint[](userAwards.length);
        string[] memory tokenURI = new string[](userAwards.length);
        uint[] memory awardTime = new uint[](userAwards.length);
        for (i = 0; i < userAwards.length; i++) {
            itemId[i] = userAwards[i].itemId;
            tokenURI[i] = userAwards[i].tokenURI;
            awardTime[i] = userAwards[i].awardTime;
        }
        return (itemId, tokenURI, awardTime);
    }

    // 用户是否可以获取某种Token_URI的award
    function getWhetherUserCanGetAward(address user, string memory tokenURI) public view returns (bool) {
        return !claimedGetAwardsUserList[tokenURI][user];
    }
}
