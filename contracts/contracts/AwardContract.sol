// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// 合约：奖励合约
contract AwardContract is ERC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _token_ids; // NFT计数器

    address manager; // 管理员，即VotingSystemContract合约

    // 纪念品(奖励)的结构structure
    struct Award {
        uint item_id; // 奖励的id
        string token_URI; // 奖励的URI
        uint award_time; // 获得奖励的时间
    }

    // 所有纪念品(奖励)的结构structure
    struct Awards {
        mapping(address => Award[]) get_award_with_address; // 由地址获取所拥有的奖励，映射关系
    }

    Awards private _awards;
    mapping(string => mapping(address => bool)) claimed_get_awards_user_list; // 已经获得指定2TokenURI奖励的用户名单

    // 初始化
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        manager = msg.sender; // VotingSystemContract合约管理员
    }

    // 给某个用户发放纪念品（奖励）
    function awardItem(address user, string memory token_URI) public {
        // Solidity需要将中文进行unicode转码
        // 只有系统可以访问此函数(awardTime) => \u53ea\u6709\u7cfb\u7edf\u53ef\u4ee5\u8bbf\u95ee\u6b64\u51fd\u6570(awardTime)
        require(msg.sender == manager, "\u53ea\u6709\u7cfb\u7edf\u53ef\u4ee5\u8bbf\u95ee\u6b64\u51fd\u6570(awardTime)");
        // 您已获得此奖励 => \u60a8\u5df2\u83b7\u5f97\u6b64\u5956\u52b1
        require(claimed_get_awards_user_list[token_URI][msg.sender] == false, "");

        // 将该用户设定为已获取纪念品(奖励)
        claimed_get_awards_user_list[token_URI][user] = true;

        // 由计数器获取现在的id值
        uint256 new_item_id = _token_ids.current();

        // 给对应的地址发送对应的NFT
        _mint(user, new_item_id);

        // 匹配URI和id的关系
        _setTokenURI(new_item_id, token_URI);

        // 计数器增加，准备下一次发放NFT
        _token_ids.increment();

        // 将新的纪念品记录下来
        Award memory new_award = Award({
            item_id: new_item_id,
            token_URI: token_URI,
            award_time:block.timestamp
        });
        _awards.get_award_with_address[user].push(new_award);
    }

    // 用户的所有award信息
    function getAwardInfo(address user) public view returns (uint[] memory, string[] memory, uint[] memory) {
        uint i;
        Award[] memory user_awards = _awards.get_award_with_address[user];
        uint[] memory item_id = new uint[](user_awards.length);
        string[] memory token_URI = new string[](user_awards.length);
        uint[] memory award_time = new uint[](user_awards.length);
        for (i = 0; i < user_awards.length; i++) {
            item_id[i] = user_awards[i].item_id;
            token_URI[i] = user_awards[i].token_URI;
            award_time[i] = user_awards[i].award_time;
        }
        return (item_id, token_URI, award_time);
    }

    // 用户是否可以获取某种Token_URI的award
    function getWhetherUserCanGetAward(address user, string memory token_URI) public view returns (bool) {
        return !claimed_get_awards_user_list[token_URI][user];
    }
}
