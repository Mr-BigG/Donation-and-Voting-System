// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// 合约：奖励合约 / Contract: AwardContract
contract AwardContract is ERC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds; // NFT计数器 / NFT Counter

    address manager; // 管理员，即DonationAndVotingSystemContract合约 / Admin, which is DonationAndVotingSystemContract

    // 纪念品(奖励)的结构structure / The structure of souvenir(AKA. Award)
    struct Award {
        uint itemId; // 奖励的id / Id of award
        string tokenURI; // 奖励的URI / URI of award
        uint awardTime; // 获得奖励的时间 / Awarding time
    }

    // 所有纪念品(奖励)的结构structure / The structure of all awards
    struct Awards {
        mapping(address => Award[]) getAwardWithAddress; // 由地址获取所拥有的奖励，映射关系 / Get the reward owned by the address, mapping relationship
    }

    Awards private _awards;
    mapping(string => mapping(address => bool)) claimedGetAwardsUserList; // 已经获得指定TokenURI奖励的用户名单 / List of users who have received a reward from the specified TokenURI

    // 初始化 / Initialize
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        manager = msg.sender; // VotingSystemContract合约管理员
    }

    // 给某个用户发放纪念品（奖励） / Send a souvenir (reward) to a user
    function awardItem(address user, string memory tokenURI) public {
        // Solidity需要将中文进行unicode转码 / Solidity requires unicode transcoding of Chinese
        require(msg.sender == manager, "Only the system can access this function (awardTime)");
        require(claimedGetAwardsUserList[tokenURI][msg.sender] == false, "You have received this reward");

        // 将该用户设定为已获取纪念品(奖励) / Set the user as having earned a souvenir (reward)
        claimedGetAwardsUserList[tokenURI][user] = true;

        // 由计数器获取现在的id值 / Gets the current id value by the counter
        uint256 newItemId = _tokenIds.current();

        // 给对应的地址发送对应的NFT / Sends the corresponding NFT to the corresponding address
        _mint(user, newItemId);

        // 匹配URI和id的关系 / Matches the relationship between URI and id
        _setTokenURI(newItemId, tokenURI);

        // 计数器增加，准备下一次发放NFT / The counter is increased, ready for the next NFT issuance
        _tokenIds.increment();

        // 将新的纪念品记录下来 / Keep a record of new mementos
        Award memory newAward = Award({
            itemId: newItemId,
            tokenURI: tokenURI,
            awardTime:block.timestamp
        });
        _awards.getAwardWithAddress[user].push(newAward);
    }

    // 用户的所有award信息 / All award information of the user
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

    // 用户是否可以获取某种Token_URI的award / Whether the user can obtain an award for a Token_URI
    function getWhetherUserCanGetAwardReward(address user, string memory tokenURI) public view returns (bool) {
        return !claimedGetAwardsUserList[tokenURI][user];
    }
}
