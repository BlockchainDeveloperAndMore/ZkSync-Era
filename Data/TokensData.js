"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolData = exports.TokensData = exports.ySYNCTokenAddress = exports.AmountGasLimit = exports.WorkingProcent = void 0;
var ethers_1 = require("ethers");
exports.WorkingProcent = ethers_1.BigNumber.from("1000000000"); // 100/10000000 = 0.0000001%
exports.AmountGasLimit = "14000000";
exports.ySYNCTokenAddress = "0xaa751dA7944DEEeC557ab9e0281dFAA78F35e111";
// Array with token address for swaping 
exports.TokensData = [
    "0x0faF6df7054946141266420b43783387A78d82A9",
    "0x3e7676937A7E96CFB7616f255b9AD9FF47363D4b",
    "0x40609141Db628BeEE3BfAB8034Fc2D8278D0Cc78",
    "0x0BfcE1D53451B4a8175DD94e6e029F7d8a701e9c",
    "0x26C78bD5901f57DA8aa5CF060aB2116d26906B5E", // TEST
];
// Array with token address for liqudity providing. (Default value = USDC/ETH)
exports.PoolData = [
    "0x0faf6df7054946141266420b43783387a78d82a9" // USDC
];
