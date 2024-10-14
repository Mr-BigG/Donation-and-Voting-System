/* eslint-disable */
import React, { useEffect, useState } from "react";
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
} from '@ant-design/icons';

import type { RangePickerProps } from "antd/es/date-picker";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Layout, Menu, Row, Col, Button, Table, Empty, Tag, Tabs, Divider, Alert, Modal, Input, DatePicker,Popconfirm} from 'antd';

import format from 'date-fns/format';

const GanacheTestChainID = '0x539'
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

// 获取当前时间戳
const timeNow = () => {
    return Date.parse(new Date().toString()) / 1000
}

// 由时间戳得到时间字符串
const getDate = (stamp:number) => {
    let date = new Date(1000 * stamp);
    let formattedTime = format(date, 'yyyy-MM-dd HH:mm:ss')
    return formattedTime;
}

const DonationAndVotingSystemContractPage = () => {
    // MetaMask相关的内容
    const [account, setAccount] = useState('')
    // 自动检查用户是否已经连接钱包
    // 查看window对象里是否存在Ethereum（MetaMask安装后注入的）对象
    const initCheckAccounts = async () => {
        // @ts-ignore
        const { ethereum } = window;
        if (Boolean(ethereum && ethereum.isMetaMask)) {
            // 尝试获取连接到用户账户
            const accounts = await web3.eth.getAccounts()
            if (accounts && accounts.length) {
                setAccount(accounts[0])
            }
        }
    }
    useEffect(() => {
        initCheckAccounts()
    }, [])
    // 手动连接钱包
    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（MetaMask安装后注入的）对象
        // @ts-ignore
        const { ethereum } = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            setErrorMessage('MetaMask钱包未安装！')
            return
        }

        try {
            // 如果当前MetaMask不在本地链上，切换MetaMask到本地测试链
            if (ethereum.chainId !== GanacheTestChainID) {
                const chain = {
                    chainId: GanacheTestChainID,
                    chainName: GanacheTestChainName,
                    rpcUrl: [GanacheTestChainRpcUrl]
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到MetaMask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({method: "wallet_addEthereumChain", params: [chain]});
                    }
                }
            }

            // MetaMask成功切换了网络，然后让MetaMask请求用户的授权
            await ethereum.request({method: "eth_requestAccounts"});
            // 获取MetaMask拿到的授权用户列表
            const accounts = await ethereum.request({method: "eth_accounts"});
            // 如果用户存在，展示用户的account地址，否则显示错误信息
            setAccount(accounts[0] || '无法获取账户');
        } catch (error: any) {
            setErrorMessage(error.message)
        }
    }

    // 调用智能合约相关内容
    // 用户信息
    const [userInfo, setUserInfo] = useState({} as {balance: number, donationIds: number[], votesInfo: {behavior: number, voteTime: number, donationIdVotedOn: number}[], awardInfo: {id: number, URI: string, awardTime: number}[], getAwardReward: boolean, getInitialGold: boolean})
    // 捐赠信息
    const [donationsInfo, setDonationsInfo] = useState([] as {id: number, content: string, creator: string, voteStartTime: number, voteEndTime: number, status: number, votesInfo: {behavior: number, voteTime: number, voter: string}[], getGoldReward: boolean}[])
    // 发布捐赠需要消耗的金币Gold
    const [goldConsumedByDonation, setGoldConsumedByDonation] = useState(0)
    // 投票需要消耗的金币Gold
    const [goldConsumedByVote, setGoldConsumedByVote] = useState(0)
    // 最大投票次数
    const [maxVotingTimes, setMaxVotingTimes] = useState(0)
    // 领取金币Gold的数量
    const [initialUserGold, setInitialUserGold] = useState(0)
    // 所有用户地址
    const [userAddresses, setUserAddresses] = useState([] as string[])

    // 自动获取用户的信息（余额，发起捐赠的id，投票信息）
    const getUserInfo = async () => {
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
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getUserInfo()
        }
    }, [account])

    // 自动读取所有用户的地址
    const getUserAddresses = async () => {
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _userAddresses = await DonationAndVotingSystemContract_Contract.methods.getUserAddresses().call({from: account})
                setUserAddresses(_userAddresses)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getUserAddresses()
        }
    }, [account])

    // 自动获取所有捐赠的信息
    const getDonationInfo = async () => {
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _donationIds = await DonationAndVotingSystemContract_Contract.methods.getDonationIds().call({from: account})
                const __donationsIds = _donationIds.map((item: string) => +item)
                const _donationInfo = await Promise.all(__donationsIds.map(async (id: number) => {
                    try {
                        const _donationInformation = await DonationAndVotingSystemContract_Contract.methods.getDonationInformation(id, timeNow()).call({from: account})
                        const _donationVotesInformation = await DonationAndVotingSystemContract_Contract.methods.getDonationVotesInformation(id, timeNow()).call({from: account})
                        const __donationVotesInformation = _donationVotesInformation[0].map((item: number, index: number) => {
                            return {
                                behavior: +_donationVotesInformation[0][index],
                                voteTime: +_donationVotesInformation[1][index] === 0 ? null : +_donationVotesInformation[1][index],
                                voter: _donationVotesInformation[2][index] === 0 ? null : +_donationVotesInformation[2][index]
                            }
                        })
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
                console.log("_donationInfo: ", _donationInfo)
                setDonationsInfo(_donationInfo.reverse())
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getDonationInfo()
        }
    }, [account])

    // 自动获取发布捐赠需要消耗的金币数量Gold
    const getGoldConsumedByDonation = async () => {
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _goldConsumedByDonation = await DonationAndVotingSystemContract_Contract.methods.getGoldConsumedByDonation().call({from: account})
                setGoldConsumedByDonation(_goldConsumedByDonation)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getGoldConsumedByDonation()
        }
    }, [account])

    // 自动获取投票所需要的金币数量Gold
    const getGoldConsumedByVote = async () => {
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _goldConsumedByVote = await DonationAndVotingSystemContract_Contract.methods.getGoldConsumedByVote().call({from: account})
                setGoldConsumedByVote(_goldConsumedByVote)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getGoldConsumedByVote()
        }
    }, [account])

    // 自动获取最大投票次数
    const getMaxVotingTimes = async () => {
        if (DonationAndVotingSystemContract_Contract) {
            try {
                const _maxVotingTimes = await DonationAndVotingSystemContract_Contract.methods.getMaxVotingTimes().call({from: account})
                setMaxVotingTimes(_maxVotingTimes)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getMaxVotingTimes()
        }
    }, [account])

    // 自动获取金币Gold的数量
    const getInitialUserGold = async () => {
        if (GoldContract_Contract) {
            try {
                const _initialUserGold = await GoldContract_Contract.methods.getInitialUserGold().call({from: account})
                setInitialUserGold(_initialUserGold)
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }
    useEffect(() => {
        if (account !== '') {
            getInitialUserGold()
        }
    }, [account])

    // 手动领取金币Gold
    const getGold = async () => {
        if (account === '') {
            setErrorMessage('你尚未连接钱包！')
            return
        }
        if (GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.getGold().send({from: account})
                getUserInfo()
                getDonationInfo()
                setSuccessMessage('成功领取初始金币。')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }

    // 手动领取纪念品
    const getAwardReward = async () => {
        if (account === '') {
            setErrorMessage('你尚未连接钱包！')
            return
        }
        if (DonationAndVotingSystemContract_Contract && AwardContract_Contract) {
            try {
                await DonationAndVotingSystemContract_Contract.methods.getAwardReward().send({from: account})
                getUserInfo()
                getDonationInfo()
                setSuccessMessage('恭喜！你获得了纪念品！')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }

    // 手动领取金币奖励
    const getGoldRewardFromDonationApproved = async (id: number) => {
        if (account === '') {
            setErrorMessage('你尚未连接钱包！')
            return
        }
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                await DonationAndVotingSystemContract_Contract.methods.getGoldRewardFromDonationApproved(id).send({from: account})
                getUserInfo()
                getDonationInfo()
                setSuccessMessage('恭喜！你因为捐赠通过得到了金币Gold奖励！')
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }

    // 手动发起新的捐赠
    const addNewDonation = async (content: string, startTime: number, endTime: number) => {
        if (account === '') {
            setErrorMessage('你尚未连接钱包！')
            return
        }
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.approve(DonationAndVotingSystemContract_Contract.options.address, goldConsumedByDonation).send({from: account})
                await DonationAndVotingSystemContract_Contract.methods.addNewDonation(content, startTime, endTime).send({from: account})
                getUserInfo()
                getDonationInfo()
                setSuccessMessage('你成功发布了一项新的捐赠')
                setSubmit(true)
                _donationContent = ""
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }

    // 手动投票
    const voteOnDonation = async (behavior: number, id: number) => {
        if (account === '') {
            setErrorMessage('你尚未连接钱包！')
            return
        }
        if (DonationAndVotingSystemContract_Contract && GoldContract_Contract) {
            try {
                await GoldContract_Contract.methods.approve(DonationAndVotingSystemContract_Contract.options.address, goldConsumedByVote).send({from: account})
                await DonationAndVotingSystemContract_Contract.methods.voteOnDonation(behavior, id).send({from: account})
                getUserInfo()
                getDonationInfo()
                if (behavior === 1) {
                    setSuccessMessage('你成功投出了赞成票。请记住，你共有' + maxVotingTimes + '次投票机会。')
                } else {
                    setSuccessMessage('你成功投出了反对票。请记住，你共有' + maxVotingTimes + '次投票机会。')
                }
            } catch (error: any) {
                revertOutput(error)
            }
        } else {
            setErrorMessage('合约不存在！')
        }
    }

    // Ant Design相关内容
    const { Header, Content,  Footer, Sider } = Layout;

    // 侧边菜单栏
    const [menuKey, setMenuKey] = useState(0);
    const _items = [
        { icon: ShopOutlined, label: "捐赠中心" },
        { icon: UserOutlined, label: "用户中心" }
    ]
    const items: MenuProps['items'] = _items.map((value, index) => ({
        key: String(index),
        icon: React.createElement(value.icon),
        label: value.label
    }))

    // 用户颜色
    const colorGroup = ["red", "gold", "green", "cyan", "magenta","orange","lime","geekblue","volcano","purple"]

    // 表格数据
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
                                <Popconfirm title={"投票将消耗" + goldConsumedByVote + " Gold。你目前拥有" + userInfo.balance + " Gold。确定继续吗？"} onConfirm={() => voteOnDonation(1, item.id)} okText="确定" cancelText="取消" placement="leftTop">
                                    <Button icon={<CheckSquareOutlined />}>赞成</Button>
                                </Popconfirm>
                                <Popconfirm title={"投票将消耗" + goldConsumedByVote + " Gold。你目前拥有" + userInfo.balance + " Gold。确定继续吗？"} onConfirm={() => voteOnDonation(0, item.id)} okText="确定" cancelText="取消" placement="leftTop">
                                    <Button icon={<CloseSquareOutlined />}>反对</Button>
                                </Popconfirm>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action = <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)}>领取金币Gold奖励</Button>;

                    }
                    return {
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />} color={item.creator === account ? "blue" : (colorGroup[userAddresses.indexOf(item.creator) % 10])}>{item.creator}</Tag>,
                        votesInfo: item.votesInfo.filter((item) => {return item.behavior == 1}).length + "/" + item.votesInfo.filter((item) => {return item.behavior == 0}).length,
                        status: (item.status == 0 ? <Tag color="processing">正在投票中</Tag> : (item.status == 1 ? <Tag color="error">已拒绝</Tag> : (item.status == 2 ? <Tag color="success">已通过</Tag> : <Tag color="warning">投票尚未开始</Tag>))),
                        action: button_action
                    }
                }))
            } catch (error: any) {
                revertOutput(error)
            }
        }
    }, [donationsInfo])
    useEffect(() => {
        if (account !== "" && donationsInfo && userInfo.donationIds) {
            try {
                const _allDonationData = donationsInfo.map((item) => {
                    let button_action!:JSX.Element;
                    if (item.status === 0) {
                        button_action =
                            <div>
                                <Popconfirm title={"投票将消耗" + goldConsumedByVote + " Gold。你目前拥有" + userInfo.balance + " Gold。确定继续吗？"} onConfirm={() => voteOnDonation(1, item.id)} okText="确定" cancelText="取消" placement="leftTop">
                                    <Button icon={<CheckSquareOutlined />}>赞成</Button>
                                </Popconfirm>
                                <Popconfirm title={"投票将消耗" + goldConsumedByVote + " Gold。你目前拥有" + userInfo.balance + " Gold。确定继续吗？"} onConfirm={() => voteOnDonation(0, item.id)} okText="确定" cancelText="取消" placement="leftTop">
                                    <Button icon={<CloseSquareOutlined />}>反对</Button>
                                </Popconfirm>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action = <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)}>领取金币Gold奖励</Button>;
                    }
                    return {
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        votesInfo: <Button type="link" onClick={() => info(item.id)}>{item.votesInfo.filter((item) => {return item.behavior === 1}).length + "/" + item.votesInfo.filter((item) => {return item.behavior === 0}).length}</Button>,
                        status: (item.status === 0 ? <Tag color="processing">正在投票中</Tag> : (item.status === 1 ? <Tag color="error">已拒绝</Tag> : (item.status === 2 ? <Tag color="success">已通过</Tag> : <Tag color="warning">投票尚未开始</Tag>))),
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
                                <Button icon={<CheckSquareOutlined />} onClick={() => voteOnDonation(1, item.id)}>赞成</Button>
                                <Button icon={<CloseSquareOutlined />} onClick={() => voteOnDonation(0, item.id)}>反对</Button>
                            </div>;
                    } else if (item.status === 2 && item.getGoldReward === true) {
                        button_action =
                            <Button icon={<DollarCircleOutlined />} onClick={() => getGoldRewardFromDonationApproved(item.id)}>领取金币Gold奖励</Button>;
                    }
                    return {
                        id: item.id,
                        voteStartTime: getDate(item.voteStartTime),
                        voteEndTime: getDate(item.voteEndTime),
                        content: item.content,
                        creator: <Tag icon={<UserOutlined />}>{item.creator}</Tag>,
                        votesInfo: item.votesInfo,
                        status: (item.status === 0 ? <Tag color="processing">正在投票中</Tag> : (item.status === 1 ? <Tag color="error">已拒绝</Tag> : (item.status === 2 ? <Tag color="success">已通过</Tag> : <Tag color="warning">投票尚未开始</Tag>))),
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
                            behavior: (_item.behavior === 1 ? "赞成" : "反对")
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
                    console.log("item: ", item)
                    if (!item.donationIdVotedOn) {
                        console.warn("donationIdVotedOn is undefined for item: ", item);
                    } else {
                        console.log("item.donationIdVotedOn: ", item.donationIdVotedOn);
                    }
                    return {
                        behavior: (item.behavior == 1 ? "赞成" : "反对"),
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
            title: '编号',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: '开始时间',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: '截止时间',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: '捐赠内容',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: '发起人',
            dataIndex: 'creator',
            key: 'creator',
            align: 'center' as 'center',
        },
        {
            title: '赞成数/反对数',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: '捐赠状态',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
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
            title: '编号',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: '开始时间',
            dataIndex: 'voteStartTime',
            key: 'voteStartTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteStartTime) - Date.parse(b.voteStartTime),
        },
        {
            title: '截止时间',
            dataIndex: 'voteEndTime',
            key: 'voteEndTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteEndTime) - Date.parse(b.voteEndTime),
        },
        {
            title: '捐赠内容',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: '赞成数/反对数',
            dataIndex: 'votesInfo',
            key: 'votesInfo',
            align: 'center' as 'center',
        },
        {
            title: '捐赠状态',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as 'center',
        },
        {
            title: '操作',
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
            title: '投票的捐赠编号',
            dataIndex: 'donationIdVotedOn',
            key: 'donationIdVotedOn',
            align: 'center' as 'center',
        },
        {
            title: '投票的捐赠内容',
            dataIndex: 'content',
            key: 'content',
            align: 'center' as 'center',
        },
        {
            title: '投票时间',
            dataIndex: 'voteTime',
            key: 'voteTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteTime) - Date.parse(b.voteTime),
        },
        {
            title: '投票行为',
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
            title: '投票时间',
            dataIndex: 'voteTime',
            key: 'voteTime',
            align: 'center' as 'center',
            sorter: (a, b) => Date.parse(a.voteTime) - Date.parse(b.voteTime),
        },
        {
            title: '投票人',
            dataIndex: 'voter',
            key: 'voter',
            align: 'center' as 'center',
        },
        {
            title: '投票行为',
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
            title: '纪念品独有编号',
            dataIndex: 'id',
            key: 'id',
            align: 'center' as 'center',
        },
        {
            title: '纪念品名称',
            dataIndex: 'URI',
            key: 'URI',
            align: 'center' as 'center',
        },
        {
            title: '领取时间',
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
            return <Table dataSource={allDonationData} columns={columnsDonation} pagination={{
                hideOnSinglePage: true, // 只有一页时不显示分页
                pageSize: 5,
                showTotal: () => `共 ${allDonationData.length} 条`,
                total: allDonationData.length,
            }} />
        }
    }

    const UserDonationTable = () => {
        if (userDonationData.length === 0) {
            return <Empty />
        } else {
            return <Table dataSource={userDonationData} columns={columnsUserDonation} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `共 ${userDonationData.length} 条`,
                total: userDonationData.length,
            }}/>
        }
    }

    const UserVoteTable = () => {
        if (userVoteData.length === 0) {
            return <Empty />
        } else {
            console.log("userVoteData: ", userVoteData)
            return <Table dataSource={userVoteData} columns={columnsVote} pagination={{
                hideOnSinglePage: true,
                pageSize: 5,
                showTotal: () => `共 ${userVoteData.length} 条`,
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
                showTotal: () => `共 ${userDonationVoteData.filter((item) => item.id === id.id).length} 条`,
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
                showTotal: () => `共 ${userAwardData.length} 条`,
                total: userAwardData.length,
            }}/>
        }
    }

    // 提交捐赠数据
    let _donationContent = ""
    let _startTime = 0
    let _endTime = 0
    let timeValidity = false
    const { TextArea } = Input
    const { RangePicker } = DatePicker

    const [open, setOpen] = useState(false)
    const [submit, setSubmit] = useState(false)

    const showModal = () => {
        setOpen(true)
        setSubmit(false)
    }

    const handleOk = async () => {
        await addNewDonation(_donationContent, _startTime, _endTime)
    }

    const handleCancel = () => {
        setOpen(false)
        setSubmit(false)
        getUserInfo()
        getDonationInfo()
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
            setErrorMessage("开始时间和结束时间必须设置！");
        } else if (_endTime < timeNow()) {
            timeValidity = false;
            setErrorMessage("结束时间必须在未来！")
        } else {
            timeValidity = true;
        }
    }

    // 捐赠中心的HTML
    const DonationCenter = () => {
        // console.log("donationInfo: ", donationsInfo)
        return (
            <Layout className="site-layout" style={{ marginLeft: 200, minHeight: 900}}>
                {(errorMessage !== "" && open === false) && <Alert type="error" message={errorMessage} banner closable afterClose={()=>setErrorMessage("")} />}
                {(successMessage !== "" && open === false) && <Alert type="success" message={successMessage} banner closable afterClose={()=>setSuccessMessage("")} />}
                <Header className="header">
                    <br />
                    <Row justify="space-around" align="middle">

                        <Col span={6}><FileTextOutlined /> <br/>提案总数{donationsInfo.length}项</Col>
                        <Col span={6}><FileDoneOutlined /> <br/>提案通过率{donationsInfo.length==0?0:(donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length)==0?0:(donationsInfo.filter((item)=>item.status===2).length / (donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length) * 100).toFixed(2)}%</Col>
                        <Col span={6}><TeamOutlined /> <br/>参与总人数{userAddresses.length}人</Col>
                        <Col span={6}><HighlightOutlined /> <br/>有效投票总次数{donationsInfo.length==0?0:((donationsInfo.map((item)=>item.votesInfo.length)).map((item,index,array)=>index!=0?array[0]+=item:array[0]+=0)).reverse()[0]}次</Col>

                    </Row>
                </Header>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: 'white', overflow: 'initial'}}>
                    <div className="toolBar">
                        <Row justify="space-around" align="middle">
                            <Col span={20}>
                                <Popconfirm title={"提交捐赠将消耗" + goldConsumedByDonation + " Gold。你目前拥有" + userInfo.balance + " Gold。确定继续吗？"} onConfirm={showModal} okText="确定" cancelText="取消" placement="top">
                                    {account !== "" && <Button type="primary" size="large" shape="round" icon={<FileAddOutlined />}>发起捐赠</Button>}
                                </Popconfirm>
                            </Col>
                        </Row>
                    </div>
                    <Modal
                        transitionName=""
                        maskTransitionName=""
                        open={open}
                        title="发起捐赠"
                        onOk={handleOk}
                        onCancel={handleCancel}
                        footer={[
                            <Button key="back" onClick={handleCancel}>取消</Button>,
                            <Button key="submit" type="primary" onClick={handleOk} disabled={submit}>{submit === true ? "捐赠已提交" : "提交捐赠"}</Button>
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
                <Footer style={{ textAlign: 'center' }}>Ant Design ©2024 Created by Ant UED</Footer>
            </Layout>
        )
    }

    // 成功信息与错误信息
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    // 更好地输出revert报错信息
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
    }

    // 用户中心的HTML
    const UserCenter = () => {
        console.log("userInfo: ", userInfo)
        // console.log("userInfo.votesInfo: ", userInfo.votesInfo)
        return (
            <Layout className="site-layout" style={{ marginLeft: 200, minHeight: 900 }}>
                {errorMessage !== "" && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                {successMessage !== "" && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                <Header className="header">
                    <br />
                    <Row justify="space-around" align="middle">
                        <Col span={6}><FileTextOutlined /><br />你一共提交了{(account === "" || !userInfo.donationIds) ? 0 : userInfo.donationIds.length}项捐赠</Col>
                        <Col span={6}><HighlightOutlined /><br />你一共参与了{(account === "" || !userInfo.votesInfo) ? 0 : userInfo.votesInfo.length}次投票</Col>
                        <Col span={6}><GiftOutlined /><br />你拥有{(account === "" || !userInfo.awardInfo) ? 0 : userInfo.awardInfo.length}个纪念品</Col>
                        <Col span={6}><DollarCircleOutlined /><br/>你拥有{(account === "" ? 0 : userInfo.balance)} Gold</Col>
                    </Row>
                </Header>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: "white", overflow: 'initial'}}>
                    <div className="userBar">
                        <Row justify="space-around" align="middle" style={{fontSize: "xxx-large"}}>
                            <Col span={20}>
                                <GitlabFilled />
                            </Col>
                        </Row>
                        <Row justify="space-around" align="middle">
                            <Col span={20}>
                                {account === '' ? '你尚未连接' : <Tag style={{fontSize: "x-large", padding: "16px"}} icon={<UserOutlined />} color="blue">{account}</Tag>}
                            </Col>
                        </Row>
                        <Row justify="space-around" align="middle">
                            <Col span={20}>
                                {account === "" ? <Button type="primary" size="large" shape="round" icon={<WalletOutlined />} onClick={onClickConnectWallet} >连接钱包</Button> : (userInfo.getInitialGold === true ? <Button type="primary" size="large" shape="round" icon={<DollarCircleOutlined />} onClick={getGold}>领取初始金币Gold</Button> : (userInfo.getAwardReward === true && <Button type="primary" size="large" shape="round" icon={<GiftOutlined />} onClick={getAwardReward}>领取纪念品奖励</Button>))}
                            </Col>
                        </Row>
                    </div>
                </Content>
                <Content style={{ margin: '16px', marginTop: '0px', padding: '16px', backgroundColor: 'white', overflow: 'initial' }}>
                    <Tabs
                        defaultActiveKey="1"
                        centered
                        items={[
                            {label: (<span><FileTextOutlined />我的捐赠</span>), key: '1', children: <UserDonationTable />},
                            {label: (<span><HighlightOutlined />我的投票</span>), key: '2', children: <UserVoteTable />},
                            {label: (<span><GiftOutlined />我的纪念品</span>), key: '3', children: <UserAwardTable />}
                        ]}
                    />
                    <Modal
                        transitionName=""
                        maskTransitionName=""
                        open={open_}
                        title={"捐赠" + voteInfoId + "的投票详情"}
                        onCancel={handleCancel_}
                        width={800}
                        footer={[
                            <Button key="ok" type="primary" onClick={handleCancel_}>确定</Button>
                        ]}
                    >
                        {(errorMessage !== "" && open === true) && <Alert type="error" message={errorMessage} banner closable afterClose={() => setErrorMessage("")} />}
                        {(successMessage !== "" && open === true) && <Alert type="success" message={successMessage} banner closable afterClose={() => setSuccessMessage("")} />}
                        <UserDonationVoteTable id={voteInfoId} />
                    </Modal>

                </Content>
                <Footer style={{ textAlign: 'center' }}>Ant Design ©2024 Created by Ant UED</Footer>
            </Layout>
        )
    }

    // 总的HTML
    return (
        <Layout hasSider className="site-layout">
            <Sider
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0
                }}
                theme="light"
            >
                <div className="logo"><SmileFilled />Donation & Voting</div>
                <Menu theme="light" mode="inline" defaultSelectedKeys={['0']} items={items} onSelect={(item:any)=>{setMenuKey(item.key)}}/>
            </Sider>
            {/* 注意下面的导航栏切换部分，需要使用两个=来判断menuKey的值，而不是三个 */}
            {/*{menuKey === 0 ? <DonationCenter /> : (menuKey === 1 ? <UserCenter /> : menuKey)}*/}
            {menuKey == 0 ? <DonationCenter /> : (menuKey == 1 ? <UserCenter /> : menuKey)}
        </Layout>
    )

}

export default DonationAndVotingSystemContractPage


