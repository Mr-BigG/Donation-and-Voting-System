/* eslint-disable */
import React, { useEffect, useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { isMetaMaskAvailable } from "./utils/contracts"
import DonationAndVotingSystemContract from "./pages/DonationAndVotingSystemContract/DonationAndVotingSystemContract"
import {Error404Page} from "./pages/DonationAndVotingSystemContract/404"
import Home from  "./pages/DonationAndVotingSystemContract/Home"
import Welcome from "./pages/DonationAndVotingSystemContract/Welcome";


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/home" element={<Home />} />
            </Routes>
        </Router>
    )

}

export default App;
