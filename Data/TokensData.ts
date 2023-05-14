import { BigNumber } from "ethers";

export const WorkingProcent: BigNumber =  BigNumber.from("10") // 1% * 10 = 10%

export const AmountGasLimit: string = "2000000"; // Gas 2 000 000

export const HighGasPrice: BigNumber = BigNumber.from('1000000000'); // 0,000000001 ETH (1 Gwei)

export const SwapsCounter: number = 3; // Number of swaps

// Array with token address for swaping. 
export const TokensData: string[] = [
    "0x0faF6df7054946141266420b43783387A78d82A9", // USDC 
    "0x3e7676937A7E96CFB7616f255b9AD9FF47363D4b", // DAI 
    "0x40609141Db628BeEE3BfAB8034Fc2D8278D0Cc78", // LINK
    "0x0BfcE1D53451B4a8175DD94e6e029F7d8a701e9c", // wBTC
    "0x26C78bD5901f57DA8aa5CF060aB2116d26906B5E", // TEST
];

// Token address for liqudity providing.
export const TokenForLiquidity: string = "0x0faF6df7054946141266420b43783387A78d82A9"; // USDC
