import { ethers } from "hardhat";

async function main() {
  const DonationAndVotingSystemContract = await ethers.getContractFactory("DonationAndVotingSystemContract");
  const DonationAndVotingSystemContract_obj = await DonationAndVotingSystemContract.deploy(3, 1000, 100, 10000, );
  await DonationAndVotingSystemContract_obj.deployed();

  console.log(`合约 DonationAndVotingSystemContract 已成功部署在 ${DonationAndVotingSystemContract_obj.address}`);

  const GoldContract = await DonationAndVotingSystemContract_obj.gold();
  console.log(`合约 GoldContract 已成功部署在 ${GoldContract}`);

  const  AwardContract = await DonationAndVotingSystemContract_obj.awards();
  console.log(`合约 AwardContract 已成功部署在 ${AwardContract}`);
}

main().catch((error) => {
  console.log("发现错误");
  console.error(error);
  process.exitCode = 1;
})