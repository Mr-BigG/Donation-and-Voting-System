/* eslint-disable */
import React, { useEffect, useState} from 'react';
import './App.css';
import { isMetaMaskAvailable } from "./utils/contracts"
import DonationAndVotingSystemContract from "./pages/DonationAndVotingSystemContract/DonationAndVotingSystemContract"
import {Error404Page} from "./pages/DonationAndVotingSystemContract/404"

function App() {
    const [metaMaskDetected, setMetaMaskDetected] = useState<boolean | null>(null);

    useEffect(() => {
        // 组件加载时，检测 MetaMask 状态
        setMetaMaskDetected(isMetaMaskAvailable);
    }, []);

    if (metaMaskDetected === null) {
        // 等待 MetaMask 检测完成
        return <div className="loading-container">加载中...</div>;
    }

    if (!metaMaskDetected) {
        console.log("进入404页面")
        return (
            <div className="App">
                <Error404Page></Error404Page>

            </div>
        )
    } else {
        return (
            <div className="App">
                <DonationAndVotingSystemContract></DonationAndVotingSystemContract>
            </div>
        );
    }

}

export default App;
