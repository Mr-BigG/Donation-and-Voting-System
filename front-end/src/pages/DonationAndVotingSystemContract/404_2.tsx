import React from "react";
import "./404_2.css"

const Error404Page_2 = () => {
    // @ts-ignore
    return (
        <section className="w3l-errorpage">
            <div className="error404">
                <div className="wrapper">
                    <div className="logo-brand">
                        <h1>MetaMask <div className="position-head"><span className="">E</span>rror
                        </div>Page</h1>
                    </div>
                </div>
                <div className="wrapper">
                    <div className="midle-page">
                        <section className="error-container">
                            <span><span>4</span></span>
                            <span>0</span>
                            <span><span>4</span></span>
                        </section>
                        <h1>No MetaMask Detected</h1>
                        <p className="zoom-area para">Please install the MetaMask extension first to continue using the application. MetaMask is a browser extension that can be used to access the Ethereum blockchain.</p>

                        <div className="link-container">
                            <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer" className="more-link">Install MetaMask Now</a>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export { Error404Page_2 }