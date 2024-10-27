/* eslint-disable */
import Addresses from './contract-addresses.json'
import DonationAndVotingSystemContract from './abis/DonationAndVotingSystemContract.json'
import GoldContract from './abis/GoldContract.json'
import AwardContract from './abis/AwardContract.json'

const Web3 = require('web3');

// 创建web3实例 / Create a web3 instance
// @ts-ignore
let web3;
let isMetaMaskAvailable = false;

if (typeof window !== "undefined") {
    // @ts-ignore
    if (window.ethereum) {
        // @ts-ignore
        web3 = new Web3(window.ethereum);
        isMetaMaskAvailable = true;
        console.log("MetaMask is connected");
        // @ts-ignore
    } else if (window.web3) {
        // @ts-ignore
        web3 = new Web3(window.web3.currentProvider);
        isMetaMaskAvailable = true;
        console.warn("An older version of the MetaMask provider is used");
    } else {
        console.error('No MetaMask detected. Please install the MetaMask extension');
    }
}


if (!isMetaMaskAvailable) {

}

// 修改地址为部署的合约地址 / Change the address to the deployed contract address
// ABI文件为合约编译后自动生成 / The ABI file is automatically generated after the contract is compiled
const DonationAndVotingSystemContractAddress = Addresses.DonationAndVotingSystemContract
const DonationAndVotingSystemContractABI = DonationAndVotingSystemContract.abi;
const GoldContractAddress = Addresses.GoldContract;
const GoldContractABI = GoldContract.abi;
const AwardContractAddress = Addresses.AwardContract;
const AwardContractABI = AwardContract.abi;

let DonationAndVotingSystemContract_Contract;
let GoldContract_Contract;
let AwardContract_Contract;

if (isMetaMaskAvailable) {
    // 获取合约实例 / Get contract instance
    DonationAndVotingSystemContract_Contract = new web3.eth.Contract(DonationAndVotingSystemContractABI, DonationAndVotingSystemContractAddress);
    GoldContract_Contract = new web3.eth.Contract(GoldContractABI, GoldContractAddress);
    AwardContract_Contract = new web3.eth.Contract(AwardContractABI, AwardContractAddress);

} else {
    DonationAndVotingSystemContract_Contract = null;
    GoldContract_Contract = null;
    AwardContract_Contract = null;
}


export { web3, DonationAndVotingSystemContract_Contract, GoldContract_Contract, AwardContract_Contract, isMetaMaskAvailable}
