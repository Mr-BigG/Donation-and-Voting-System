// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./GoldContract.sol";
import "./AwardContract.sol";
import "./StringHelper.sol";

// 合约：捐赠与投票系统合约 / Contract: DonationAndVotingSystemContract
contract DonationAndVotingSystemContract {

    using Counters for Counters.Counter;

    // 捐赠的结构structure / The structure of donation
    struct Donation {
        uint id; // 捐赠的ID / ID of donation
        string content; // 捐赠的内容 / Content of donation
        address creator; // 捐赠的发起人 / Creator of donation
        uint voteStartTime; // 捐赠的发起时间 / The start time of creating a donation
        uint voteEndTime; // 捐赠的结束时间 / The end time of creating a donation
        bool isGoldRewardGotten; // 是否已领取金币奖励（捐赠通过后的奖励，也就是筹集到的款） / Whether the gold reward has been claimed (the reward after the donation is approved, that is, the money raised)
        bool isValid; // 捐赠是否存在 / Existence of donation
    }

    // 所有捐赠的结构structure / The structure of all donations
    struct Donations {
        mapping(uint => Donation) getDonationWithId; // mapping映射 / Mapping relationship
        uint[] donationIds; // 所有捐赠的id / Id of all donations
        uint goldConsumedByDonation; // 发起捐赠需要消耗的金币数量 / The amount of gold to be spent to initiate a donation
        Counters.Counter donationIdCounter; // 捐赠id的计数器 / The counter of donation's id
    }

    // 捐赠的状态，枚举类型 / The status of donation, enumeration type
    enum DonationStatus {
        isBeingVotedOn, // 正在投票中 / Voting is processing
        isRejected, // 投票结束：拒绝 / Voting closed, rejected
        isApproved, // 投票结束：同意 / Voting closed, approval
        notStartedYet // 投票未开始 / Voting has not started
    }

    // 投票的结构structure / The structure of vote
    struct Vote {
        VoteBehavior status; // 投票的状态 / The status of vote
        address voter; // 投票人 / Voter
        uint voteTime; // 投票时间 / The voting time
        uint donationIdVotedOn; // 投票的对象 / Subject of vote
    }

    // 所有投票的结构structure / The structure of all votes
    struct Votes {
        mapping(uint => Vote[]) getVoteWithAddressAndId; // 所有投票的信息 / Information of all votes
        address[] userAddresses; // 用来存储所有用户的地址 / Used to store the addresses of all users
        uint maxVotingTimes; // 最大投票次数 / The max voting times
        uint goldConsumedByVote; // 投票需要消耗的金币数量 / The number of coins to be spent to vote
    }

    // 投票的状态，枚举类型 / The status of vote, enumeration type
    enum VoteBehavior {
        reject, // 拒绝 / Reject
        approve // 同意 / Approve
    }

    // 其它变量 / Other variables
    Donations private _donations; // 表示所有捐赠的信息 / Represents all donation information
    Votes private _votes; // 表示所有投票的信息 / Represents all vote information
    GoldContract public gold; // 本系统的货币：金币 / Currency of the system: gold
    AwardContract public awards; // 纪念品(奖励) / Souvenirs (Rewards)

    address public admin; // 合约管理员（创建者） / Contract administrator (Creator)

    // 直接存储用户的投票记录，映射: 用户地址 -> 捐赠ID -> 投票数组 / Directly store the voting record of the user, map: User address -> Donation ID -> Voting array
    mapping(address => mapping(uint => Vote[])) private _userVotes;

    // 构造函数 / constructor
    constructor(uint maxVotingTimes, uint goldConsumedByDonation, uint goldConsumedByVote, uint initIalUserGold) {
        admin = msg.sender; // 合约创建者的地址 / The address of the contract creator
        _donations.goldConsumedByDonation = goldConsumedByDonation; // 发起捐赠需要消耗的金币数量 / The amount of gold to be spent to initiate a donation
        _votes.maxVotingTimes = maxVotingTimes; // 最大投票次数 / Maximum number of votes
        _votes.goldConsumedByVote = goldConsumedByVote; // 每个投票需要消耗的金币数量 / The number of coins to be spent per vote
        gold = new GoldContract("GoldCoin", "gold", initIalUserGold); // 一键兑换金币 / One click to exchange gold coins
        awards = new AwardContract("Awards", "awards"); // 一键发纪念品（奖励） / Send Souvenirs (Rewards) with one click
    }

    // 发起一个新的捐赠 / Add a new donation
    function addNewDonation(string calldata content, uint startTime, uint endTime) public {
        // Solidity需要将中文进行unicode转码 / Solidity requires unicode transcoding of Chinese
        require(startTime < endTime, "The start time must be younger than the end time.");
        require(endTime > block.timestamp, "The end time must be in the future.");
        require(gold.balanceOf(msg.sender) >= _donations.goldConsumedByDonation, "The balance is insufficient to create new donations.");
        require(gold.allowance(msg.sender, address(this)) >= _donations.goldConsumedByDonation, "The system has no access to your coins. Please authorize.");

        gold.transferFrom(msg.sender, address(this), _donations.goldConsumedByDonation); // 委托本合约把用户的金币转账给本合约 / Entrusts the Contract to transfer the user's gold coins to the Contract

        uint newId = _donations.donationIdCounter.current(); // 获取新id / Get new id
        Donation memory newDonation = Donation({
            id: newId, // 捐赠的id / Id of donation
            content: content, // 捐赠的内容 / Content of donation
            creator: msg.sender, // 捐赠的发起人 / Creator of donation
            voteStartTime: startTime, // 捐赠的投票开始时间 / The start time of donation
            voteEndTime: endTime, // 捐赠的投票结束时间 / The end time of donation
            isGoldRewardGotten: false, // 是否已领取金币奖励 / Whether the gold reward has been claimed
            isValid: true // 捐赠是否存在或有效 / Whether the donation is present or valid
        });
        _donations.getDonationWithId[newId] = newDonation; // 添加一个捐赠 / Add a new donation
        _donations.donationIds.push(newId); // 添加一个新的id // Add a new id
        _donations.donationIdCounter.increment(); // id的自增 // The id increases automatically

        uint i;
        bool isSenderInUserAddresses = false; // 检查当前的捐赠发起人地址是否已经存储 // Check that the current donation sponsor address is already stored
        for (i = 0; i < _votes.userAddresses.length; i++) {
            if (_votes.userAddresses[i] == msg.sender) {
                isSenderInUserAddresses = true;
                break;
            }
        }
        // 当前捐赠的发起人的地址不存在 / The address of the initiator of the current donation does not exist
        if (!isSenderInUserAddresses) {
            _votes.userAddresses.push(msg.sender); // 添加一个新的地址 / Add a new address
        }
    }

    // 捐赠的所有id / Get id of all donations
    function getDonationIds() public view returns (uint[] memory) {
        return _donations.donationIds;
    }

    // 用户的捐赠的所有id / get user's all donation ids
    function getUserDonationIds() public view returns (uint[] memory) {
        uint count = 0; // 计数器，表明某个用户共有多少捐赠 / A counter that indicates how many donations a user has
        uint i;
        for (i = 0; i < _donations.donationIds.length; i++) {
            if (_donations.getDonationWithId[_donations.donationIds[i]].creator == msg.sender) {
                count++; // 每找到此用户的一个捐赠，计数器自增 / Each time a donation from this user is found, the counter increases
            }
        }

        uint[] memory ids = new uint[](count); // 用来存储用户的所有捐赠的id / The id used to store all of the user's donations
        count = 0;
        for (i = 0; i < _donations.donationIds.length; i++) {
            if (_donations.getDonationWithId[_donations.donationIds[i]].creator == msg.sender) {
                ids[count] = _donations.donationIds[i];
                count++;
            }
        }

        return ids;
    }

    // 捐赠的信息 / Get information of a donation
    function getDonationInformation(uint id, uint timeNow) public view returns (string memory, address, uint, uint, uint) {
        require(_donations.getDonationWithId[id].isValid == true, "This donation does not exist."); // 判断该捐赠是否存在 / Determine whether the donation exists

        uint status = uint(getDonationStatus(id, timeNow)); // 捐赠的状态 / The status of donation
        string memory content = _donations.getDonationWithId[id].content; // 捐赠的内容 / The content of donation
        address creator = _donations.getDonationWithId[id].creator; // 捐赠的发起人 / The creator of donation
        uint voteStartTime = _donations.getDonationWithId[id].voteStartTime; // 捐赠的发起时间 / The start time of donation
        uint voteEndTime = _donations.getDonationWithId[id].voteEndTime; // 捐赠的结束时间 / The endtime of donation

        return (content, creator, voteStartTime, voteEndTime, status);
    }

    // 发布捐赠需要消耗的金币数量 / Publish the amount of coins to be spent for donations
    function getGoldConsumedByDonation() public view returns (uint) {
        return _donations.goldConsumedByDonation;
    }

    // 捐赠的状态 / Get the donation status
    function getDonationStatus(uint id) public view returns (DonationStatus) {
        require(_donations.getDonationWithId[id].isValid == true, "This donation does not exist.");

        // 检查是否超时 / Check for timeout
        if (block.timestamp > _donations.getDonationWithId[id].voteEndTime) {
            // 超时，统计投票情况 / Timed out, counting votes
            uint numOfApproval = 0; // 赞成 / approval
            uint numOfReject = 0; // 反对 / rejected
            uint i;
            Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
            for (i = 0; i < votes.length; i++) {
                if (votes[i].status == VoteBehavior.approve) {
                    numOfApproval++;
                } else if (votes[i].status == VoteBehavior.reject) {
                    numOfReject++;
                }
            }

            // 赞成数量多于反对数量 / The pros outnumber the cons
            if (numOfApproval > numOfReject) {
                // 捐赠通过 / Approval
                return DonationStatus.isApproved;
            } else {
                // 捐赠未通过 / Rejected
                return DonationStatus.isRejected;
            }
        } else {
            if (block.timestamp < _donations.getDonationWithId[id].voteStartTime) {
                // 捐赠的投票还没开始 / Not started yet
                return DonationStatus.notStartedYet;
            } else {
                // 捐赠正在投票中 / Being voted on
                return DonationStatus.isBeingVotedOn;
            }
        }
    }

    // 捐赠状态（使用外部传入的时间戳） / Get donation status (using external incoming timestamp)
    function getDonationStatus(uint id, uint timeNow) public view returns (DonationStatus) {
        require(_donations.getDonationWithId[id].isValid == true, "This donation does not exist.");

        // 检查捐赠是否超时 / Check if the donation is timed out
        if (timeNow > _donations.getDonationWithId[id].voteEndTime) {
            // 超时，统计捐赠情况 / Time out, counting donations
            uint numOfApproval = 0; // 赞成 / Approval
            uint numOfReject = 0; // 反对 / Rejected
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
                // 捐赠通过 // Approval
                return DonationStatus.isApproved;
            } else {
                // 捐赠未通过 // Rejected
                return DonationStatus.isRejected;
            }
        } else {
            if (timeNow < _donations.getDonationWithId[id].voteStartTime) {
                // 捐赠的投票还没开始 / Not started yet
                return DonationStatus.notStartedYet;
            } else {
                // 捐赠正在投票中 / Being Voted on
                return DonationStatus.isBeingVotedOn;
            }
        }
    }

    // 用户是否可以领取gold奖励 / Whether the user can claim a gold reward
    function getWhetherUserCanGetGoldReward(uint id, uint timeNow) public view returns (bool) {
        require(_donations.getDonationWithId[id].isValid == true, "This donation does not exist.");

        if (_donations.getDonationWithId[id].creator != msg.sender) {
            return false;
        }

        if (getDonationStatus(id, timeNow) == DonationStatus.isApproved && _donations.getDonationWithId[id].isGoldRewardGotten == false) {
            return true;
        } else {
            return false;
        }
    }


    // 领取gold金币奖励 / Claim the gold coin reward
    function getGoldRewardFromDonationApproved(uint id) public {
        require(getWhetherUserCanGetGoldReward(id, block.timestamp) == true, "For some reason, you can't get gold rewards.");

        _donations.getDonationWithId[id].isGoldRewardGotten = true;
        // 统计捐赠情况 / Statistics on donations
        uint numOfApproval = 0; // 赞成 / Approval
        uint numOfReject = 0; // 反对 / Rejected
        uint i;
        Vote[] memory votes = _votes.getVoteWithAddressAndId[id];
        for (i = 0; i < votes.length; i++) {
            if (votes[i].status == VoteBehavior.approve) {
                numOfApproval++;
            } else if (votes[i].status == VoteBehavior.reject) {
                numOfReject++;
            }
        }

        // 虽然投票的花费会越来越多，但是用户获得的gold和花费的金额是不一样的，这样是为了确保公平，保证某个donation不会获得过多的approval votes / Although the cost of voting will increase, the amount of gold received by users will not be the same as the amount spent. This is to ensure fairness and ensure that a donation will not receive too many approval votes
        // 给捐赠发起人发放奖励（捐赠发起人所缴纳的金币gold + 该捐赠投票(赞成+反对)所得的所有金币gold） / Give a reward to the sponsor of the donation (gold coins paid by the sponsor of the donation + all gold coins received from the donation vote (yes + no))
        gold.transfer(_donations.getDonationWithId[id].creator, (numOfApproval + numOfReject) * _votes.goldConsumedByVote + _donations.goldConsumedByDonation);
    }

    // 用户是否可以领取纪念品奖励 / Whether users can receive souvenir rewards
    function getWhetherUserCanGetAwardReward(uint timeNow) public view returns (bool) {
        // 捐赠发起人成功捐赠的数量 / The number of successful donations made by the sponsor
        uint[] memory ids = getUserDonationIds();
        uint j;
        uint numOfDonationsApproved = 0;
        for (j = 0; j < ids.length; j++) {
            if (getDonationStatus(ids[j], timeNow) == DonationStatus.isApproved) {
                numOfDonationsApproved++;
            }
        }

        // 检查捐赠发起人是否有3个及以上的成功捐赠 / Check if the donor sponsor has 3 or more successful donations
        if (numOfDonationsApproved >= 3) {
            // 每3个捐赠发放一次纪念品（奖励） / Souvenir (bonus) for every 3 donations
            uint numOfAward = numOfDonationsApproved / 3;
            uint i;
            for (i = 1; i <= numOfAward; i++) {
                if (awards.getWhetherUserCanGetAwardReward(msg.sender, StringHelper.sprintf("Achievements: %u donations approved", i * 3))) {
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

    // 纪念品（奖励） / Souvenirs (Rewards)
    function getAwardReward() public {
        require(getWhetherUserCanGetAwardReward(block.timestamp) == true, "For some reason, you can't get gold rewards.");

        // 捐赠发起人的成功捐赠的数量 / The number of successful donations made by the donor sponsor
        uint[] memory ids = getUserDonationIds();
        uint i;
        uint numOfDonationApproved = 0;
        for (i = 0; i < ids.length; i++) {
            if (getDonationStatus(ids[i]) == DonationStatus.isApproved) {
                numOfDonationApproved++;
            }
        }

        // 检查捐赠的发起人是否有3个及以上的成功捐赠 / Check if the sponsor of the donation has 3 or more successful donations
        if (numOfDonationApproved >= 3) {
            // 每3个捐赠发放一次纪念品 / Souvenirs are given out every 3 donations
            uint numOfAward = numOfDonationApproved / 3;
            uint j;
            for (j = 1; j <= numOfAward; j++) {
                // 是否已经领取过某种纪念品 / Whether you have received a souvenir of some kind
                // 成就：已批准 %u 个捐赠 => \u6210\u5c31\uff1a\u5df2\u6279\u51c6 %u \u4e2a\u6350\u8d60
                if (awards.getWhetherUserCanGetAwardReward(msg.sender, StringHelper.sprintf("Achievements: %u donations approved", j * 3))) {
                    awards.awardItem(msg.sender, StringHelper.sprintf("Achievements: %u donations approved", j * 3));
                } else {
                    continue;
                }
            }
        }
    }


    error ExceededMaxVotes(uint maxVotes);
    event VoteRejected(string reason);

    // 检查是否到达最大投票次数 / Check whether the maximum number of votes has been reached
    function checkWhetherReachedTheMaxVotingTimes(uint id) view public returns (bool) {
        Vote[] storage userVotes = _userVotes[msg.sender][id];
        if (userVotes.length >= _votes.maxVotingTimes) {
            return false;
        }
        return true;
    }

    // 检查投票逻辑 / Check voting logic
    function checkVotingConditions(uint donationId, uint userVote) public view returns (bool) {
        Vote[] storage userVotes = _userVotes[msg.sender][donationId];
        VoteBehavior behavior = VoteBehavior(userVote);
        bool isFirstVote = userVotes.length == 0; // 是否为第一次投票 / Whether to vote for the first time

        if (isFirstVote) {
            // 如果是第一次投票，返回 true / Return true if voting is the first time
            return true;
        }

        // 如果不是第一次投票，检查历史投票 / If you are not voting for the first time, check the historical vote
        for (uint i = 0; i < userVotes.length; i++) {
            if (behavior == VoteBehavior.reject && userVotes.length == 1 && userVotes[i].status == VoteBehavior.reject) {
                // 如果是reject 投票，且之前投过一次拒绝票，不能再次reject / If a reject vote is cast, and a reject vote has been cast once before, it cannot be rejected again
                return false;
            }
            if (behavior == VoteBehavior.approve && userVotes[i].status == VoteBehavior.reject) {
                // 如果是 approve 投票，且之前有 reject，不能投 approve / If it is a approve vote and there is a reject before it, you cannot vote approve
                return false;
            }
            if (behavior == VoteBehavior.reject && userVotes[i].status == VoteBehavior.approve) {
                // 如果是 reject 投票，且之前有 approve，不能投 reject / If the vote is reject, and there is a approve before it, you cannot vote reject
                return false;
            }
        }

        // 所有检查通过，允许投票 / All checks passed. Voting allowed
        return true;
    }

    // 记录用户投票 / Record user votes
    function recordUserVote(uint donationId, uint userVote) public {
        VoteBehavior behavior = VoteBehavior(userVote);
        _userVotes[msg.sender][donationId].push(Vote({
            status: behavior,
            voter: msg.sender,
            voteTime: block.timestamp,
            donationIdVotedOn: donationId
        }));
    }

    // 检查用户的余额是否支持投票 / Check whether the user's balance supports voting
    function checkWhetherHaveEnoughGoldToVote(uint cost) public view returns (bool) {
        if (gold.balanceOf(msg.sender) < cost) {
            return false;
        } else {
            return true;
        }
    }

    // 发起一个新的投票 / Initiate a new vote
    function voteOnDonation(uint userVote, uint id) public {
        require(getDonationStatus(id) == DonationStatus.isBeingVotedOn, "The vote is closed. You can't vote.");
        // 获取用户对当前捐赠的投票次数 / Gets the number of votes a user has on the current donation
        uint currentVoteCount = _userVotes[msg.sender][id].length;
        // 计算当前投票需要消耗的金币数量，第一次为100，之后每次翻倍 / Calculate the number of coins to be spent in the current vote, 100 for the first time, and double each time after that
        uint goldCost = 100 * (2 ** currentVoteCount);

        require(gold.balanceOf(msg.sender) >= goldCost, "The gold balance is insufficient to vote.");
        require(gold.allowance(msg.sender, address(this)) >= goldCost, "The system has no access to your coins. Please authorize.");

        gold.transferFrom(msg.sender, address(this), goldCost); // 委托本合约把用户的金币gold转账给本合约 / Entrusts the Contract to transfer the user's gold coins to the Contract

        Vote memory newVote = Vote({
            status: VoteBehavior(userVote),
            voter: msg.sender,
            voteTime: block.timestamp,
            donationIdVotedOn: id
        });

        _votes.getVoteWithAddressAndId[id].push(newVote); // 添加一个新的投票 / Add a new vote

        uint i;
        bool isSenderInUserAddresses = false; // 当前投票人地址是否已经存储 / Whether the current voter address has been stored
        for (i = 0; i < _votes.userAddresses.length; i++) {
            if (_votes.userAddresses[i] == msg.sender) {
                isSenderInUserAddresses = true;
                break;
            }
        }
        if (!isSenderInUserAddresses) {
            _votes.userAddresses.push(msg.sender); // 添加一个新地址 / Add a new address
        }

        recordUserVote(id, userVote);
    }

    // 用户投票信息 / User voting information
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

        uint[] memory status = new uint[](count); // 投票的状态 / Voting status
        uint[] memory voteTime = new uint[](count); // 投票的时间 / Time of voting
        uint[] memory donationIdVotedOn = new uint[](count); // 投票的对象 / Subject of vote

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

    // 指定id的捐赠的投票信息 / Voting information for donations with a specified id
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
            voteTime = new uint[](votes.length); // 全为0 // All 0
            voter = new address[](votes.length); // 全为0 // All 0
            return (status, voteTime, voter);
        }
    }

    function getDonationRankingList(uint flag) public view returns (Donation[] memory, uint[] memory, uint[] memory) {
        // flag为1，获取通过的donation的排行榜；flag为0，获取失败的donation的排行榜 / flag 1, get the leaderboard of the passed donation; If flag is 0, get the leaderboard of the failed donation
        if (flag == 1) {
            // 获取所有通过的捐赠 // Get all the donations that go through
            uint approvedCount = 0;
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                if (getDonationStatus(_donations.donationIds[i]) == DonationStatus.isApproved) {
                    approvedCount++;
                }
            }

            // 初始化通过的捐赠数组 // Initializes the passed donation array
            Donation[] memory approvedDonations = new Donation[](approvedCount);
            uint[] memory approveVotes = new uint[](approvedCount);
            uint[] memory rejectVotes = new uint[](approvedCount);

            uint index = 0;
            // 填充通过的捐赠信息和票数 / Fill in the passed donation information and votes
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

            // 对通过的捐赠按照赞成票数从高到低，若相同则按照反对票数从低到高进行排序 / Donations for passage are ranked from highest to lowest in favor and from lowest to highest in opposition if they are the same
            for (uint i = 0; i < approvedCount; i++) {
                for (uint j = i + 1; j < approvedCount; j++) {
                    if (
                        approveVotes[i] < approveVotes[j] ||
                        (approveVotes[i] == approveVotes[j] && rejectVotes[i] > rejectVotes[j])
                    ) {
                        // 交换捐赠信息 / Exchange donation information
                        Donation memory tempDonation = approvedDonations[i];
                        approvedDonations[i] = approvedDonations[j];
                        approvedDonations[j] = tempDonation;

                        // 交换赞成票数和反对票数 / Exchange votes for and against
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
            // 获取所有失败的捐赠 / Get all failed donations
            uint rejectedCount = 0;
            for (uint i = 0; i < _donations.donationIds.length; i++) {
                if (getDonationStatus(_donations.donationIds[i]) == DonationStatus.isRejected) {
                    rejectedCount++;
                }
            }

            // 初始化失败的捐赠数组 / Failed to initialize the donation array
            Donation[] memory rejectedDonations = new Donation[](rejectedCount);
            uint[] memory approveVotes = new uint[](rejectedCount);
            uint[] memory rejectVotes = new uint[](rejectedCount);

            uint index = 0;
            // 填充失败的捐赠信息和票数 / Fill in the failed donation information and votes
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

            // 对失败的捐赠按照反对票数从高到低，若相同则按照赞成票数从低到高进行排序 / Donations for failure are ranked from highest to lowest number of negative votes and from lowest to highest number of positive votes if they are the same
            for (uint i = 0; i < rejectedCount; i++) {
                for (uint j = i + 1; j < rejectedCount; j++) {
                    if (
                        rejectVotes[i] < rejectVotes[j] ||
                        (rejectVotes[i] == rejectVotes[j] && approveVotes[i] > approveVotes[j])
                    ) {
                        // 交换捐赠信息 / Exchange donation information
                        Donation memory tempDonation = rejectedDonations[i];
                        rejectedDonations[i] = rejectedDonations[j];
                        rejectedDonations[j] = tempDonation;

                        // 交换赞成票数和反对票数 / Exchange votes for and against
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

    // 获取赞成票数 / Get the approval vote counts
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

    // 获取反对票数 / Get the rejected vote counts
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


    // 所有用户的地址 / Addresses of all users
    function getUserAddresses() public view returns (address[] memory) {
        return _votes.userAddresses;
    }

    // 最大投票次数 / Maximum number of votes
    function getMaxVotingTimes() public view returns (uint) {
        return _votes.maxVotingTimes;
    }

    // 初次投票需要消耗的金币数量gold / Number of coins to be spent on the first vote gold
    function getGoldConsumedByVote() public view returns (uint) {
        return _votes.goldConsumedByVote;
    }

    // 多次投票需要消耗的金币数量gold（动态） / Number of coins to be spent for multiple votes gold (dynamic)
    function updateGetGoldConsumedByVote(uint donationId) public view returns (uint) {
        uint voteCount = _userVotes[msg.sender][donationId].length;
        return 100 * (2 ** voteCount);
    }
}