import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import * as flatted from 'flatted';
import * as fs from 'fs';
import { AccountsData } from "./Data/AccountsData";
import { TokensData, AmountGasLimit, WorkingProcent , ySYNCTokenAddress, PoolData } from "./Data/TokensData";
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
const zkSyncProvider = new zksync.Provider("https://testnet.era.zksync.dev");

// Ethereum Provider
const ethProvider = ethers.getDefaultProvider("goerli");

/*
 * swapETHToToken function.
 */

async function swapETHToToken(signer: any, AmountETH: string, tokenOutAddress: string) {
    

    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        Contracts.ClassicPoolFactoryContract.Address,
        Contracts.ClassicPoolFactoryContract.ContractABI,
        zkSyncProvider
    );

    // wETH is used internally by the pools.
    var tokenForPool = Contracts.wETH.Address;
    
    var ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenForPool, tokenOutAddress);
    writeLog("ClassicPoolAddress =");
    writeLog(ClassicPoolAddress);

    // Checks whether the pool exists.
    if (ClassicPoolAddress === ethers.constants.AddressZero) {
        throw Error('Pool not exists');
    }

    const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

    const swapData: string = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint8"],
        [tokenForPool, signer.address, withdrawMode], // tokenIn, to, withdraw mode
    );

    // We have only 1 step.
    const steps = [{
        pool: ClassicPoolAddress,
        data: swapData,
        callback: ethers.constants.AddressZero, // we don't have a callback
        callbackData: '0x',
    }];

    // We have only 1 path.
    const paths = [{
        steps: steps,
        tokenIn: ethers.constants.AddressZero,
        amountIn: AmountETH,
    }];

    // Gets the router contract.
    const router = new ethers.Contract(
        Contracts.RouterContract.Address, 
        Contracts.RouterContract.ContractABI, 
        signer
    );    

    // The router will handle the deposit to the pool's vault account.
        var response = await router.swap(
            paths, // paths
            0, // amountOutMin // Note: ensures slippage here
            ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), // deadline // 30 minutes
            {
                value: AmountETH,
                gasLimit: AmountGasLimit
            }
        );
    var tx = await response.wait();
    writeLog("Swap ETH to token transaction hash =");
    writeLog(tx.transactionHash);
}

/*
 * swapTokenToETH function.
 */

async function swapTokenToETH(signer: any, tokenInAddress: string, tokenInAmount: string) {
    
    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        Contracts.ClassicPoolFactoryContract.Address,
        Contracts.ClassicPoolFactoryContract.ContractABI,
        zkSyncProvider
    );

    // wETH is used internally by the pools.
    var tokenOutPool = Contracts.wETH.Address;
    
    var ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenInAddress, tokenOutPool);
    writeLog("ClassicPoolAddress =");
    writeLog(ClassicPoolAddress);

    // Checks whether the pool exists.
    if (ClassicPoolAddress === ethers.constants.AddressZero) {
        throw Error('Pool not exists');
    }
        
    // Create token contract for check allowance
    const tokenInContract = new ethers.Contract(tokenInAddress, zksync.utils.IERC20, signer)
    
    // Check allowance
    let allowedAmount: ethers.BigNumber = await tokenInContract.allowance(signer.address, Contracts.RouterContract.Address)
    
    if (allowedAmount.lte(tokenInAmount)) {
    
        // Send approve for router contract
        let approveTx = await tokenInContract.approve(Contracts.RouterContract.Address, MAX_APPROVE_VALUE)
        var getApproveTx = await approveTx.wait()
        writeLog("Approve transaction hash =")
        writeLog(getApproveTx.transactionHash);
    } 

    

    const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

    const swapData: string = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint8"],
        [tokenInAddress, signer.address, withdrawMode], // tokenIn, to, withdraw mode
    );

    // We have only 1 step.
    const steps = [{
        pool: ClassicPoolAddress,
        data: swapData,
        callback: ethers.constants.AddressZero, // we don't have a callback
        callbackData: '0x',
    }];

    // We have only 1 path.
    const paths = [{
        steps: steps,
        tokenIn: tokenInAddress,
        amountIn: tokenInAmount,
    }];

    // Gets the router contract.
    const router = new ethers.Contract(
        Contracts.RouterContract.Address, 
        Contracts.RouterContract.ContractABI, 
        signer
    );    

    // The router will handle the deposit to the pool's vault account.
        var response = await router.swap(
            paths, // paths
            0, // amountOutMin // Note: ensures slippage here
            ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), // deadline // 30 minutes
            {
                gasLimit: AmountGasLimit
            }
        );
    var tx = await response.wait();
    writeLog("Swap token to ETH transaction hash =");
    writeLog(tx.transactionHash);
}

/*
 * Main function.
 */

// Swaps and liqudity providing
async function main(){

    // Work cycle
    for (let i = 0; i <= AccountsData.length - 1; i++){
        
        // Creating a wallet
        const WorkingSigner = new zksync.Wallet(AccountsData[i], zkSyncProvider, ethProvider);
        writeLog("Account now working =");
        writeLog(WorkingSigner.address);        
        
        // ySYNC token balance
        const InitialTokenInContract = new ethers.Contract(ySYNCTokenAddress, zksync.utils.IERC20, WorkingSigner)
    
        // Check balance
        var balanceOf = await InitialTokenInContract.balanceOf(WorkingSigner.address)
        var TokenBalance: string = balanceOf.toString()
        writeLog("Initial ySYNC token balance =");
        writeLog(TokenBalance);

        // Getting balance in ETH
        var AccountBalanceETH = await WorkingSigner.getBalance()
        writeLog("Initial ETH balance =");
        writeLog(AccountBalanceETH.toString());

        // Count working amount for ETH
        var WorkingETH: string = AccountBalanceETH.div(WorkingProcent).toString();
        writeLog(WorkingETH);

        // Token cycle
        for (let k = 0; k <= TokensData.length - 1; k++){

            // Swap ETH for token
            await swapETHToToken(WorkingSigner, WorkingETH, TokensData[k]);

            // Create token contract for check token balance
            const tokenInContract = new ethers.Contract(TokensData[k], zksync.utils.IERC20, WorkingSigner)
    
            // Check balance
            var balanceOf = await tokenInContract.balanceOf(WorkingSigner.address)
            var TokenBalance: string = balanceOf.toString()
            writeLog("Token balance =");
            writeLog(TokenBalance);

            // Swap token for ETH
            await swapTokenToETH(WorkingSigner, TokensData[k], TokenBalance)
        }

        // Getting final balance in ETH
        var FinalAccountBalanceETH = await WorkingSigner.getBalance()
        writeLog("Final ETH balance =");
        writeLog(FinalAccountBalanceETH.toString());
    }
}


// async function addLiquidity(AccountData: string, token1Address: string, token1Amount: string, token2Address: string, token2Amount: string) {
    
//     // Make signer from private key
//     const signer = new zksync.Wallet(AccountData, zkSyncProvider, ethProvider)
//     writeLog(signer);

//     address pool, //
//     TokenInput[] calldata inputs, //
//     bytes calldata data, //
//     uint minLiquidity, //
//     address callback, //
//     bytes calldata callbackData //
// }
 

main();