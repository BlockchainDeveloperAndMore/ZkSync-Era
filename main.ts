import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import { AccountsData } from "./AccountsData";

// Currently, only one environment is supported.
const zkSyncProvider = new zksync.Provider("https://testnet.era.zksync.dev");
const ethProvider = ethers.getDefaultProvider("goerli");

//Creating a wallet
const zkSyncWallet = new zksync.Wallet(AccountsData, zkSyncProvider, ethProvider);

async function commitEthBalance(){
// Retrieving the current (committed) zkSync ETH balance of an account
const committedEthBalance = await zkSyncWallet.getBalance(zksync.utils.ETH_ADDRESS);
console.log(committedEthBalance);
}
commitEthBalance();