// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./GoldContract.sol";
import "./AwardContract.sol";
import "./StringHelper.sol";

/*
    在该合约中，共有2个结构，即Donation和Vote，分别代表捐赠和投票
    系统的功能逻辑为：
    1. 首先新注册的用户可以免费领取一些金币（即gold，也就是原系统的TP通证积分），因为创建一个donation需要消耗一定数额的gold
    2. 用户在领取之后，可以创建一个donation并设定该donation的开始时间、结束时间和描述
    3. 创建donation会消耗一定数额的gold，如果用户的gold不足则无法创建
    4. 当donation创建后，其它用户（包括自己）可以给该donation进行voting
    5. voting时，需要donation在有效的时间区间内
    6. 每个用户对一个donation仅可进行一次voting，无论approval还是reject
    7. 如果voting为approval，则消耗voter的一定数量的gold
    8. 如果voting为reject，则不消耗gold
    9. donation的时间结束后，进行结果统计
    10. 如果approved >= rejected，则将用户创建donation时花费的gold和其他用户voting时花费的gold全部return给该用户
    11. 如果approved < rejected，则将其他用户voting时花费的gold全部返回，且该用户创建donation时花费的gold不予返回（作为惩罚）
    12. (optional)用户每3个成功的donation都会获得纪念品奖励
*/



// 合约：捐赠与投票系统合约
contract DonationAndVotingSystemContract {

    using Counters for Counters.Counter;

    // 捐赠的结构structure
    struct Donation {
        uint id; // 捐赠的ID
        string content; // 捐赠的内容
        address creator; // 捐赠的发起人
        uint voteStartTime; // 捐赠的发起时间
        uint voteEndTime; // 捐赠的结束时间
        bool isGoldRewardGotten; // 是否已领取金币奖励（捐赠通过后的奖励，也就是筹集到的款）
        bool isValid; // 捐赠是否存在
    }

    // 所有捐赠的结构structure
    struct Donations {
        mapping(uint => Donation) getDonationWithId; // mapping映射
        uint[] donationIds; // 所有捐赠的id
        uint goldConsumedByDonation; // 发起捐赠需要消耗的金币数量
        Counters.Counter donationIdCounter; // 捐赠id的计数器
    }

    // 捐赠的状态，枚举类型
    enum DonationStatus {
        isBeingVotedOn, // 正在投票中
        isRejected, // 投票结束：拒绝
        isApproved, // 投票结束：同意
        notStartedYet // 投票未开始
    }

    // 投票的结构structure
    struct Vote {
        VoteBehavior status; // 投票的状态
        address voter; // 投票人
        uint voteTime; // 投票时间
        uint donationIdVotedOn; // 投票的对象
    }

    // 所有投票的结构structure
    struct Votes {
        mapping(uint => Vote[]) getVoteWithAddressAndId; // 所有投票的信息
        address[] userAddresses; // 用来存储所有用户的地址
        uint maxVotingTimes; // 最大投票次数
        uint goldConsumedByVote; // 投票需要消耗的金币数量
    }

    // 投票的状态，枚举类型
    enum VoteBehavior {
        reject, // 拒绝
        approve // 同意
    }

    // 其它变量
    Donations private _donations; // 表示所有捐赠的信息
    Votes private _votes; // 表示所有投票的信息
    GoldContract public gold; // 本系统的货币：金币（即通证积分）
    AwardContract public awards; // 纪念品(奖励)

    address public admin; // 合约管理员（创建者）

    // 直接存储用户的投票记录，映射: 用户地址 -> 捐赠ID -> 投票数组
    mapping(address => mapping(uint => Vote[])) private _userVotes;

    // 构造函数
    constructor(uint maxVotingTimes, uint goldConsumedByDonation, uint goldConsumedByVote, uint initIalUserGold) {
        admin = msg.sender; // 合约创建者的地址
        _donations.goldConsumedByDonation = goldConsumedByDonation; // 发起捐赠需要消耗的金币数量
        _votes.maxVotingTimes = maxVotingTimes; //最大投票次数
        _votes.goldConsumedByVote = goldConsumedByVote; // 每个投票需要消耗的金币数量
        gold = new GoldContract("GoldCoin", "gold", initIalUserGold); //一键领取金币
        awards = new AwardContract("Awards", "awards"); //一键发纪念品（奖励）
    }

    // 发起一个新的捐赠
    function addNewDonation(string calldata content, uint startTime, uint endTime) public {
        // Solidity需要将中文进行unicode转码
        // 开始时间必须小于结束时间 => \u60a8\u5df2\u5f00\u59cb\u65f6\u95f4\u5fc5\u987b\u5c0f\u4e8e\u7ed3\u675f\u65f6\u95f4
        require(startTime < endTime, "\u60a8\u5df2\u5f00\u59cb\u65f6\u95f4\u5fc5\u987b\u5c0f\u4e8e\u7ed3\u675f\u65f6\u95f4");
        // 结束时间必须在未来 => \u7ed3\u675f\u65f6\u95f4\u5fc5\u987b\u5728\u672a\u6765
        require(endTime > block.timestamp, "\u7ed3\u675f\u65f6\u95f4\u5fc5\u987b\u5728\u672a\u6765");
        // 余额不足，无法提起新的捐赠 => \u4f59\u989d\u4e0d\u8db3\uff0c\u65e0\u6cd5\u63d0\u8d77\u65b0\u7684\u6350\u8d60
        require(gold.balanceOf(msg.sender) >= _donations.goldConsumedByDonation, "\u4f59\u989d\u4e0d\u8db3\uff0c\u65e0\u6cd5\u63d0\u8d77\u65b0\u7684\u6350\u8d60");
        // 系统对你的金币没有权限。请授权。 => \u7cfb\u7edf\u5bf9\u4f60\u7684\u91d1\u5e01\u6ca1\u6709\u6743\u9650\u3002\u8bf7\u6388\u6743\u3002
        require(gold.allowance(msg.sender, address(this)) >= _donations.goldConsumedByDonation, "");

        gold.transferFrom(msg.sender, address(this), _donations.goldConsumedByDonation); // 委托本合约把用户的金币转账给本合约（需要前端提前委托）

        uint newId = _donations.donationIdCounter.current(); // 获取新id
        Donation memory newDonation = Donation({
            id: newId, //捐赠的id
            content: content, // 捐赠的内容
            creator: msg.sender, // 捐赠的发起人
            voteStartTime: startTime, //捐赠的投票开始时间
            voteEndTime: endTime, //捐赠的投票结束时间
            isGoldRewardGotten: false, // 是否已领取金币奖励
            isValid: true // 捐赠是否存在或有效
        });
        _donations.getDonationWithId[newId] = newDonation; //添加一个捐赠
        _donations.donationIds.push(newId); // 添加一个新的id
        _donations.donationIdCounter.increment(); // id的自增

        uint i;
        bool isSenderInUserAddresses = false; // 检查当前的捐赠发起人地址是否已经存储
        for (i = 0; i < _votes.userAddresses.length; i++) {
            if (_votes.userAddresses[i] == msg.sender) {
                isSenderInUserAddresses = true;
                break;
            }
        }
        // 当前捐赠的发起人的地址不存在
        if (!isSenderInUserAddresses) {
            _votes.userAddresses.push(msg.sender); // 添加一个新的地址
        }
    }

    // 捐赠的所有id
    function getDonationIds() public view returns (uint[] memory) {
        return _donations.donationIds;
    }

    // 用户的捐赠的所有id
    function getUserDonationIds() public view returns (uint[] memory) {
        uint count = 0; // 计数器，表明某个用户共有多少捐赠
        uint i;
        for (i = 0; i < _donations.donationIds.length; i++) {
            if (_donations.getDonationWithId[_donations.donationIds[i]].creator == msg.sender) {
                count++; // 每找到此用户的一个捐赠，计数器自增
            }
        }

        uint[] memory ids = new uint[](count); // 用来存储用户的所有捐赠的id
        count = 0;
        for (i = 0; i < _donations.donationIds.length; i++) {
            if (_donations.getDonationWithId[_donations.donationIds[i]].creator == msg.sender) {
                ids[count] = _donations.donationIds[i];
                count++;
            }
        }

        return ids;
    }

    // 捐赠的信息
    function getDonationInformation(uint id, uint timeNow) public view returns (string memory, address, uint, uint, uint) {
        // 这个捐赠不存在 => \u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728
        require(_donations.getDonationWithId[id].isValid == true, "\u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728"); // 判断该捐赠是否存在

        uint status = uint(getDonationStatus(id, timeNow)); // 捐赠的状态
        string memory content = _donations.getDonationWithId[id].content; // 捐赠的内容
        address creator = _donations.getDonationWithId[id].creator; // 捐赠的发起人
        uint voteStartTime = _donations.getDonationWithId[id].voteStartTime; // 捐赠的发起时间
        uint voteEndTime = _donations.getDonationWithId[id].voteEndTime; // 捐赠的结束时间

        return (content, creator, voteStartTime, voteEndTime, status);
    }

    // 发布捐赠需要消耗的金币数量
    function getGoldConsumedByDonation() public view returns (uint) {
        return _donations.goldConsumedByDonation;
    }

    // 捐赠的状态
    function getDonationStatus(uint id) public view returns (DonationStatus) {
        // 这个捐赠不存在 => \u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728
        require(_donations.getDonationWithId[id].isValid == true, "\u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728");

        // 检查是否超时
        if (block.timestamp > _donations.getDonationWithId[id].voteEndTime) {
            // 超时，统计投票情况
            uint numOfApproval = 0; // 赞成
            uint numOfReject = 0; // 反对
            uint i;
            Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
            for (i = 0; i < votes.length; i++) {
                if (votes[i].status == VoteBehavior.approve) {
                    numOfApproval++;
                } else if (votes[i].status == VoteBehavior.reject) {
                    numOfReject++;
                }
            }

            // 赞成数量多于反对数量
            if (numOfApproval > numOfReject) {
                // 捐赠通过
                return DonationStatus.isApproved;
            } else {
                // 捐赠未通过
                return DonationStatus.isRejected;
            }
        } else {
            if (block.timestamp < _donations.getDonationWithId[id].voteStartTime) {
                // 捐赠的投票还没开始
                return DonationStatus.notStartedYet;
            } else {
                // 捐赠正在投票中
                return DonationStatus.isBeingVotedOn;
            }
        }
    }

    // 捐赠状态（使用外部传入的时间戳）
    function getDonationStatus(uint id, uint timeNow) public view returns (DonationStatus) {
        // 这个捐赠不存在 => \u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728
        require(_donations.getDonationWithId[id].isValid == true, "\u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728");

        // 检查捐赠是否超时
        if (timeNow > _donations.getDonationWithId[id].voteEndTime) {
            // 超时，统计捐赠情况
            uint numOfApproval = 0; // 赞成
            uint numOfReject = 0; // 反对
            uint i;
            Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
            for (i = 0; i < votes.length; i++) {
                if (votes[i].status == VoteBehavior.approve) {
                    numOfApproval++;
                } else if (votes[i].status == VoteBehavior.reject) {
                    numOfReject++;
                }
            }

            if (numOfApproval > numOfReject) {
                // 捐赠通过
                return DonationStatus.isApproved;
            } else {
                // 捐赠未通过
                return DonationStatus.isRejected;
            }
        } else {
            if (timeNow < _donations.getDonationWithId[id].voteStartTime) {
                // 捐赠的投票还没开始
                return DonationStatus.notStartedYet;
            } else {
                // 捐赠正在投票中
                return DonationStatus.isBeingVotedOn;
            }
        }
    }

    // 用户是否可以领取gold奖励
    function getWhetherUserCanGetGoldReward(uint id, uint timeNow) public view returns (bool) {
        // 这个捐赠不存在 => \u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728
        require(_donations.getDonationWithId[id].isValid == true, "\u8fd9\u4e2a\u6350\u8d60\u4e0d\u5b58\u5728");

        if (_donations.getDonationWithId[id].creator != msg.sender) {
            return false;
        }

        if (getDonationStatus(id, timeNow) == DonationStatus.isApproved && _donations.getDonationWithId[id].isGoldRewardGotten == false) {
            return true;
        } else {
            return false;
        }
    }


    // 领取gold金币奖励
    function getGoldRewardFromDonationApproved(uint id) public {
        // 由于一些原因，你无法获得金币奖励 => \u7531\u4e8e\u4e00\u4e9b\u539f\u56e0\uff0c\u4f60\u65e0\u6cd5\u83b7\u5f97\u91d1\u5e01\u5956\u52b1
        require(getWhetherUserCanGetGoldReward(id, block.timestamp) == true, "\u7531\u4e8e\u4e00\u4e9b\u539f\u56e0\uff0c\u4f60\u65e0\u6cd5\u83b7\u5f97\u91d1\u5e01\u5956\u52b1");

        _donations.getDonationWithId[id].isGoldRewardGotten = true;
        // 统计捐赠情况
        uint numOfApproval = 0; // 赞成
        uint numOfReject = 0; // 反对
        uint i;
        Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
        for (i = 0; i < votes.length; i++) {
            if (votes[i].status == VoteBehavior.approve) {
                numOfApproval++;
            } else if (votes[i].status == VoteBehavior.reject) {
                numOfReject++;
            }
        }

        // 给捐赠发起人发放奖励（捐赠发起人所缴纳的金币gold + 该捐赠投票(赞成+反对)所得的所有金币gold）
        gold.transfer(_donations.getDonationWithId[id].creator, (numOfApproval + numOfReject) * _votes.goldConsumedByVote + _donations.goldConsumedByDonation);
    }

    // 用户是否可以领取纪念品奖励
    function getWhetherUserCanGetAwardReward(uint timeNow) public view returns (bool) {
        // 捐赠发起人成功捐赠的数量
        uint[] memory ids = getUserDonationIds();
        uint j;
        uint numOfDonationsApproved = 0;
        for (j = 0; j < ids.length; j++) {
            if (getDonationStatus(ids[j], timeNow) == DonationStatus.isApproved) {
                numOfDonationsApproved++;
            }
        }

        // 检查捐赠发起人是否有3个及以上的成功捐赠
        if (numOfDonationsApproved >= 3) {
            // 每3个捐赠发放一次纪念品（奖励）
            uint numOfAward = numOfDonationsApproved / 3;
            uint i;
            for (i = 1; i <= numOfAward; i++) {
                // 成就：已批准 %u 个捐赠 => \u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60
                if (awards.getWhetherUserCanGetAwardReward(msg.sender, StringHelper.sprintf("\u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60", i * 3))) {
                    return true;
                } else {
                    continue;
                }
            }
            return false;
        } else {
            return false;
        }
    }

    // 纪念品（奖励）
    function getAwardReward() public {
        // 由于一些原因，你无法获得金币奖励 => \u7531\u4e8e\u4e00\u4e9b\u539f\u56e0\uff0c\u4f60\u65e0\u6cd5\u83b7\u5f97\u91d1\u5e01\u5956\u52b1
        require(getWhetherUserCanGetAwardReward(block.timestamp) == true, "\u7531\u4e8e\u4e00\u4e9b\u539f\u56e0\uff0c\u4f60\u65e0\u6cd5\u83b7\u5f97\u91d1\u5e01\u5956\u52b1");

        // 捐赠发起人的成功捐赠的数量
        uint[] memory ids = getUserDonationIds();
        uint i;
        uint numOfDonationApproved = 0;
        for (i = 0; i < ids.length; i++) {
            if (getDonationStatus(ids[i]) == DonationStatus.isApproved) {
                numOfDonationApproved++;
            }
        }

        // 检查捐赠的发起人是否有3个及以上的成功捐赠
        if (numOfDonationApproved >= 3) {
            // 每3个捐赠发放一次纪念品
            uint numOfAward = numOfDonationApproved / 3;
            uint j;
            for (j = 1; j <= numOfAward; j++) {
                // 是否已经领取过某种纪念品
                // 成就：已批准 %u 个捐赠 => \u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60
                if (awards.getWhetherUserCanGetAwardReward(msg.sender, StringHelper.sprintf("\u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60", j * 3))) {
                    awards.awardItem(msg.sender, StringHelper.sprintf("\u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60", j * 3));
                } else {
                    continue;
                }
            }
        }
    }


    error ExceededMaxVotes(uint maxVotes);
    event VoteRejected(string reason);

    // 检查是否到达最大投票次数
    function checkWhetherReachedTheMaxVotingTimes(uint id) view public returns (bool) {
        Vote[] storage userVotes = _userVotes[msg.sender][id];
        if (userVotes.length >= _votes.maxVotingTimes) {
            return false;
        }
        return true;
    }

    // 检查投票逻辑
    function checkVotingConditions(uint donationId, uint userVote) public view returns (bool) {
        Vote[] storage userVotes = _userVotes[msg.sender][donationId];
        VoteBehavior behavior = VoteBehavior(userVote);
        bool isFirstVote = userVotes.length == 0; // 是否为第一次投票

        if (isFirstVote) {
            // 如果是第一次投票，返回 true
            return true;
        }

        // 如果不是第一次投票，检查历史投票
        for (uint i = 0; i < userVotes.length; i++) {
            // 接口已由GSJ写好，只需把下面的注释取消即可在后端实现检测reject only once in per donation
            if (behavior == VoteBehavior.reject && userVotes.length == 1 && userVotes[i].status == VoteBehavior.reject) {
                // 如果是reject 投票，且之前投过一次拒绝票，不能再次reject
                return false;
            }
            if (behavior == VoteBehavior.approve && userVotes[i].status == VoteBehavior.reject) {
                // 如果是 approve 投票，且之前有 reject，不能投 approve
                return false;
            }
            if (behavior == VoteBehavior.reject && userVotes[i].status == VoteBehavior.approve) {
                // 如果是 reject 投票，且之前有 approve，不能投 reject
                return false;
            }
        }

        // 所有检查通过，允许投票
        return true;
    }

    // 新增函数：记录用户投票
    function recordUserVote(uint donationId, uint userVote) public {
        VoteBehavior behavior = VoteBehavior(userVote);
        _userVotes[msg.sender][donationId].push(Vote({
            status: behavior,
            voter: msg.sender,
            voteTime: block.timestamp,
            donationIdVotedOn: donationId
        }));
    }

    // 发起一个新的投票
    function voteOnDonation(uint userVote, uint id) public {
        // 投票已关闭，无法投票 => \u6295\u7968\u5df2\u5173\u95ed\uff0c\u65e0\u6cd5\u6295\u7968
        require(getDonationStatus(id) == DonationStatus.isBeingVotedOn, "\u6295\u7968\u5df2\u5173\u95ed\uff0c\u65e0\u6cd5\u6295\u7968");
        // 已超过最大投票次数，无法投票 => \u5df2\u8d85\u8fc7\u6700\u5927\u6295\u7968\u6b21\u6570\uff0c\u65e0\u6cd5\u6295\u7968
//        require(_votes.getVoteWithAddressAndId[id].length < _votes.maxVotingTimes, "You have reached the max voting times");
//        if (_votes.getVoteWithAddressAndId[id].length >= _votes.maxVotingTimes) {
//            emit VoteRejected("You have reached the max voting times");
//            revert("You have reached the max voting times");
//            require(false, "You have reached the max voting times");
//        }

        // 获取用户对当前捐赠的投票次数
        uint currentVoteCount = _userVotes[msg.sender][id].length;
        // 计算当前投票需要消耗的金币数量，第一次为100，之后每次翻倍
        uint goldCost = 100 * (2 ** currentVoteCount);

        // 余额不足，无法投票 => \u4f59\u989d\u4e0d\u8db3\uff0c\u65e0\u6cd5\u6295\u7968
        require(gold.balanceOf(msg.sender) >= goldCost, "\u4f59\u989d\u4e0d\u8db3\uff0c\u65e0\u6cd5\u6295\u7968");
        // 系统对你的金币没有权限。请授权。 => \u7cfb\u7edf\u5bf9\u4f60\u7684\u91d1\u5e01\u6ca1\u6709\u6743\u9650\u3002\u8bf7\u6388\u6743\u3002
        require(gold.allowance(msg.sender, address(this)) >= goldCost, "\u7cfb\u7edf\u5bf9\u4f60\u7684\u91d1\u5e01\u6ca1\u6709\u6743\u9650\u3002\u8bf7\u6388\u6743\u3002");

        // TODO: 对新的投票进行判定，若为初次投票，则可以进行投票；若已拒绝，则不可再投任何票；若已同意，则不可再拒绝(已完成)


        gold.transferFrom(msg.sender, address(this), goldCost); // 委托本合约把用户的金币gold转账给本合约（需要前端提前委托）

        Vote memory newVote = Vote({
            status: VoteBehavior(userVote), // 投票状态
            voter: msg.sender, // 投票人
            voteTime: block.timestamp, // 投票时间
            donationIdVotedOn: id // 投票对象
        });

        _votes.getVoteWithAddressAndId[id].push(newVote); // 添加一个新的投票

        uint i;
        bool isSenderInUserAddresses = false; // 当前投票人地址是否已经存储
        for (i = 0; i < _votes.userAddresses.length; i++) {
            if (_votes.userAddresses[i] == msg.sender) {
                isSenderInUserAddresses = true;
                break;
            }
        }
        if (!isSenderInUserAddresses) {
            _votes.userAddresses.push(msg.sender); // 添加一个新地址
        }

        recordUserVote(id, userVote);
    }

    // 用户投票信息
    function getUserVotesInformation() public view returns (uint[] memory, uint[] memory, uint[] memory) {
        uint i;
        uint j;
        uint count = 0;
        for (i = 0; i < _donations.donationIds.length; i++) {
            Vote[] memory votes = _votes.getVoteWithAddressAndId[_donations.donationIds[i]];
            for (j = 0; j < votes.length; j++) {
                if (votes[j].voter == msg.sender) {
                    count++;
                }
            }
        }

        uint[] memory status = new uint[](count); // 投票的状态
        uint[] memory voteTime = new uint[](count); // 投票的时间
        uint[] memory donationIdVotedOn = new uint[](count); // 投票的对象

        count = 0;
        for (i = 0; i < _donations.donationIds.length; i++) {
            Vote[] memory votes = _votes.getVoteWithAddressAndId[_donations.donationIds[i]];
            for (j = 0; j < votes.length; j++) {
                if (votes[j].voter == msg.sender) {
                    status[count] = uint(votes[j].status);
                    voteTime[count] = votes[j].voteTime;
                    donationIdVotedOn[count] = votes[j].donationIdVotedOn;
                    count++;
                }
            }
        }

        return (status, voteTime, donationIdVotedOn);
    }

    // 指定id的捐赠的投票信息
    function getDonationVotesInformation(uint id, uint timeNow) public view returns (uint[] memory, uint[] memory, address[] memory) {

        Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
        uint[] memory status = new uint[](votes.length);
        uint[] memory voteTime = new uint[](votes.length);
        address[] memory voter = new address[](votes.length);


        uint i = 0;
        for (i = 0; i < votes.length; i++) {

            status[i] = uint(votes[i].status);
            voteTime[i] = votes[i].voteTime;
            voter[i] = votes[i].voter;

        }

        if ((msg.sender == _donations.getDonationWithId[id].creator) || (getDonationStatus(id, timeNow) != DonationStatus.isBeingVotedOn)) {
            return (status, voteTime, voter);
        } else {
            voteTime = new uint[](votes.length); // 全为0
            voter = new address[](votes.length); // 全为0
            return (status, voteTime, voter);
        }
    }

    // TODO: 实现donation的排行榜(已完成)
    function getDonationRankingList(uint flag) public view returns (Donation[] memory, uint[] memory, uint[] memory) {
        // flag为1，获取通过的donation的排行榜；flag为0，获取失败的donation的排行榜
        if (flag == 1) {
            // 获取所有通过的捐赠
            uint approvedCount = 0;
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                if (getDonationStatus(_donations.donationIds[i]) == DonationStatus.isApproved) {
                    approvedCount++;
                }
            }

            // 初始化通过的捐赠数组
            Donation[] memory approvedDonations = new Donation[](approvedCount);
            uint[] memory approveVotes = new uint[](approvedCount);
            uint[] memory rejectVotes = new uint[](approvedCount);

            uint index = 0;
            // 填充通过的捐赠信息和票数
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                uint donationId = _donations.donationIds[i];
                if (getDonationStatus(donationId) == DonationStatus.isApproved) {
                    approvedDonations[index] = _donations.getDonationWithId[donationId];
                    uint numOfApproval = 0;
                    uint numOfReject = 0;
                    Vote[] memory votes = _votes.getVoteWithAddressAndId[donationId];
                    for (uint j = 0; j < votes.length; j++) {
                        if (votes[j].status == VoteBehavior.approve) {
                            numOfApproval++;
                        } else if (votes[j].status == VoteBehavior.reject) {
                            numOfReject++;
                        }
                    }
                    approveVotes[index] = numOfApproval;
                    rejectVotes[index] = numOfReject;
                    index++;
                }
            }

            // 对通过的捐赠按照赞成票数从高到低，若相同则按照反对票数从低到高进行排序
            for (uint i = 0; i < approvedCount; i++) {
                for (uint j = i + 1; j < approvedCount; j++) {
                    if (
                        approveVotes[i] < approveVotes[j] ||
                        (approveVotes[i] == approveVotes[j] && rejectVotes[i] > rejectVotes[j])
                    ) {
                        // 交换捐赠信息
                        Donation memory tempDonation = approvedDonations[i];
                        approvedDonations[i] = approvedDonations[j];
                        approvedDonations[j] = tempDonation;

                        // 交换赞成票数和反对票数
                        uint tempApprove = approveVotes[i];
                        approveVotes[i] = approveVotes[j];
                        approveVotes[j] = tempApprove;

                        uint tempReject = rejectVotes[i];
                        rejectVotes[i] = rejectVotes[j];
                        rejectVotes[j] = tempReject;
                    }
                }
            }

            return (approvedDonations, approveVotes, rejectVotes);
        } else {
            // 获取所有失败的捐赠
            uint rejectedCount = 0;
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                if (getDonationStatus(_donations.donationIds[i]) == DonationStatus.isRejected) {
                    rejectedCount++;
                }
            }

            // 初始化失败的捐赠数组
            Donation[] memory rejectedDonations = new Donation[](rejectedCount);
            uint[] memory approveVotes = new uint[](rejectedCount);
            uint[] memory rejectVotes = new uint[](rejectedCount);

            uint index = 0;
            // 填充失败的捐赠信息和票数
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                uint donationId = _donations.donationIds[i];
                if (getDonationStatus(donationId) == DonationStatus.isRejected) {
                    rejectedDonations[index] = _donations.getDonationWithId[donationId];
                    uint numOfApproval = 0;
                    uint numOfReject = 0;
                    Vote[] memory votes = _votes.getVoteWithAddressAndId[donationId];
                    for (uint j = 0; j < votes.length; j++) {
                        if (votes[j].status == VoteBehavior.reject) {
                            numOfReject++;
                        } else if (votes[j].status == VoteBehavior.approve) {
                            numOfApproval++;
                        }
                    }
                    approveVotes[index] = numOfApproval;
                    rejectVotes[index] = numOfReject;
                    index++;
                }
            }

            // 对失败的捐赠按照反对票数从高到低，若相同则按照赞成票数从低到高进行排序
            for (uint i = 0; i < rejectedCount; i++) {
                for (uint j = i + 1; j < rejectedCount; j++) {
                    if (
                        rejectVotes[i] < rejectVotes[j] ||
                        (rejectVotes[i] == rejectVotes[j] && approveVotes[i] > approveVotes[j])
                    ) {
                        // 交换捐赠信息
                        Donation memory tempDonation = rejectedDonations[i];
                        rejectedDonations[i] = rejectedDonations[j];
                        rejectedDonations[j] = tempDonation;

                        // 交换赞成票数和反对票数
                        uint tempApprove = approveVotes[i];
                        approveVotes[i] = approveVotes[j];
                        approveVotes[j] = tempApprove;

                        uint tempReject = rejectVotes[i];
                        rejectVotes[i] = rejectVotes[j];
                        rejectVotes[j] = tempReject;
                    }
                }
            }

            return (rejectedDonations, approveVotes, rejectVotes);
        }
    }

    // 获取赞成票数
    function getApproveVoteCount(uint donationId) internal view returns (uint) {
        Vote[] memory votes = _votes.getVoteWithAddressAndId[donationId];
        uint approveCount = 0;
        for (uint i = 0; i < votes.length; i++) {
            if (votes[i].status == VoteBehavior.approve) {
                approveCount++;
            }
        }
        return approveCount;
    }

    // 获取反对票数
    function getRejectVoteCount(uint donationId) internal view returns (uint) {
        Vote[] memory votes = _votes.getVoteWithAddressAndId[donationId];
        uint rejectCount = 0;
        for (uint i = 0; i < votes.length; i++) {
            if (votes[i].status == VoteBehavior.reject) {
                rejectCount++;
            }
        }
        return rejectCount;
    }


    // 所有用户的地址
    function getUserAddresses() public view returns (address[] memory) {
        return _votes.userAddresses;
    }

    // 最大投票次数
    function getMaxVotingTimes() public view returns (uint) {
        return _votes.maxVotingTimes;
    }

    // 初次投票需要消耗的金币数量gold
    function getGoldConsumedByVote() public view returns (uint) {
        return _votes.goldConsumedByVote;
    }

    // 多次投票需要消耗的金币数量gold（动态）
    function updateGetGoldConsumedByVote(uint donationId) public view returns (uint) {
        uint voteCount = _userVotes[msg.sender][donationId].length;
        return 100 * (2 ** voteCount);
    }
}