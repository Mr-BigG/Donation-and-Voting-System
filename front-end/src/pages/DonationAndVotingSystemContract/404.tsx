import React from "react";
import { Result, Button } from 'antd';
import "./404.css"

const Error404Page = () => {
    return (
        <div className="Error404">
            <Result
                status="warning"
                title="No MetaMask detected"
                subTitle="Please install the MetaMask extension first to continue using the application. MetaMask is a browser extension that can be used to access the Ethereum blockchain."
                extra={[
                    <Button type="primary" key="install">
                        <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer">
                            Install MetaMask Now
                        </a>
                    </Button>
                ]}
            />
        </div>
    )
}

export { Error404Page }