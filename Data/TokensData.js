"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenForLiquidity = exports.TokensData = exports.SwapsCounter = exports.AmountGasLimit = exports.WorkingProcent = void 0;
var ethers_1 = require("ethers");
exports.WorkingProcent = ethers_1.BigNumber.from("13"); // 100/100 = 0.01%
exports.AmountGasLimit = "80000000";
1;
exports.SwapsCounter = 3; // Number of swaps
// Array with token address for swaping. 
exports.TokensData = [
    "0x0faF6df7054946141266420b43783387A78d82A9",
    "0x3e7676937A7E96CFB7616f255b9AD9FF47363D4b",
    "0x40609141Db628BeEE3BfAB8034Fc2D8278D0Cc78",
    "0x0BfcE1D53451B4a8175DD94e6e029F7d8a701e9c",
    "0x26C78bD5901f57DA8aa5CF060aB2116d26906B5E", // TEST
];
// Token address for liqudity providing.
exports.TokenForLiquidity = "0x0faF6df7054946141266420b43783387A78d82A9"; // USDC
