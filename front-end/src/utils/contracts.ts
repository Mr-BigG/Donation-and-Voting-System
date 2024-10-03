/* eslint-disable */
import Addresses from './contract-addresses.json'
import DonationAndVotingSystemContract from './abis/DonationAndVotingSystemContract.json'
import GoldContract from './abis/GoldContract.json'
import AwardContract from './abis/AwardContract.json'

const Web3 = require('web3');

// 创建web3实例
// @ts-ignore
let web3 = new Web3(window.web3.currentProvider);

// 修改地址为部署的合约地址
// ABI文件为合约编译后自动生成？
const DonationAndVotingSystemContractAddress = Addresses.DonationAndVotingSystemContract
const DonationAndVotingSystemContractABI = DonationAndVotingSystemContract.abi;
const GoldContractAddress = Addresses.GoldContract;
const GoldContractABI = GoldContract.abi;
const AwardContractAddress = Addresses.AwardContract;
const AwardContractABI = AwardContract.abi;

// 获取合约实例
const DonationAndVotingSystemContract_Contract = new web3.eth.Contract(DonationAndVotingSystemContractABI, DonationAndVotingSystemContractAddress);
const GoldContract_Contract = new web3.eth.Contract(GoldContractABI, GoldContractAddress);
const AwardContract_Contract = new web3.eth.Contract(AwardContractABI, AwardContractAddress);

export { web3, DonationAndVotingSystemContract_Contract, GoldContract_Contract, AwardContract_Contract}
