/* eslint-disable */
import React, { useEffect, useState} from 'react';
import { isMetaMaskAvailable } from "../../utils/contracts"
import DonationAndVotingSystemContract from "../../pages/DonationAndVotingSystemContract/DonationAndVotingSystemContract"
import { Error404Page_2 } from "../../pages/DonationAndVotingSystemContract/404_2"
import "./Home.css"

function Home() {
    const [metaMaskDetected, setMetaMaskDetected] = useState<boolean | null>(null);

    useEffect(() => {
        // 组件加载时，检测 MetaMask 状态 / When the component is loaded, the MetaMask status is detected
        setMetaMaskDetected(isMetaMaskAvailable);
    }, []);

    if (metaMaskDetected === null) {
        // 等待 MetaMask 检测完成 / Wait for MetaMask detection to complete
        return <div className="loading-container">Loading...</div>;
    }

    if (!metaMaskDetected) {
        // console.log("进入404页面")
        return (
            <div className="App">
                <Error404Page_2></Error404Page_2>

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

export default Home;