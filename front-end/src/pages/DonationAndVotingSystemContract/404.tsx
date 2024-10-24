import React from "react";
import { Result, Button } from 'antd';
import "./404.css"

const Error404Page = () => {
    return (
        <div className="Error404">
            <Result
                status="warning"
                title="未检测到 MetaMask"
                subTitle="请先安装 MetaMask 扩展程序以继续使用本应用。MetaMask 是一个浏览器扩展，可用于访问以太坊区块链。"
                extra={[
                    <Button type="primary" key="install">
                        <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer">
                            安装 MetaMask
                        </a>
                    </Button>
                ]}
            />
        </div>
    )
}

export { Error404Page }