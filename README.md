# This is the group project for EE4032

# 项目文件结构如下
* /.idea文件夹：这是IntellIJ针对项目的的配置文件夹，一般不必理会
* /contracts文件夹：后端文件夹（即智能合约）
  * /artifacts文件夹：编译后自动生成，不必理会
  * /cache文件夹：编译后自动生成，不必理会
  * /contracts文件夹：存放本项目的.sol文件
  * /script文件夹：里面的ts文件用来部署合约到指定区块链环境，例如ganache或sepolia等
  * /typechain-types文件夹：编译后自动生成，不必理会
* /front-end文件夹：前端文件夹，即React框架所在目录
  * /node_modules文件夹：存放项目的前端部分的各种依赖，由front-end目录下的package.json生成，git时不必考虑它，可以删除也可以通过npm i命令重新下载依赖
  * /public文件夹：React框架初始化时的静态文件目录
  * /src文件夹：前端代码，本系统使用Typescript编写前端页面（极其类似于Javascript）
  * /package.json文件：前端项目的依赖配置，需要用什么库或组件就在这里声明并指定版本号，然后npm i即可
* /node_modules文件夹：存放项目根目录的依赖，由根目录的package.json生成

## 2024.10.01 17:00 Guo Shaojie 更新说明：根据demo项目重构了智能合约.sol文件，前端重构完成度约为70%
## 2024.10.03 18:25 Guo Shaojie 更新说明：前端重构完成度约为95%， 已知BUG为：启动react后，左侧导航栏切换时页面会变白
## 2024.10.10 18:50 Guo Shaojie 更新说明：之前的BUG已修复，已知新的BUG如下：
* 点击“发起捐赠”按钮，输入捐赠内容和起止时间，点击“提交捐赠”按钮后，浏览器控制台会报错，据推断存在问题的代码段为DonationAndVotingSystemContract.tsx文件中的约965行，即 
``` typescript jsx
<Col span={6}><FileDoneOutlined /> <br/>提案通过率{donationsInfo.length==0?0:(donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length)==0?0:(donationsInfo.filter((item)=>item.status===2).length / (donationsInfo.filter((item)=>item.status===2).length+donationsInfo.filter((item)=>item.status===1).length) * 100).toFixed(2)}%</Col>
```
* 猜测是变量donationsInfo的问题，因为正常情况下在用户创建新的捐赠后，后端应该返回包含捐赠内容的列表，即具有内容的donationsInfo，但是本项目中donationsInfo变量为undefined。
* 已多次检查后端（即.sol）文件的代码内容，暂未发现错误，所以此BUG应该是前端的问题。
## 2024.10.14 15:20 Guo Shaojie 更新说明：项目所有主要BUG已修复，次要BUG（纪念品相关）的触发机制如下：
* 系统的正常逻辑为：用户每通过3个donation，均有资格获取一次纪念品奖励reward
  * 如果用户依次通过donation并依次领取（不囤积奖励，也就是用户每通过3个donation就立刻领取纪念品奖励）的情况下，不会触发此BUG
  * 如果用户选择囤积奖励，比如通过3个donation后没有立刻领取纪念品奖励，而是选择继续通过donation并累计达到6次后，此时用户首次点击“领取纪念品奖励”按钮后会报JSON错误，且没有任何奖励发送到用户的账户；当用户第二次点击该按钮后，奖励会发送到用户账户，但此时奖励变为了3个而不是2个（正常情况下每3个approval的donation会得到一个纪念品，6个approval的donation应该是2个纪念品），且按钮“领取纪念品奖励”没有隐藏，如果用户继续点击它，系统虽然会提示领取成功，但实际没有任何纪念品到账

该BUG不影响系统的主要功能，如果开发时间紧张，可以在Pre的时候刻意忽略它。


## 待完成功能
* 限制每位用户对每个donation的rejected vote数量为1次 ★★★★ CJY
* 设置一个合适的函数，使得用户对每个donation的每次approval vote的价格逐次递增 ★★★★★ LJY
* 添加gold => ETH的功能 ★★★★★ LJY / GSJ
  如何将捐献的ETH转换为gold，有gas的损耗（不确定的数量）
* 平台的抽成（后续如果部署在以太坊主网，可以用来盈利） ★★ GSJ
* 更改前端各个组件的样式、布局、颜色等 ★★★ GSJ

## 提示
* 建议使用Remix编写后端，使用IntellIJ编写前端，因为IntellIJ比VS Code方便太多了
* 每次改动.sol文件后，都需要在Remix编译并复制新的abi，然后将新的abi覆盖掉项目中旧的abi，完成后还需将三个.sol文件使用以下命令重新部署在本地链（ganache）或其它公开链（Sqpolia）。开发建议使用本地链，项目开发完成的时候再部署到公开链，毕竟公开链的ETH很难获取
``` shell
cd contracts
npx hardhat run ./scripts/deploy.ts --network ganache
```
* 最后在目录front-end下，使用终端键入以下命令重新启动前端
``` shell
npm start
```
