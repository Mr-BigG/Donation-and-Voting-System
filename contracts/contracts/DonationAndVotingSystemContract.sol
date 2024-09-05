// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./GoldContract.sol";
import "./AwardContract.sol";
import "./StringHelper.sol";

/*

*/

// 合约：捐赠与投票系统合约
contract DonationAndVotingSystemContract {

    using Counters for Counters.Counter;

    // 捐赠的结构structure
    struct Donation {
        uint id; // 捐赠的ID
        string content; // 捐赠的内容
        address sender; // 捐赠的发起人
        uint vote_start_time; // 捐赠的发起时间
        uint vote_end_time; // 捐赠的结束时间
        bool is_get_gold_reward; // 是否已领取金币奖励（捐赠通过后的奖励，也就是筹集到的款）
        bool is_valid; // 捐赠是否存在
    }

    // 所有捐赠的结构structure
    struct Donations {
        mapping(uint => Donation) get_donation_with_id; // mapping映射
        uint[] donation_ids; // 所有捐赠的id
        uint gold_consume_by_donation; // 发起捐赠需要消耗的金币数量
        Counters.Counter donation_id_counter; // 捐赠id的计数器
    }

    // 捐赠的状态，枚举类型
    enum DonationStatus {
        is_being_voted_on, // 正在投票中
        is_rejected, // 投票结束：拒绝
        is_approved, // 投票结束：同意
        not_started_yet // 投票未开始
    }

    // 投票的结构structure
    struct Vote {
        VoteStatus status; // 投票的状态
        address voter; // 投票人
        uint vote_time; // 投票时间
        uint donation_id_voted_on; // 投票的对象
    }

    // 所有投票的结构structure
    struct Votes {
        mapping(address => mapping(uint => Vote[])) get_vote_with_address_and_id; // 所有投票的信息
        address[] user_addresses; // 用来存储所有用户的地址
        uint max_voting_times; // 最大投票次数
        uint gold_consume_by_vote; // 投票需要消耗的金币数量
    }

    // 投票的状态，枚举类型
    enum VoteStatus {
        approve, // 同意
        reject // 拒绝
    }

    // 其它变量
    Donations private _donations; // 表示所有捐赠的信息
    Votes private _votes; // 表示所有投票的信息
    GoldContract public gold; // 本系统的货币：金币（即通证积分）
    AwardContract public awards; // 纪念品(奖励)

    // 构造函数
    constructor(uint max_voting_times, uint gold_consumed_by_donation, uint gold_consumed_by_vote, uint initIal_user_gold) {
        _donations.gold_consume_by_donation = gold_consumed_by_donation; // 发起捐赠需要消耗的金币数量
        _votes.max_voting_times = max_voting_times; //最大投票次数
        _votes.gold_consume_by_vote = gold_consumed_by_vote; // 每个投票需要消耗的金币数量
        gold = new GoldContract("GoldCoin", "gold", initIal_user_gold); //一键发金币
        awards = new AwardContract("Awards", "awards"); //一键发纪念品（奖励）
    }

    // 发起一个新的捐赠
    function addNewDonation(string calldata content, uint start_time, uint end_time) public {
        require(start_time < end_time, "开始时间必须小于结束时间");
        require(end_time > block.timestamp, "结束时间必须在未来");
        require(gold.balanceOf(msg.sender) >= _donations.gold_consume_by_donation, "余额不足，无法提起新的捐赠");
        require(gold.allowance(msg.sender, address(this)) >= _donations.gold_consume_by_donation, "系统对你的金币没有权限。请授权。");

        gold.transferFrom(msg.sender, address(this), _donations.gold_consume_by_donation); // 委托本合约把用户的金币转账给本合约（需要前端提前委托）

        uint new_id = _donations.donation_id_counter.current(); // 获取新id
        Donation memory new_donation = Donation({
            id: new_id, //捐赠的id
            content: content, // 捐赠的内容
            sender: msg.sender, // 捐赠的发起人
            vote_start_time: start_time, //捐赠的投票开始时间
            vote_end_time: end_time, //捐赠的投票结束时间
            is_get_gold_reward: false, // 是否已领取金币奖励
            is_valid: true // 捐赠是否存在或有效
        });
        _donations.get_donation_with_id[new_id] = new_donation; //添加一个捐赠
        _donations.donation_ids.push(new_id); // 添加一个新的id
        _donations.donation_id_counter.increment(); // id的自增

        uint i;
        bool is_sender_in_user_addresses = false; // 检查当前的捐赠发起人地址是否已经存储
        for (i = 0; i < _votes.user_addresses.length; i++) {
            if (_votes.user_addresses[i] == msg.sender) {
                is_sender_in_user_addresses = true;
                break;
            }
        }
        // 当前捐赠的发起人的地址不存在
        if (!is_sender_in_user_addresses) {
            _votes.user_addresses.push(msg.sender); // 添加一个新的地址
        }
    }

    // 捐赠的所有id
    function getDonationIds() public view returns (uint[] memory) {
        return _donations.donation_ids;
    }

    // 用户的捐赠的所有id
    function getUserDonationIds() public view returns (uint[] memory) {
        uint count = 0; // 计数器，表明某个用户共有多少捐赠
        uint i;
        for (i = 0; i < _donations.donation_ids.length; i++) {
            if (_donations.get_donation_with_id[_donations.donation_ids[i]].sender == msg.sender) {
                count++; // 每找到此用户的一个捐赠，计数器自增
            }
        }

        uint[] memory ids = new uint[](count); // 用来存储用户的所有捐赠的id
        count = 0;
        for (i = 0; i < _donations.donation_ids.length; i++) {
            if (_donations.get_donation_with_id[_donations.donation_ids[i]].sender == msg.sender) {
                ids[count] = _donations.donation_ids[i];
                count++;
            }
        }

        return ids;
    }

    // 捐赠的信息
    function getDonationInfo(uint id, uint time_now) public view returns (string memory, address, uint, uint, uint) {
        require(_donations.get_donation_with_id[id].is_valid == true, "这个捐赠不存在"); // 判断该捐赠是否存在

        uint status = uint(getDonationStatus(id, time_now)); // 捐赠的状态
        string memory content = _donations.get_donation_with_id[id].content; // 捐赠的内容
        address sender = _donations.get_donation_with_id[id].sender; // 捐赠的发起人
        uint vote_start_time = _donations.get_donation_with_id[id].vote_start_time; // 捐赠的发起时间
        uint vote_end_time = _donations.get_donation_with_id[id].vote_end_time; // 捐赠的结束时间

        return (content, sender, vote_start_time, vote_end_time);
    }

    // 发布捐赠需要消耗的金币数量
    function getGoldConsumeByDonation() public view returns (uint) {
        return _donations.gold_consume_by_donation;
    }

    // 捐赠的状态
    function getDonationStatus(uint id) public view returns (DonationStatus) {
        require(_donations.get_donation_with_id[id].is_valid == true, "这个捐赠不存在");

        // 检查是否超时
        if (block.timestamp > _donations.get_donation_with_id[id].vote_end_time) {
            // 超时，统计投票情况
            uint num_of_approval = 0; // 赞成
            uint num_of_reject = 0; // 反对
            uint i;
            for (i = 0; i < _votes.user_addresses.length; i++) {
                Vote[] memory user_votes = _votes.get_vote_with_address_and_id[_votes.user_addresses[i]][id];
                if (user_votes.length > 0) {
                    // 当前用户对该捐赠进行了投票
                    Vote memory user_vote = user_votes[user_votes.length - 1];
                    if (user_vote.status == VoteStatus.approve) {
                        num_of_approval++;
                    } else if (user_vote.status == VoteStatus.reject) {
                        num_of_reject++;
                    }
                }
            }

            // 赞成数量多于反对数量
            if (num_of_approval > num_of_reject) {
                // 捐赠通过
                return DonationStatus.is_approved;
            } else {
                // 捐赠未通过
                return DonationStatus.is_rejected;
            }
        } else {
            if (block.timestamp < _donations.get_donation_with_id[id].vote_start_time) {
                // 捐赠的投票还没开始
                return DonationStatus.not_started_yet;
            } else {
                // 捐赠正在投票中
                return DonationStatus.is_being_voted_on;
            }
        }
    }

    // 捐赠状态（使用外部传入的时间戳）
    function getDonationStatus(uint id, uint time_now) public view returns (DonationStatus) {
        require(_donations.get_donation_with_id[id].is_valid == true, "这个捐赠不存在");

        // 检查捐赠是否超时
        if (time_now > _donations.get_donation_with_id[id].vote_end_time) {
            // 超时，统计捐赠情况
            uint num_of_approval = 0; // 赞成
            uint num_of_reject = 0; // 反对
            uint i;
            for (i = 0; i < _votes.user_addresses.length; i++) {
                Vote[] memory user_votes = _votes.get_vote_with_address_and_id[_votes.user_addresses[i]][id];
                if (user_votes.length > 0) {
                    // 当前用户对该捐赠进行了投票
                    Vote memory user_vote = user_votes[user_votes.length - 1];
                    if (user_vote.status == VoteStatus.approve) {
                        num_of_approval++;
                    } else if (user_vote.status == VoteStatus.reject) {
                        num_of_reject++;
                    }
                }
            }

            if (num_of_approval > num_of_reject) {
                // 捐赠通过
                return DonationStatus.is_approved;
            } else {
                // 捐赠未通过
                return DonationStatus.is_rejected;
            }
        } else {
            if (time_now < _donations.get_donation_with_id[id].vote_start_time) {
                // 捐赠的投票还没开始
                return DonationStatus.not_started_yet;
            } else {
                // 捐赠正在投票中
                return DonationStatus.is_being_voted_on;
            }
        }
    }

    // 用户是否可以领取gold金币奖励
    function getGoldRewardFromDonationApproved(uint id) public {
        require(getWhetherUserCanGetAward(id, block.timestamp) == true, "由于一些原因，你无法获得金币奖励");

        _donations.get_donation_with_id[id].is_get_gold_reward = true;
        // 统计捐赠情况
        uint num_of_approval = 0; // 赞成
        uint num_of_reject = 0; // 反对
        uint i;
        for (i = 0; i < _votes.user_addresses.length; i++) {
            Vote[] memory user_votes = _votes.get_vote_with_address_and_id[_votes.user_addresses[i]][id];
            if (user_votes.length > 0) {
                // 当前用户对捐赠进行了投票
                Vote memory user_vote = user_votes[user_votes.length - 1];
                if (user_vote.status == VoteStatus.approve) {
                    num_of_approval++;
                } else if (user_vote.status == VoteStatus.reject) {
                    num_of_reject++;
                }
            }
        }

        // 给捐赠发起人发放奖励（捐赠发起人所缴纳的金币gold + 该捐赠投票(赞成+反对)所得的所有金币gold）
        gold.transfer(_donations.get_donation_with_id[id].sender, (num_of_approval + num_of_reject) * _votes.gold_consume_by_vote + _donations.gold_consume_by_donation);
    }

    // 用户是否可以领取纪念品奖励
    function getWhetherUserCanGetAward(uint time_now) public view returns (bool) {
        // 检查捐赠发起人捐赠提议的数量
        uint[] memory ids = getUserDonationIds();
        uint i;
        uint num_of_donation_approved = 0;
        for (i = 0; i < ids.length; i++) {
            if (getDonationStatus(ids[i], time_now) == DonationStatus.is_approved) {
                num_of_donation_approved++;
            }
        }

        // 捐赠发起人是否有3个及以上的成功捐赠
        if (num_of_donation_approved >= 3) {
            // 每3个捐赠发放一次纪念品（奖励）
            uint num_of_award = num_of_donation_approved / 3;
            uint j;
            for (j = 0; j <= num_of_award; j++) {
                // 检查是否已经领取过某种纪念品（奖励）
                if (awards.getWhetherUserCanGetAward(msg.sender, StringHelper.sprintf("成就：已批准 %u 个捐赠", j * 3))) {
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
    function getAward() public {
        require(getWhetherUserCanGetAward(block.timestamp) == true, "由于一些原因，你无法获得金币奖励");

        // 捐赠发起人的成功捐赠的数量
        uint[] memory ids = getUserDonationIds();
        uint i;
        uint num_of_donation_approved = 0;
        for (i = 0; i < ids.length; i++) {
            if (getDonationStatus(ids[i]) == DonationStatus.is_approved) {
                num_of_donation_approved++;
            }
        }

        // 检查捐赠的发起人是否有3个及以上的成功捐赠
        if (num_of_donation_approved >= 3) {
            // 每3个捐赠发放一次纪念品
            uint num_of_award = num_of_donation_approved / 3;
            uint j;
            for (j = 0; j <= num_of_award; j++) {
                // 是否已经领取过某种纪念品
                if (awards.getWhetherUserCanGetAward(msg.sender, StringHelper.sprintf("成就：已批准 %u 个捐赠", j * 3))) {
                    awards.awardItem(msg.sender, StringHelper.sprintf("成就：已批准 %u 个捐赠", j * 3));
                } else {
                    continue;
                }
            }
        }
    }

    // 发起一个新的投票
    function voteOnDonation(uint user_vote, uint id) public {
        require(getDonationStatus(id) == DonationStatus.is_being_voted_on, "投票已关闭，无法投票");
        require(_votes.get_vote_with_address_and_id[msg.sender][id].length < _votes.max_voting_times, "已超过最大投票次数，无法投票");
        require(gold.balanceOf(msg.sender) >= _votes.gold_consume_by_vote, "余额不足，无法投票");
        require(gold.allowance(msg.sender, address(this)) >= _votes.gold_consume_by_vote, "系统对你的金币没有权限。请授权。");

        gold.transferFrom(msg.sender, address(this), _votes.gold_consume_by_vote); // 委托本合约把用户的金币gold转账给本合约（需要前端提前委托）

        Vote memory new_vote = Vote({
            status: VoteStatus(user_vote), // 投票状态
            voter: msg.sender, // 投票人
            vote_time: block.timestamp, // 投票时间
            donation_id_voted_on: id // 投票对象
        });

        _votes.get_vote_with_address_and_id[msg.sender][id].push(new_vote); // 添加一个新的投票

        uint i;
        bool is_sender_in_user_addresses = false; // 当前投票人地址是否已经存储
        for (i = 0; i < _votes.user_addresses.length; i++) {
            if (_votes.user_addresses[i] == msg.sender) {
                is_sender_in_user_addresses = true;
                break;
            }
        }
    }

    // 用户投票信息
    function getUserVotesInfo() public view returns (uint[] memory, uint[] memory, uint[] memory) {
        uint i;
        uint j;
        uint count = 0;
        for (i = 0; i < _donations.donation_ids.length; i++) {
            Vote[] memory user_votes = _votes.get_vote_with_address_and_id[msg.sender][_donations.donation_ids[i]];
            if (user_votes.length > 0) {
                for (j = 0; j < user_votes.length; j++) {
                    count++;
                }
            }
        }

        uint[] memory status = new uint[](count); // 投票的状态
        uint[] memory vote_time = new uint[](count); // 投票的时间
        uint[] memory donation_id_voted_on = new uint[](count); // 投票的对象

        count = 0;
        for (i = 0; i < _donations.donation_ids.length; i++) {
            Vote[] memory user_votes = _votes.get_vote_with_address_and_id[msg.sender][_donations.donation_ids[i]];
            if (user_votes.length > 0) {
                for (j = 0; j < user_votes.length; j++) {
                    status[count] = uint(user_votes[j].status);
                    vote_time[count] = user_votes[j].vote_time;
                    donation_id_voted_on[count] = user_votes[j].donation_id_voted_on;
                    count++;
                }
            }
        }

        return (status, vote_time, donation_id_voted_on);
    }

    // 指定id的捐赠的投票信息
    function getDonationVotesInfo(uint id, uint time_now) public view returns (uint[] memory, uint[] memory, address[] memory) {
        uint i;
        uint count = 0;
        for (i = 0; i < _votes.user_addresses.length; i++) {
            Vote[] memory user_votes = _votes.get_vote_with_address_and_id[_votes.user_addresses[i][id]];
            if (user_votes.length > 0) {
                count++;
            }
        }

        uint[] memory status = new uint[](count);
        uint[] memory vote_time = new uint[](count);
        address[] memory voter = new address[](count);

        count = 0;

        for (i = 0; i < _votes.user_addresses.length; i++) {
            Vote[] memory user_votes = _votes.get_vote_with_address_and_id[_votes.user_addresses[i]][id];
            if (user_votes.length > 0) {
                status[count] = uint(user_votes[user_votes.length - 1].status);
                vote_time[count] = user_votes[user_votes.length - 1].vote_time;
                voter[count] = user_votes[user_votes.length - 1].voter;
                count++;
            }
        }

        if ((msg.sender == _donations.get_donation_with_id[id].sender) || (getDonationStatus(id, time_now) != DonationStatus.is_being_voted_on)) {
            return (status, vote_time, voter);
        } else {
            vote_time = new uint[](count); // 全为0
            voter = new address[](count); // 全为0
            return (status, vote_time, voter);
        }
    }

    // 所有用户的地址
    function getUserAddresses() public view returns (address[] memory) {
        return _votes.user_addresses;
    }

    // 最大投票次数
    function getMaxVotingTimes() public view returns (uint) {
        return _votes.max_voting_times;
    }

    // 投票需要消耗的金币数量gold
    function getGoldConsumedByVote() public view returns (uint) {
        return _votes.gold_consume_by_vote;
    }
}
