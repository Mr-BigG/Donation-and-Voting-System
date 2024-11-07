import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
const config: HardhatUserConfig = {
  solidity: {
    version:"0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ganache: {
      url:'http://127.0.0.1:8545', // 本地网络——ganache区块链端口，如果要用Sepolia网络则需要使用下面的。每次部署之后，需要在contract-addresses.json更改合约地址
    },
    ganache_public: {
      url:'http://0.0.0.0:7545', // 公共网络——ganache区块链端口
    },
    sepolia: {
      url:'https://sepolia.infura.io/v3/802ff1f6ca554c3ea370f0acebae425d', // 公共网络——Sepolia区块链端口，约消耗0.1309ETH
      chainId: 11155111,
      accounts: ['',], // 钱包的私钥地址 / Input your private key here if you need to deploy to the Sepolia test network
      // gasPrice: 3000000000, // 20 gwei (这是一个示例，可以根据需要调整)
      // gas: 6000000, // 2100000 gas limit (这是一个示例，可以根据需要调整)
    },
    // Sepolia address for contracts
    // 0x0ab375AD2Acaade04BbdcA673BB29202eC9C2400
    // 0x84c4D05EAfC2D5cEc7Bd164EFd7356e3960c8f78
    // 0x4b67B9869cF9Ff42c53BFA8A8BFBb69cc326543C
    sepolia_alchemy: {
      url:'https://eth-sepolia.g.alchemy.com/v2/OXRZlzs7oGOxCQ_BFlOYnCulvVt3RTuo', // 公共网络——Sepolia-alchemy区块链端口

      accounts: ['',], // 钱包的私钥地址
      // gasPrice: 3000000000, // 20 gwei (这是一个示例，可以根据需要调整)
      // gas: 6000000, // 2100000 gas limit (这是一个示例，可以根据需要调整)
    }
  }
};

export default config;
