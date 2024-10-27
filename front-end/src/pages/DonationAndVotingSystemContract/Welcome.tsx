import React from 'react';
import './Welcome.css';
import { useNavigate } from 'react-router-dom';
import { FaEthereum, FaHandHoldingHeart, FaVoteYea } from 'react-icons/fa';

const Welcome: React.FC = () => {
    const navigate = useNavigate();

    const handleButtonClick = () => {
        navigate('/home'); // 跳转到<Home>组件 / Jump to the <Home> component
    };

    return (
        <div className="welcome-page">
            <div className="welcome-header">
                <FaEthereum className="welcome-icon animate-icon" />
                <FaHandHoldingHeart className="welcome-icon animate-icon" />
                <FaVoteYea className="welcome-icon animate-icon" />
                <h1 className="welcome-title">Welcome to Donation & Voting System!</h1>
                <p className="welcome-subtitle">Your trust and support will create a better future.</p>
            </div>
            <div className="welcome-content">
                <button className="welcome-button" onClick={handleButtonClick}>
                    Donate Now!
                </button>
            </div>
        </div>
    );
};

export default Welcome;