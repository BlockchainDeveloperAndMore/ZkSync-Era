import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import * as flatted from 'flatted';
import * as fs from 'fs';
import { AccountsData } from "./Data/AccountsData";
import { AmountGasLimit, TokenForLiquidity, HighGasPrice, timeMax, timeMin } from "./Data/TokensData";
import { Contracts } from "./Data/Contracts";

/*
 * Const.
 */

// Max approve value.
const MAX_APPROVE_VALUE: string = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

/*
 * Logs function.
 */

// Opening a file for recording
const logFile = fs.createWriteStream('logs.txt', { flags: 'a' });

// Function for logging to a file
function writeLog(log: any) {
  const logString = flatted.stringify(log);
  logFile.write(`${new Date().toISOString()} ${logString}\n`);
}

/*
 * Setup Providers.
 */

// ZkSync Era Provider
const zkSyncProvider = new zksync.Provider("https://mainnet.era.zksync.io");

// Ethereum Provider
const ethProvider = ethers.getDefaultProvider();

/*
 * Burn liquidity function.
 */

async function burnLiquidityTokenAndETH(signer: any, tokenAddress: string, AmountGasPrice: any) {

    let alreadyString: string = "Liquidity already burned!"
    let readyString: string = "Liquidity now burned!"

    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        Contracts.ClassicPoolFactoryContract.Address,
        Contracts.ClassicPoolFactoryContract.ContractABI,
        zkSyncProvider
    );

    // LP tokens recipient address.
    const RecipientAddress = signer.address;

    // wETH is used internally by the pools.
    let ETHAddress = Contracts.wETH.Address;
    
    let ClassicPoolAddress: string = await classicPoolFactory.getPool(ETHAddress, tokenAddress);

    // Checks whether the pool exists.
    if (ClassicPoolAddress === ethers.constants.AddressZero) {
        throw Error('Pool not exists');
    }

    // LP token balance
    const LPTokenInContract = new ethers.Contract(ClassicPoolAddress, zksync.utils.IERC20, signer)
    
    // Check balance
    let balanceOf = await LPTokenInContract.balanceOf(signer.address)
    let LPTokensBalance: string = balanceOf.toString()

    if (Number(LPTokensBalance) == 0){
        return alreadyString
    }

    // Check allowance
    let allowedAmount: ethers.BigNumber = await LPTokenInContract.allowance(signer.address, Contracts.RouterContract.Address)
    
    if (allowedAmount.lte(LPTokensBalance)) {
    
        // Send approve for router contract
        let approveTx = await LPTokenInContract.approve(
            Contracts.RouterContract.Address, 
            MAX_APPROVE_VALUE,
            {
                gasPrice: AmountGasPrice,
                gasLimit: AmountGasLimit
            }
        )

        let getApproveTx = await approveTx.wait();

        writeLog(`Approve transaction hash = ${getApproveTx.transactionHash}`)
        console.log(`Approve transaction hash = ${getApproveTx.transactionHash}`);

    } 

    const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

    // Recipient Address calldata.
    const RecipientAddressData: string = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint8"],
        [ETHAddress, RecipientAddress, withdrawMode], // address _tokenOut address _to, uint8 _withdrawMode
    );

    // Gets the router contract.
    const router = new ethers.Contract(
        Contracts.RouterContract.Address, 
        Contracts.RouterContract.ContractABI, 
        signer
    );    

    // The router will handle the deposit to the pool's vault account.
    let response = await router.burnLiquiditySingle(
        ClassicPoolAddress,             // pool address
        LPTokensBalance,                // LP                
        RecipientAddressData,           // Recipient Address
        0,                              // minAmounts // Note: ensures slippage here                             
        ethers.constants.AddressZero,   // we don't have a callback
        '0x',
        { 
            gasPrice: AmountGasPrice,
            gasLimit: AmountGasLimit
        }
    );

    let tx = await response.wait();
    writeLog(`Burn liquidity transaction hash = ${tx.transactionHash}`);
    console.log(`Burn liquidity transaction hash = ${tx.transactionHash}`);

    return readyString;
}

/*
 * Main burn liquidity function.
 */

// Burn liquidity
async function burn(){

    // Work cycle
    for (let i = 0; i <= AccountsData.length - 1; i++){
        
        // Creating a wallet
        const WorkingSigner = new zksync.Wallet(AccountsData[i], zkSyncProvider, ethProvider);
        writeLog(`Account now working = ${WorkingSigner.address}`);
        console.log(`Account now working = ${WorkingSigner.address}`); 

        // Check gas price
        var AmountGasPrice = await zkSyncProvider.getGasPrice();
        
        if (AmountGasPrice.lt(HighGasPrice)){

        // Getting balance in ETH
        let AccountBalanceETH = await WorkingSigner.getBalance();
        writeLog(`Initial ETH balance = ${AccountBalanceETH.toString()}`);
        console.log(`Initial ETH balance = ${AccountBalanceETH.toString()}`);

        // Burn
        await burnLiquidityTokenAndETH(WorkingSigner, TokenForLiquidity, AmountGasPrice)

        // Getting final balance in ETH
        let FinalAccountBalanceETH = await WorkingSigner.getBalance()
        writeLog(`Final ETH balance = ${ethers.utils.formatUnits(FinalAccountBalanceETH.toString(), 18)}`);
        console.log(`Final ETH balance = ${ethers.utils.formatUnits(FinalAccountBalanceETH.toString(), 18)}`);
        writeLog("==============================================");
        console.log("==============================================");
        } else {
            writeLog("GAS PRICE TO HIGH");
            console.log("GAS PRICE TO HIGH");
            writeLog("WAITING 5 MINS AND TRY AGAIN");
            console.log("WAITING 5 MINS AND TRY AGAIN");
            writeLog("==============================================");
            console.log("==============================================");
            setTimeout(burn, 300000)
        }
    }

    writeLog("BURNING END");
    console.log("BURNING END");

}

burn();