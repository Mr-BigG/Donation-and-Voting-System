/* eslint-disable */
import React, { useEffect, useState } from "react";
// @ts-ignore
import { DonationAndVotingSystemContract_Contract, GoldContract_Contract, AwardContract_Contract, web3 } from "../../utils/contracts"
import './DonationAndVotingSystemContract.css'

import {
    ShopOutlined,
    TeamOutlined,
    UserOutlined,
    SmileFilled,
    FileTextOutlined,
    FileDoneOutlined,
    DollarCircleOutlined,
    FileAddOutlined,
    EyeOutlined,
    GiftOutlined,
    WalletOutlined,
    GitlabFilled,
    CheckSquareOutlined,
    CloseSquareOutlined,
    HighlightOutlined,
    DiffTwoTone,
    CheckSquareFilled,
    CloseSquareFilled,
    ApiFilled,
    EuroOutlined,
    ExclamationCircleFilled,
    ToTopOutlined,
    ReloadOutlined
} from '@ant-design/icons';

import type { RangePickerProps } from "antd/es/date-picker";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    Layout,
    Menu,
    Row,
    Col,
    Button,
    Table,
    Empty,
    Tag,
    Tabs,
    Divider,
    Alert,
    Modal,
    Input,
    DatePicker,
    Popconfirm,
    Dropdown,
    Space,
} from 'antd';

import format from 'date-fns/format';
import Icon from "antd/lib/icon";
import assert from "assert";
import {useNavigate} from "react-router-dom";

const GanacheTestChainID = '0x539'
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

// 获取当前时间戳 / Gets the current timestamp
const timeNow = () => {
    return Date.parse(new Date().toString()) / 1000
}

// 由时间戳得到时间字符串 / Get the time string from the time stamp
const getDate = (stamp:number) => {
    let date = new Date(1000 * stamp);
    let formattedTime = format(date, 'yyyy-MM-dd HH:mm:ss')
    return formattedTime;
}

const DonationAndVotingSystemContractPage = () => {
    // MetaMask相关的内容 / MetaMask related content
    const [account, setAccount] = useState('')
    // 自动检查用户是否已经连接钱包 / Automatically checks if the user is connected to the wallet
    // 查看window对象里是否存在Ethereum（MetaMask安装后注入的）对象 / Check the window object for Ethereum (injected after MetaMask installation) objects
    const initCheckAccounts = async () => {
        // @ts-ignore
        const { ethereum } = window;
        if (Boolean(ethereum && ethereum.isMetaMask)) {
            // 尝试获取连接到用户账户 / Try to get a connection to the user account
            // @ts-ignore
            const accounts = await web3.eth.getAccounts()
            if (accounts && accounts.length) {
                setAccount(accounts[0])
            }
        }
    }
    useEffect(() => {
        initCheckAccounts()
    }, [])
    // 手动连接钱包 / Manually connect wallet
    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（MetaMask安装后注入的）对象 / Check the window object for ethereum (injected after MetaMask installation) objects
        // @ts-ignore
        const { ethereum } = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            setErrorMessage('MetaMask wallet not installed!')
            return
        }

        try {
            // 如果当前MetaMask不在本地链上，切换MetaMask到本地测试链 / If the current MetaMask is not on the local chain, switch MetaMask to the local test chain
            if (ethereum.chainId !== GanacheTestChainID) {
                const chain = {
                    chainId: GanacheTestChainID,
                    chainName: GanacheTestChainName,
                    rpcUrl: [GanacheTestChainRpcUrl]
                };

                try {
                    // 尝试切换到本地网络 / Attempt to switch to the local network
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到MetaMask中，添加该网络 / If the local network is not added to the MetaMask, add it
                    if (switchError.code === 4902) {
                        await ethereum.request({method: "wallet_addEthereumChain", params: [chain]});
                    }
                }
            }

            // MetaMask成功切换了网络，然后让MetaMask请求用户的授权 / MetaMask successfully switches the network and then asks MetaMask to request authorization from the user
            await ethereum.request({method: "eth_requestAccounts"});
            // 获取MetaMask拿到的授权用户列表 / Get a list of authorized users obtained by MetaMask
            const accounts = await ethereum.request({method: "eth_accounts"});
            // 如果用户存在，展示用户的account地址，否则显示错误信息 / If the user exists, the account address of the user is displayed. Otherwise, an error message is displayed
            setAccount(accounts[0] || 'Unable to access account');
        } catch (error: any) {
            setErrorMessage(error.message)
        }
    }

    // 调用智能合约相关内容 / Call smart contract related content
    // 用户信息 / User info
    const [userInfo, setUserInfo] = useState({} as {balance: number, donationIds: number[], votesInfo: {behavior: number, voteTime: number, donationIdVotedOn: number}[], awardInfo: {id: number, URI: string, awardTime: number}[], getAwardReward: boolean, getInitialGold: boolean})
    // 捐赠信息 / Donation info
    const [donationsInfo, setDonationsInfo] = useState([] as {id: number, content: string, creator: string, voteStartTime: number, voteEndTime: number, status: number, votesInfo: {behavior: number, voteTime: number, voter: string}[], getGoldReward: boolean}[])
    // 发布捐赠需要消耗的金币Gold / Publish the Gold coins that need to be spent for donation
    const [goldConsumedByDonation, setGoldConsumedByDonation] = useState(0)
    // 投票需要消耗的金币Gold / Voting costs Gold coins
    const [goldConsumedByVote, setGoldConsumedByVote] = useState(0)
    // 最大投票次数 / Maximum number of votes
    const [maxVotingTimes, setMaxVotingTimes] = useState(0)
    // 领取金币Gold的数量 / The amount of Gold coins to claim
    const [initialUserGold, setInitialUserGold] = useState(0)
    // 所有用户地址 / All user addresses
    const [userAddresses, setUserAddresses] = useState([] as string[])

    // 自动获取用户的信息（余额，发起捐赠的id，投票信息） / Automatic access to user information (balance, id to initiate donation, voting information)
    const getUserInfo = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract && AwardContract_Contract) {
            try {
                const _userBalance = await GoldContract_Contract.methods.balanceOf(account).call({from: account})
                const _userDonationIds = await DonationAndVotingSystemContract_Contract.methods.getUserDonationIds().call({from: account})
                const __userDonationIds = _userDonationIds.map((item: string) => +item)
                const _userVotesInformation = await DonationAndVotingSystemContract_Contract.methods.getUserVotesInformation().call({from: account})
                const __userVotesInformation = _userVotesInformation[0].map((item: number, index: number) => {
                    return {
                        behavior: +_userVotesInformation[0][index],
                        voteTime: +_userVotesInformation[1][index],
                        donationIdVotedOn: +_userVotesInformation[2][index]
                    }
                })
                const _userAwardInformation = await AwardContract_Contract.methods.getAwardInformation(account).call({from: account})
                const __userAwardInformation = _userAwardInformation[0].map((item: number, index: number) => {
                    return {
                        id: +_userAwardInformation[0][index],
                        URI: _userAwardInformation[1][index],
                        awardTime: +_userAwardInformation[2][index]}
                })
                const _userGetAwardReward = await DonationAndVotingSystemContract_Contract.methods.getWhetherUserCanGetAwardReward(timeNow()).call({from: account})
                const _userGetInitialGold = await GoldContract_Contract.methods.getWhetherUserCanGetInitialUserGold().call({from: account})



                const _userInfo = {
                    balance: +_userBalance,
                    donationIds: __userDonationIds,
                    votesInfo: __userVotesInformation.reverse(),
                    awardInfo: __userAwardInformation.reverse(),
                    getAwardReward: _userGetAwardReward,
                    getInitialGold: _userGetInitialGold
                }
                setUserInfo(_userInfo)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getUserInfo()
            // getApprovalDonationRankingListInfo()
            // getRejectedDonationRankingListInfo()
        }
    }, [account])

    // 自动读取所有用户的地址 / Automatically read the addresses of all users
    const getUserAddresses = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _userAddresses = await DonationAndVotingSystemContract_Contract.methods.getUserAddresses().call({from: account})
                setUserAddresses(_userAddresses)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getUserAddresses()
            // getApprovalDonationRankingListInfo()
            // getRejectedDonationRankingListInfo()
        }
    }, [account])

    // 自动获取所有捐赠的信息 / Automatically get information on all donations
    const getDonationInfo = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _donationIds = await DonationAndVotingSystemContract_Contract.methods.getDonationIds().call({from: account})
                const __donationsIds = _donationIds.map((item: string) => +item)
                const _donationInfo = await Promise.all(__donationsIds.map(async (id: number) => {
                    try {
                        // @ts-ignore
                        const _donationInformation = await DonationAndVotingSystemContract_Contract.methods.getDonationInformation(id, timeNow()).call({from: account})
                        // @ts-ignore
                        const _donationVotesInformation = await DonationAndVotingSystemContract_Contract.methods.getDonationVotesInformation(id, timeNow()).call({from: account})
                        const __donationVotesInformation = _donationVotesInformation[0].map((item: number, index: number) => {
                            return {
                                behavior: +_donationVotesInformation[0][index],
                                voteTime: +_donationVotesInformation[1][index] === 0 ? null : +_donationVotesInformation[1][index],
                                voter: _donationVotesInformation[2][index] === 0 ? null : +_donationVotesInformation[2][index]
                            }
                        })
                        // @ts-ignore
                        const _donationGetGoldReward = await DonationAndVotingSystemContract_Contract.methods.getWhetherUserCanGetGoldReward(id, timeNow()).call({from: account})
                        return {
                            id: id,
                            content: _donationInformation[0],
                            creator: _donationInformation[1],
                            voteStartTime: +_donationInformation[2],
                            voteEndTime: +_donationInformation[3],
                            status: +_donationInformation[4],
                            votesInfo: __donationVotesInformation,
                            getGoldReward: _donationGetGoldReward
                        }
                    } catch (error: any) {
                        revertOutput(error)
                    }
                }))
                // console.log("_donationInfo: ", _donationInfo)
                setDonationsInfo(_donationInfo.reverse())
                // await getApprovalDonationRankingListInfo()
                // await getRejectedDonationRankingListInfo()
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getDonationInfo()
            // getApprovalDonationRankingListInfo()
            // getRejectedDonationRankingListInfo()
        }
    }, [account])

    const getApprovalDonationRankingListInfo = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const result = await DonationAndVotingSystemContract_Contract.methods.getDonationRankingList(1).call({from: account, cacheBreaker: new Date().getTime()})
                // console.log("通过排行榜：", result)
                const _approvedDonations = result[0];
                const _approveVotes = result[1];
                const _rejectVotes = result[2];

                const __allApprovalDonationRankingList = _approvedDonations.map((item: any, index: number) => {
                    return {
                        id: +item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />} color={item.creator === account ? "blue" : (colorGroup[userAddresses.indexOf(item.creator) % 10])}>{item.creator}</Tag>,
                        votesInfo: `${_approveVotes[index]}/${_rejectVotes[index]}`,
                        status: <Tag color="success">Approval</Tag>
                    };
                });

                setAllApprovalDonationData(__allApprovalDonationRankingList);
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }
    useEffect(() => {
        if (account !== '') {
            // getApprovalDonationRankingListInfo()
            // getRejectedDonationRankingListInfo()
        }
    }, [account, donationsInfo, donationsInfo.length, userInfo]);

    const getRejectedDonationRankingListInfo = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const result = await DonationAndVotingSystemContract_Contract.methods.getDonationRankingList(0).call({from: account, cacheBreaker: new Date().getTime()})
                // console.log("失败排行榜：", result)
                const _rejectedDonations = result[0];
                const _approveVotes = result[1];
                const _rejectVotes = result[2];

                const __allRejectedDonationRankingList = _rejectedDonations.map((item: any, index: number) => {
                    return {
                        id: +item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />} color={item.creator === account ? "blue" : (colorGroup[userAddresses.indexOf(item.creator) % 10])}>{item.creator}</Tag>,
                        votesInfo: `${_approveVotes[index]}/${_rejectVotes[index]}`,
                        status: <Tag color="error">Rejected</Tag>
                    };
                });

                setAllRejectedDonationData(__allRejectedDonationRankingList);
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }
    useEffect(() => {
        if (account !== '') {
            // 保留这个？
            getApprovalDonationRankingListInfo()
            getRejectedDonationRankingListInfo()
        }
    }, [account, donationsInfo, donationsInfo.length, userInfo]);

    // 自动获取发布捐赠需要消耗的金币数量Gold / Automatically gets the amount of Gold needed to publish a donation
    const getGoldConsumedByDonation = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _goldConsumedByDonation = await DonationAndVotingSystemContract_Contract.methods.getGoldConsumedByDonation().call({from: account})
                setGoldConsumedByDonation(_goldConsumedByDonation)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getGoldConsumedByDonation()
        }
    }, [account])

    // 自动获取投票所需要的金币数量Gold / Automatically gets the amount of Gold required to vote gold
    const getGoldConsumedByVote = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _goldConsumedByVote = await DonationAndVotingSystemContract_Contract.methods.getGoldConsumedByVote().call({from: account})
                setGoldConsumedByVote(_goldConsumedByVote)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getGoldConsumedByVote()
        }
    }, [account])

    // 自动获取最大投票次数 / Automatically obtains the maximum number of votes
    const getMaxVotingTimes = async () => {
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _maxVotingTimes = await DonationAndVotingSystemContract_Contract.methods.getMaxVotingTimes().call({from: account})
                setMaxVotingTimes(_maxVotingTimes)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getMaxVotingTimes()
        }
    }, [account])

    // 自动获取金币Gold的数量 / Automatically retrieves the amount of Gold coins
    const getInitialUserGold = async () => {
        // @ts-ignore
        if (GoldContract_Contract) {
            try {
                const _initialUserGold = await GoldContract_Contract.methods.getInitialUserGold().call({from: account})
                setInitialUserGold(_initialUserGold)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getInitialUserGold()
        }
    }, [account])

    // 手动领取金币Gold / Pick up Gold coins manually
    const getGold = async () => {
        setGetGoldSubmittedLoading(true)
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.getGold().send({
                    from: account,
                    // @ts-ignore
                    value: web3.utils.toWei('0.01', 'ether')
                })
                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                setSuccessMessage('Successfully redeemed 10000 Golds.')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
        setGetGoldSubmittedLoading(false)
    }

    // 手动将gold兑换为ETH / Manually convert gold to ETH
    const getETH = async () => {
        setGetETHSubmittedLoading(true)
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.getETH().send({from: account})
                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                setSuccessMessage('Successfully converted to ETH.')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
        setGetETHSubmittedLoading(false)
    }

    // 手动领取纪念品 / Manual souvenir collection
    const getAwardReward = async () => {
        setGetAwardRewardSubmittedLoading(true)
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && AwardContract_Contract) {
            try {
                await DonationAndVotingSystemContract_Contract.methods.getAwardReward().send({from: account})
                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                setSuccessMessage('Congrats! You got a souvenir(reward)!')
            } catch (error: any) {
                revertOutput(error)
            } finally {
                // setAwardButtonDisabled(false);  // 重新启用按钮
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
        setGetAwardRewardSubmittedLoading(false)
    }

    // 手动领取金币奖励 / Manually claim gold rewards
    const getGoldRewardFromDonationApproved = async (id: number) => {
        setGetReceiveGoldsSubmittedLoading(true)
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                await DonationAndVotingSystemContract_Contract.methods.getGoldRewardFromDonationApproved(id).send({
                    from: account,
                    gas: 900000
                })
                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                setSuccessMessage('Congrats! You got Golds for your donation!')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
        setGetReceiveGoldsSubmittedLoading(false)
    }

    // 手动发起新的捐赠 / Initiate a new donation manually
    const addNewDonation = async (content: string, startTime: number, endTime: number) => {
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.approve(DonationAndVotingSystemContract_Contract.options.address, goldConsumedByDonation).send({from: account})
                await DonationAndVotingSystemContract_Contract.methods.addNewDonation(content, startTime, endTime).send({from: account})
                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                setSuccessMessage('You have successfully posted a new donation!')
                setSubmit(true)
                _donationContent = ""
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }


    // 手动投票 / Manual voting
    const voteOnDonation = async (behavior: number, id: number) => {
        // console.log("item.id = ", id)
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                // 检查是否到达最大投票次数 / Check whether the maximum number of votes has been reached
                const canVote = await DonationAndVotingSystemContract_Contract.methods.checkWhetherReachedTheMaxVotingTimes(id).call({from: account})
                // console.log("canVote: ", canVote)
                if (canVote === false) {
                    setErrorMessage('Current Donation you have reached the maximum number of votes!')
                    return
                }

                // 检查投票是否合法 / Check if the vote is legitimate
                const canVote2 = await DonationAndVotingSystemContract_Contract.methods.checkVotingConditions(id, behavior).call({from: account})
                // console.log("canVote2: ", canVote2)
                if (canVote2 === false) {
                    setErrorMessage('Your vote is not legal! Your vote must be consistent with the previous vote! And each donation can only be rejected once!')
                    return
                }

                const _goldConsumedByVote = await DonationAndVotingSystemContract_Contract.methods.updateGetGoldConsumedByVote(id).call({from: account})
                // console.log("_goldConsumedByVote: ", _goldConsumedByVote)

                // 检查余额是否足够支持投票 / Check if the balance is sufficient to support the vote
                const canVote3 = await DonationAndVotingSystemContract_Contract.methods.checkWhetherHaveEnoughGoldToVote(_goldConsumedByVote).call({from: account})
                if (canVote3 === false) {
                    setErrorMessage('Your balance is insufficient!')
                    return
                }

                await GoldContract_Contract.methods.approve(DonationAndVotingSystemContract_Contract.options.address, _goldConsumedByVote).send({from: account})
                await DonationAndVotingSystemContract_Contract.methods.voteOnDonation(behavior, id).send({from: account}).catch((error: any) => {
                    // console.log("异常error: ", error.message)
                    // console.log('Full error object:', JSON.stringify(error, null, 2)); // 打印完整错误对象
                })
                await DonationAndVotingSystemContract_Contract.events.VoteRejected().on('data', (event: any) => {
                    // console.log("event: ", event)
                }).on('error', console.error)

                await DonationAndVotingSystemContract_Contract.methods.recordUserVote(id, behavior).call({from: account})

                getUserInfo()
                getDonationInfo()
                // getApprovalDonationRankingListInfo()
                // getRejectedDonationRankingListInfo()
                if (behavior === 1) {
                    setSuccessMessage('You spent ' + _goldConsumedByVote + ' Golds. ' + 'You successfully voted for approval. Keep in mind that you have a total of ' + maxVotingTimes + ' votes per donation.')
                } else {
                    setSuccessMessage('You spent ' + _goldConsumedByVote + ' Golds. ' + 'You successfully voted for rejected. Keep in mind that you have a total of ' + maxVotingTimes + ' votes per donation.')
                }
            } catch (error: any) {
                // console.log('error: ', error)
                // console.log('error.data: ', error.data)
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }

    // 手动刷新排行榜 / Manually refresh the leaderboard
    const reloadRankingList = async () => {
        if (account === '') {
            setErrorMessage('You have not connected your wallet yet!')
            return
        }
        // @ts-ignore
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                if (userInfo.balance >= 1) {
                    await GoldContract_Contract.methods.reloadRankingList().send({from: account})
                    getUserInfo()
                    getDonationInfo()
                    // getApprovalDonationRankingListInfo()
                    // getRejectedDonationRankingListInfo()
                } else {
                    setErrorMessage('Your Gold balance is insufficient (a balance greater than 0 is required to refresh the ranking list)!')
                }
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('The contract does not exist!')
        }
    }

    // Ant Design相关内容 / Ant Design related content
    const { Header, Content,  Footer, Sider } = Layout;

    // 侧边菜单栏 / Side menu bar
    const [menuKey, setMenuKey] = useState(0);
    const _items = [
        { icon: ShopOutlined, label: "Donation Center" },
        { icon: UserOutlined, label: "User Center" },
        { icon: ToTopOutlined, label: "Ranking Lists" }
    ]
    const items: MenuProps['items'] = _items.map((value, index) => ({
        key: String(index),
        icon: React.createElement(value.icon),
        label: value.label
    }))

    // 用户颜色 / User color
    const colorGroup = ["red", "gold", "green", "cyan", "magenta","orange","lime","geekblue","volcano","purple"]

    // 表格数据 / Tabular data
    const [allDonationData, setAllDonationData] = useState([] as {
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
        action: JSX.Element;
    }[])
    const [allApprovalDonationData, setAllApprovalDonationData] = useState([] as {
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
    }[])
    const [allRejectedDonationData, setAllRejectedDonationData] = useState([] as {
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
    }[])
    const [userDonationData, setUserDonationData] = useState([] as {
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        votesInfo: JSX.Element;
        status: JSX.Element;
        action: JSX.Element;
    }[])
    const [userDonationVoteData, setUserDonationVoteData] = useState([] as {
        id: number;
        voteTime: string;
        voter: JSX.Element;
        behavior: string;
    }[])
    const [userVoteData, setUserVoteData] = useState([] as {
        behavior: string;
        voteTime: string;
        donationIdVotedOn: number;
        content: string;
    }[])
    const [userAwardData, setUserAwardData] = useState([] as {
        id: string;
        URI: string;
        awardTime: string
    }[])
    useEffect(() => {
        if (account !== '' && donationsInfo) {
            try {
                setAllDonationData(donationsInfo.map((item) => {
                    let button_action!:JSX.Element;
                    if (item.status === 0) {
                        button_action =
                            <div>
                                <Popconfirm title={"Voting will cost at least " + goldConsumedByVote + " Golds (depending on how many times you have historically voted for that donation). Now you have " + userInfo.balance + " Golds. Are you sure to continue?"} onConfirm={() => voteOnDonation(1, item.id)} okText="Confirm" cancelText="Cancel" placement="leftTop">
                                    <Button icon={<CheckSquareFilled />}>Approve</Button>
                                </Popconfirm>
                                <Popconfirm title={"Voting will cost at least " + goldConsumedByVote + " Golds (depending on how many times you have historically voted for that donation). Now you have " + userInfo.balance + " Golds. Are you sure to continue?"} onConfirm={() => voteOnDonation(0, item.id)} okText="Confirm" cancelText="Cancel" placement="leftTop">
                                    <Button icon={<CloseSquareFilled />}>Reject</Button>
                                </Popconfirm>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action = <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)} loading={getReceiveGoldsSubmittedLoading}>Receive Golds</Button>;

                    }
                    return {
                        key: item.id,
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />} color={item.creator === account ? "blue" : (colorGroup[userAddresses.indexOf(item.creator) % 10])}>{item.creator}</Tag>,
                        votesInfo: item.votesInfo.filter((item) => {return item.behavior == 1}).length + "/" + item.votesInfo.filter((item) => {return item.behavior == 0}).length,
                        status: (item.status == 0 ? <Tag color="processing">In Progress</Tag> : (item.status == 1 ? <Tag color="error">Rejected</Tag> : (item.status == 2 ? <Tag color="success">Approval</Tag> : <Tag color="warning">Not Started</Tag>))),
                        action: button_action
                    }
                }))
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [donationsInfo, userInfo.donationIds])
    useEffect(() => {
        if (account !== "" && donationsInfo && userInfo.donationIds) {
            try {
                const _allDonationData = donationsInfo.map((item) => {
                    let button_action!:JSX.Element;
                    if (item.status === 0) {
                        button_action =
                            <div>
                                <Popconfirm title={"Voting will cost at least " + goldConsumedByVote + " Golds (depending on how many times you have historically voted for that donation). Now you have " + userInfo.balance + " Golds. Are you sure to continue?"} onConfirm={() => voteOnDonation(1, item.id)} okText="Confirm" cancelText="Cancel" placement="leftTop">
                                    <Button icon={<CheckSquareFilled />}>Approve</Button>
                                </Popconfirm>
                                <Popconfirm title={"Voting will cost at least " + goldConsumedByVote + " Golds (depending on how many times you have historically voted for that donation). Now you have " + userInfo.balance + " Golds. Are you sure to continue?"} onConfirm={() => voteOnDonation(0, item.id)} okText="Confirm" cancelText="Cancel" placement="leftTop">
                                    <Button icon={<CloseSquareFilled />}>Reject</Button>
                                </Popconfirm>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action = <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)} loading={getReceiveGoldsSubmittedLoading}>Receive Golds</Button>;
                    }
                    return {
                        key: item.id,
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        votesInfo: <Button type="link" onClick={() => info(item.id)}>{item.votesInfo.filter((item) => {return item.behavior === 1}).length + "/" + item.votesInfo.filter((item) => {return item.behavior === 0}).length}</Button>,
                        status: (item.status === 0 ? <Tag color="processing">In Progress</Tag> : (item.status === 1 ? <Tag color="error">Rejected</Tag> : (item.status === 2 ? <Tag color="success">Approval</Tag> : <Tag color="warning">Not Started</Tag>))),
                        action: button_action
                    }
                })
                setUserDonationData(_allDonationData.filter((item) => {
                    return userInfo.donationIds.some((id) => {
                        return id === item.id
                    })
                }))
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [donationsInfo, userInfo.donationIds])
    useEffect(() => {
        if (account !== "" && donationsInfo && userInfo.donationIds) {
            try {
                const _allDonationData = donationsInfo.map((item) => {
                    let button_action!:JSX.Element;
                    if (item.status === 0) {
                        button_action =
                            <div>
                                <Button icon={<CheckSquareFilled />} onClick={() => voteOnDonation(1, item.id)}>Approve</Button>
                                <Button icon={<CloseSquareFilled />} onClick={() => voteOnDonation(0, item.id)}>Reject</Button>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action =
                            <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)} loading={getReceiveGoldsSubmittedLoading}>Receive Golds</Button>;
                    }
                    return {
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />}>{item.creator}</Tag>,
                        votesInfo: item.votesInfo,
                        status: (item.status === 0 ? <Tag color="processing">In Progress</Tag> : (item.status === 1 ? <Tag color="error">Rejected</Tag> : (item.status === 2 ? <Tag color="success">Approval</Tag> : <Tag color="warning">Not Started</Tag>))),
                        action: button_action
                    }
                })
                const _userDonationData = _allDonationData.filter((item) => {
                    return userInfo.donationIds.some((id) => {
                        return id === item.id
                    })
                })
                let _userDonationVoteData = [] as {
                    id: number;
                    voteTime: string;
                    voter: JSX.Element;
                    behavior: string;
                }[]
                _userDonationData.forEach((item, index, ) => {
                    item.votesInfo.forEach((_item) => {
                        _userDonationVoteData.push({
                            id: item.id,
                            voteTime: getDate(_item.voteTime),
                            voter: <Tag icon={<UserOutlined />} color={_item.voter === account ? "blue" : (colorGroup[userAddresses.indexOf(_item.voter) % 10])}>{_item.voter}</Tag>,
                            behavior: (_item.behavior === 1 ? "Approve" : "Reject")
                        })
                    })
                })
                setUserDonationVoteData(_userDonationVoteData)
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [donationsInfo, userInfo.donationIds])
    useEffect(() => {
        if (account !== "" && userInfo.votesInfo && donationsInfo) {
            try {
                setUserVoteData(userInfo.votesInfo.map((item) => {
                    // console.log("item: ", item)
                    return {
                        key: item.donationIdVotedOn,
                        behavior: (item.behavior == 1 ? "Approve" : "Reject"),
                        voteTime: getDate(item.voteTime),
                        donationIdVotedOn: item.donationIdVotedOn, // undefined
                        content: (donationsInfo.filter((_item) => _item.id == item.donationIdVotedOn).length > 0 ? donationsInfo.filter((_item) => _item.id == item.donationIdVotedOn)[0].content : "")
                    }

                }))
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [userInfo.votesInfo, donationsInfo])
    useEffect(() => {
        if (account !== "" && userInfo.awardInfo) {
            try {
                setUserAwardData(userInfo.awardInfo.map((item) => {
                    return {
                        id: "#" + item.id,
                        URI: item.URI,
                        awardTime: getDate(item.awardTime)
                    }
                }))
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [userInfo.awardInfo])
    useEffect(() => {

    }, []);

    const columnsDonation: ColumnsType<{
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
        action: JSX.Element;
    }> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: 'Start Time',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: 'End Time',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: 'Content',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: 'Creator',
            dataIndex: 'creator',
            key: 'creator',
            align: 'center' as 'center',
        },
        {
            title: 'Approval Counts/Rejected Counts',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            align: 'center' as 'center',
        },
    ];

    const columnsApprovalDonation: ColumnsType<{
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
    }> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: 'Start Time',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: 'End Time',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: 'Content',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: 'Creator',
            dataIndex: 'creator',
            key: 'creator',
            align: 'center' as 'center',
        },
        {
            title: 'Approval Counts/Rejected Counts',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
    ];

    const columnsRejectedDonation: ColumnsType<{
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        creator: JSX.Element;
        votesInfo: string;
        status: JSX.Element;
    }> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: 'Start Time',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: 'End Time',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: 'Content',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: 'Creator',
            dataIndex: 'creator',
            key: 'creator',
            align: 'center' as 'center',
        },
        {
            title: 'Approval Counts/Rejected Counts',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
    ];

    const columnsUserDonation: ColumnsType<{
        id: number;
        voteStartTime: string;
        voteEndTime: string;
        content: string;
        votesInfo: JSX.Element;
        status: JSX.Element;
        action: JSX.Element;
    }> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: 'Start Time',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: 'End Time',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: 'Content',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: 'Approval Counts/Rejected Counts',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            align: 'center' as 'center',
        },
    ];

    const columnsVote: ColumnsType<{
        behavior: string;
        voteTime: string;
        donationIdVotedOn: number;
        content: string;
    }> = [
        {
            title: 'ID of Donation',
            dataIndex: 'donationIdVotedOn',
            key: 'donationIdVotedOn',
            align: 'center' as 'center',
        },
        {
            title: 'Content',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: 'Vote Time',
            dataIndex: 'voteTime',
            key: 'voteTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteTime) - Date.parse(b.voteTime),
        },
        {
            title: 'Behavior',
            dataIndex: 'behavior',
            key: 'behavior',
            align: 'center' as 'center',
        },
    ];

    const columnsDonationVote: ColumnsType<{
        id: number;
        voteTime: string;
        voter: JSX.Element;
        behavior: string;
    }> = [
        {
            title: 'Vote Time',
            dataIndex: 'voteTime',
            key: 'voteTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteTime) - Date.parse(b.voteTime),
        },
        {
            title: 'Voter',
            dataIndex: 'voter',
            key: 'voter',
            align: 'center' as 'center',
        },
        {
            title: 'Behavior',
            dataIndex: 'behavior',
            key: 'behavior',
            align: 'center' as 'center',
        },
    ];

    const columnsAward: ColumnsType<{
        id: string;
        URI: string;
        awardTime: string
    }> = [
        {
            title: 'ID of Souvenir',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: 'Souvenir Name',
            dataIndex: 'URI',
            key: 'URI',
            align: 'center' as 'center',
        },
        {
            title: 'Awarding Time',
            dataIndex: 'awardTime',
            key: 'awardTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.awardTime) - Date.parse(b.awardTime),
        },
    ];

    const AllDonationTable = () => {
        if (allDonationData.length === 0) {
            return <Empty />
        } else {
            return (
                <div>
                    <Table dataSource={allDonationData} columns={columnsDonation} pagination={{
                        hideOnSinglePage: true, // 只有一页时不显示分页
                        pageSize: 5,
                        showTotal: () => `${allDonationData.length} in total`,
                        total: allDonationData.length,
                    }} />
                </div>

            )
        }
    }

    const AllApprovalDonationTable = () => {
        if (allApprovalDonationData.length === 0) {
            return <Empty />
        } else {
            return (
                <div>
                    <Table dataSource={allApprovalDonationData} columns={columnsApprovalDonation} pagination={{
                        hideOnSinglePage: true,
                        pageSize: 5,
                        showTotal: () => `${allApprovalDonationData.length} in total`,
                        total: allApprovalDonationData.length,
                    }}>
                    </Table>
                </div>
            )
        }
    }

    const AllRejectedDonationTable = () => {
        if (allRejectedDonationData.length === 0) {
            return <Empty />
        } else {
            return (
                <div>
                    <Table dataSource={allRejectedDonationData} columns={columnsRejectedDonation} pagination={{
                        hideOnSinglePage: true,
                        pageSize: 5,
                        showTotal: () => `${allRejectedDonationData.length} in total`,
                        total: allRejectedDonationData.length,
                    }}>
                    </Table>
                </div>
            )
        }
    }

    const UserDonationTable = () => {
        if (userDonationData.length === 0) {
            return <Empty />
        } else {
            return <Table dataSource={userDonationData} columns={columnsUserDonation} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `${userDonationData.length} in total`,
                total: userDonationData.length,
            }}/>
        }
    }

    const UserVoteTable = () => {
        if (userVoteData.length === 0) {
            return <Empty />
        } else {
            // console.log("userVoteData: ", userVoteData)
            return <Table dataSource={userVoteData} columns={columnsVote} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `${userVoteData.length} in total`,
                total: userVoteData.length,
            }}/>
        }
    }

    const UserDonationVoteTable = (id: {id: number}) => {
        if (userDonationVoteData.length === 0) {
            return <Empty />
        } else {
            return <Table dataSource={userDonationVoteData.filter((item) => item.id === id.id)} columns={columnsDonationVote} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `${userDonationVoteData.filter((item) => item.id === id.id).length} in total`,
                total: userDonationVoteData.filter((item) => item.id === id.id).length,
            }}/>
        }
    }

    const UserAwardTable = () => {
        if (userAwardData.length === 0) {
            return <Empty />
        } else {
            return <Table dataSource={userAwardData} columns={columnsAward} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `${userAwardData.length} in total`,
                total: userAwardData.length,
            }}/>
        }
    }

    // 提交捐赠数据 / Submit donation data
    let _donationContent = ""
    let _startTime = 0
    let _endTime = 0
    let timeValidity = false
    const { TextArea } = Input
    const { RangePicker } = DatePicker

    const [open, setOpen] = useState(false)
    const [submit, setSubmit] = useState(false)
    const [donationSubmittedLoading, setDonationSubmittedLoading] = useState(false)
    const [getGoldSubmittedLoading, setGetGoldSubmittedLoading] = useState(false)
    const [getETHSubmittedLoading, setGetETHSubmittedLoading] = useState(false)
    const [getAwardRewardSubmittedLoading, setGetAwardRewardSubmittedLoading] = useState(false)
    const [getReceiveGoldsSubmittedLoading, setGetReceiveGoldsSubmittedLoading] = useState(false)

    const showModal = () => {
        setOpen(true)
        setSubmit(false)
    }

    const handleOk = async () => {
        setDonationSubmittedLoading(true)
        await addNewDonation(_donationContent, _startTime, _endTime)
        // await getApprovalDonationRankingListInfo()
        // await getRejectedDonationRankingListInfo()
        setDonationSubmittedLoading(false)
    }

    const handleCancel = () => {
        setOpen(false)
        setSubmit(false)
        getUserInfo()
        getDonationInfo()
        // getApprovalDonationRankingListInfo()
        // getRejectedDonationRankingListInfo()
    }

    const onOk = (value: RangePickerProps['value']) => {
        if (value === null || value === undefined) {
            _startTime = 0;
            _endTime = 0;
        } else {
            _startTime = 0;
            _endTime = 0;
            if (value[0] !== null) {
                _startTime = +(value[0].valueOf() / 1000).toFixed(0)
            }
            if (value[1] !== null) {
                _endTime = +(value[1].valueOf() / 1000).toFixed(0)
            }
        }

        if (_startTime === 0 || _endTime === 0) {
            timeValidity = false;
            setErrorMessage("Start time and end time must be set!");
        } else if (_endTime < timeNow()) {
            timeValidity = false;
            setErrorMessage("The end time must be in the future!")
        } else {
            timeValidity = true;
        }
    }

    // 捐赠中心的HTML / HTML for the donation center
    const DonationCenter = () => {
        // console.log("donationInfo: ", donationsInfo)
        return (
            <Layout className="site-layout" style={{ marginLeft: 200, minHeight: 900}}>
                {(errorMessage !== "" && open === false) && <Alert type="error" message={errorMessage} banner closable afterClose={()=>setErrorMessage("")} />}
                {(successMessage !== "" && open === false) && <Alert type="success" message={successMessage} banner closable afterClose={()=>setSuccessMessage("")} />}
                <Header className="header">
                    <br />
                    <Row justify="space-around" align="middle">

                        <Col span={6}><FileTextOutlined /> <br/>Total {donationsInfo.length} Donations</Col>
                        <Col span={6}><FileDoneOutlined /> <br/>Donation Approval Rate {donationsInfo.length==0?0:(donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length)==0?0:(donationsInfo.filter((item)=>item.status===2).length / (donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length) * 100).toFixed(2)}%</Col>
                        <Col span={6}><TeamOutlined /> <br/>Total {userAddresses.length} Participants</Col>
                        <Col span={6}><HighlightOutlined /> <br/>Total {donationsInfo.length==0?0:((donationsInfo.map((item)=>item.votesInfo.length)).map((item,index,array)=>index!=0?array[0]+=item:array[0]+=0)).reverse()[0]} Valid Votes</Col>

                    </Row>
                </Header>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: 'white', overflow: 'initial'}}>
                    <div className="toolBar">
                        <Row justify="space-around" align="middle">
                            <Col span={20}>
                                <Popconfirm title={"Submitting a donation will consume " + goldConsumedByDonation + " Golds. Now you have " + userInfo.balance + " Golds. Are you sure to continue?"} onConfirm={showModal} okText="Confirm" cancelText="Cancel" placement="top" disabled={account === "" || userInfo.balance < 1000}>
                                    {account === "" ? <Button type="primary" size="large" shape="round" icon={<ExclamationCircleFilled />} disabled={true}>You have not connected your wallet</Button> : account !== "" && userInfo.balance >= 1000 ? <Button type="primary" size="large" shape="round" icon={<DiffTwoTone />}>Submit Donation</Button> : <Button type="primary" size="large" shape="round" icon={<FileAddOutlined />} disabled={true}>Your balance is less than 1000 golds</Button>}
                                </Popconfirm>
                            </Col>
                        </Row>
                    </div>
                    <Modal
                        transitionName=""
                        maskTransitionName=""
                        open={open}
                        title="Submit Donation"
                        onOk={handleOk}
                        onCancel={handleCancel}
                        maskClosable={false} // 点击遮罩区域时不会关闭 / The masked area does not close when clicked
                        forceRender // 确保对话框内的内容在初次打开时已准备好，避免焦点问题 / Make sure the content in the dialog box is ready when it is first opened to avoid focus issues
                        footer={[
                            <Button key="back" onClick={handleCancel}>Cancel</Button>,
                            <Button key="submit" type="primary" onClick={handleOk} disabled={submit} loading={donationSubmittedLoading}>{submit === true ? "Donation Submitted" : "Submit Donation"}</Button>
                        ]}>
                        {(errorMessage !== "" && open === true) && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                        {(successMessage !== "" && open === true) && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                        <div style={{ margin: '8px' }}>
                            <RangePicker
                                showTime={{ format: 'HH:mm:ss' }}
                                format={"YYYY-MM-DD HH:mm:ss"}
                                onOk={onOk}
                            />
                        </div>
                        <div style={{ margin: '8px' }}>
                            <TextArea showCount maxLength={200} onChange={(event) => _donationContent = event.target.value} />
                        </div>
                    </Modal>
                    <Divider />
                    <AllDonationTable />
                </Content>
                <Footer style={{ textAlign: 'center' }}>Donation & Voting System Created by Group 2 in NUS EE4032</Footer>
            </Layout>
        )
    }

    // 成功信息与错误信息 / Success message and error message
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    // 更好地输出revert报错信息 / Better output revert error messages
    const revertOutput = (err: any) => {
        const start = err.message.indexOf("revert ")
        const end = err.message.indexOf("\"", start)
        if (start === -1 || end === -1) {
            setErrorMessage(err.message)
        } else {
            setErrorMessage(err.message.substring(start + 7, end))
        }
    }

    const [open_, setOpen_] = useState(false)
    const [voteInfoId, setVoteInfoId] = useState(0)

    const info = (id: number) => {
        setOpen_(true)
        setVoteInfoId(id)
    }

    const handleCancel_ = () => {
        setOpen_(false)
        getUserInfo()
        getDonationInfo()
        // getApprovalDonationRankingListInfo()
        // getRejectedDonationRankingListInfo()
    }




    // 用户中心的HTML / User center HTML
    const UserCenter = () => {
        // console.log("userInfo: ", userInfo)
        // console.log("userInfo.getAwardReward: ", userInfo.getAwardReward)
        // console.log("userInfo.votesInfo: ", userInfo.votesInfo)
        return (
            <Layout className="site-layout" style={{ marginLeft: 200, minHeight: 900 }}>
                {errorMessage !== "" && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                {successMessage !== "" && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                <Header className="header">
                    <br />
                    <Row justify="space-around" align="middle">
                        <Col span={6}><FileTextOutlined /><br />You Submitted {(account === "" || !userInfo.donationIds) ? 0 : userInfo.donationIds.length} Donations</Col>
                        <Col span={6}><HighlightOutlined /><br />You Voted {(account === "" || !userInfo.votesInfo) ? 0 : userInfo.votesInfo.length} Times</Col>
                        <Col span={6}><GiftOutlined /><br />You have {(account === "" || !userInfo.awardInfo) ? 0 : userInfo.awardInfo.length} Souvenirs</Col>
                        <Col span={6}><DollarCircleOutlined /><br/>You have {(account === "" ? 0 : userInfo.balance)} Golds</Col>
                    </Row>
                </Header>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: "white", overflow: 'initial'}}>
                    <div className="userBar">
                        <Row justify="space-around" align="middle" style={{fontSize: "xxx-large"}}>
                            <Col span={20}>
                                <GitlabFilled color="green" />
                            </Col>
                        </Row>
                        <Row justify="space-around" align="middle">
                            <Col span={20}>
                                {account === '' ? 'You Are Not Connected' : <Tag style={{fontSize: "x-large", padding: "16px"}} icon={<UserOutlined />} color="#87d068">{account}</Tag>}
                            </Col>
                        </Row>
                        <Row justify="space-around" align="middle" gutter={[16, 16]}>
                            <Col>
                                {account === "" ? <Button type="primary" size="large" shape="round" icon={<ApiFilled />} onClick={onClickConnectWallet} >Connect Wallet</Button> : (<Button type="primary" size="large" shape="round" icon={<GiftOutlined />} onClick={getAwardReward} disabled={!userInfo.getAwardReward} loading={getAwardRewardSubmittedLoading} ghost>Receive Souvenir</Button>)}
                            </Col>
                            <Col>
                                <Button type="primary" size="large" shape="round" icon={<DollarCircleOutlined />} onClick={getGold} disabled={account === ""} loading={getGoldSubmittedLoading}>Exchange 10000 Golds</Button>
                            </Col>
                            <Col>
                                <Button type="primary" size="large" shape="round" icon={<EuroOutlined />} onClick={getETH} disabled={account === "" || userInfo.balance === 0} loading={getETHSubmittedLoading} ghost>Exchange ETH</Button>
                            </Col>
                        </Row>
                    </div>
                </Content>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: 'white', overflow: 'initial' }}>
                    <Tabs
                        defaultActiveKey="1"
                        centered
                        items={[
                            {label: (<span><FileTextOutlined />My Donations</span>), key: '1', children: <UserDonationTable />},
                            {label: (<span><HighlightOutlined />My Votes</span>), key: '2', children: <UserVoteTable />},
                            {label: (<span><GiftOutlined />My Souvenirs</span>), key: '3', children: <UserAwardTable />}
                        ]}
                    />
                    <Modal
                        transitionName=""
                        maskTransitionName=""
                        open={open_}
                        title={"Information of Donation " + voteInfoId}
                        onCancel={handleCancel_}
                        maskClosable={false}
                        forceRender
                        width={800}
                        footer={[
                            <Button key="ok" type="primary" onClick={handleCancel_}>Confirm</Button>
                        ]}
                    >
                        {(errorMessage !== "" && open === true) && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                        {(successMessage !== "" && open === true) && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                        <UserDonationVoteTable id={voteInfoId} />
                    </Modal>

                </Content>
                <Footer style={{ textAlign: 'center' }}>Donation & Voting System Created by Group 2 in NUS EE4032</Footer>
            </Layout>
        )
    }

    // 排行榜的HTML / HTML for leaderboards
    const RankingList = () => {
        return (
            <Layout className="site-layout" style={{ marginLeft: 200, minHeight: 900 }}>
                {errorMessage !== "" && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                {successMessage !== "" && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                <Header className="header">
                    <br />
                    <Row justify="space-around" align="middle">
                        <Col span={6}><FileTextOutlined /><br />You Submitted {(account === "" || !userInfo.donationIds) ? 0 : userInfo.donationIds.length} Donations</Col>
                        <Col span={6}><HighlightOutlined /><br />You Voted {(account === "" || !userInfo.votesInfo) ? 0 : userInfo.votesInfo.length} Times</Col>
                        <Col span={6}><GiftOutlined /><br />You have {(account === "" || !userInfo.awardInfo) ? 0 : userInfo.awardInfo.length} Souvenirs</Col>
                        <Col span={6}><DollarCircleOutlined /><br/>You have {(account === "" ? 0 : userInfo.balance)} Golds</Col>
                    </Row>
                </Header>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: 'white', overflow: 'initial' }}>
                    <Tabs
                        defaultActiveKey="1"
                        centered
                        items={[
                            {label: (<span><FileTextOutlined />Ranking List of Approval Donations<Button size="small" type="text" onClick={reloadRankingList}><ReloadOutlined /></Button></span>), key: '1', children: <AllApprovalDonationTable />},
                            {label: (<span><HighlightOutlined />Ranking List of Rejected Donations<Button size="small" type="text" onClick={reloadRankingList}><ReloadOutlined /></Button></span>), key: '2', children: <AllRejectedDonationTable />},
                        ]}
                    />
                </Content>
                <Footer style={{ textAlign: 'center' }}>Donation & Voting System Created by Group 2 in NUS EE4032</Footer>
            </Layout>
        )
    }

    const navigate = useNavigate();

    const handleButtonClick = () => {
        navigate('/'); // 跳转到<Home>组件
    };

    // 总的HTML / Total HTML
    return (
        <Layout hasSider className="site-layout">
            <Sider
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    display: 'fixed'
                }}
                theme="light"
            >
                <div className="logo"><SmileFilled /><a onClick={handleButtonClick}>Donation & Voting</a></div>
                <Menu theme="light" mode="inline" defaultSelectedKeys={['0']} items={items} onSelect={(item:any)=>{setMenuKey(item.key)}}/>
            </Sider>
            {menuKey == 0 ? <DonationCenter /> : (menuKey == 1 ? <UserCenter /> : <RankingList />)}
        </Layout>
    )

}

export default DonationAndVotingSystemContractPage