import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import * as flatted from 'flatted';
import * as fs from 'fs';
import { AccountsData } from "./Data/AccountsData";
import { TokensData, AmountGasLimit, WorkingProcent , TokenForLiquidity, SwapsCounter, HighGasPrice, timeMax, timeMin } from "./Data/TokensData";
import { Contracts } from "./Data/Contracts";
import { randomInt } from "crypto";

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
const zkSyncProvider = new zksync.Provider("https://mainnet.era.zksync.io/");   

// Ethereum Provider
const ethProvider = ethers.getDefaultProvider();

/*
 * swapETHToToken function.
 */

async function swapETHToToken(signer: any, AmountETH: string, tokenOutAddress: string, AmountGasPrice: any) {
    

    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        Contracts.ClassicPoolFactoryContract.Address,
        Contracts.ClassicPoolFactoryContract.ContractABI,
        zkSyncProvider
    );

    // wETH is used internally by the pools.
    let tokenForPool = Contracts.wETH.Address;
    
    let ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenForPool, tokenOutAddress);

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
            gasPrice: AmountGasPrice,
            gasLimit: AmountGasLimit
        }
    );

    let tx = await response.wait();
    writeLog(`Swap ETH to token transaction hash = ${tx.transactionHash}`);
    console.log(`Swap ETH to token transaction hash = ${tx.transactionHash}`);

}

/*
 * swapTokenToETH function.
 */

async function swapTokenToETH(signer: any, tokenInAddress: string, tokenInAmount: string, AmountGasPrice: any) {
    
    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        Contracts.ClassicPoolFactoryContract.Address,
        Contracts.ClassicPoolFactoryContract.ContractABI,
        zkSyncProvider
    );

    // wETH is used internally by the pools.
    let tokenOutPool = Contracts.wETH.Address;
    
    let ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenInAddress, tokenOutPool);

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
        let getApproveTx = await approveTx.wait()
        writeLog(`Approve transaction hash = ${getApproveTx.transactionHash}`)
        console.log(`Approve transaction hash = ${getApproveTx.transactionHash}`);

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
    let response = await router.swap(
            paths, // paths
            0, // amountOutMin // Note: ensures slippage here
            ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), // deadline // 30 minutes
            {
                gasPrice: AmountGasPrice,
                gasLimit: AmountGasLimit
            }
        );

    let tx = await response.wait();
    writeLog(`Swap token to ETH transaction hash = ${tx.transactionHash}`);
    console.log(`Swap token to ETH transaction hash = ${tx.transactionHash}`);
    
}

/*
 * Add liquidity function.
 */

async function addLiquidityTokenAndETH(
    signer: any, 
    AmountETH: string, 
    tokenAddress: string, 
    tokenAmount: string, 
    AmountGasPrice: any
    ): Promise<string> {

    let alreadyString: string = "Liquidity already provided!"
    let readyString: string = "Liquidity now provided!"

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

    if (Number(LPTokensBalance) != 0){
        return alreadyString
    }

    // Calldata for token input.
    let TokenInput = [{
        token: tokenAddress,
        amount: tokenAmount  
    },{
        token: ethers.constants.AddressZero,
        amount: AmountETH     
    }]

    // Recipient Address calldata.
    const RecipientAddressData: string = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [RecipientAddress], // address _to
    );

    // Gets the router contract.
    const router = new ethers.Contract(
        Contracts.RouterContract.Address, 
        Contracts.RouterContract.ContractABI, 
        signer
    );    

    // The router will handle the deposit to the pool's vault account.
    let response = await router.addLiquidity2(
        ClassicPoolAddress,             // pool address
        TokenInput,                     // Tokens Input
        RecipientAddressData,           // Recipient Address
        0,                              // minLiquidity // Note: ensures slippage here
        ethers.constants.AddressZero,   // we don't have a callback
        '0x',
        {
            value: AmountETH,
            gasPrice: AmountGasPrice, 
            gasLimit: AmountGasLimit
        }
    );

    let tx = await response.wait();
    writeLog(`Add token and ETH liquidity transaction hash = ${tx.transactionHash}`);
    console.log(`Add token and ETH liquidity transaction hash = ${tx.transactionHash}`);
    
    return readyString;
}

/*
 * Main function.
 */

// Swaps and liqudity providing.
async function main(){

    // Work cycle
    for (let i = 0; i <= AccountsData.length - 1; i++){
        
        // Creating a wallet.
        const WorkingSigner = new zksync.Wallet(AccountsData[i], zkSyncProvider, ethProvider);
        writeLog(`Account now working = ${WorkingSigner.address}`);
        console.log(`Account now working = ${WorkingSigner.address}`);

        
        // Check gas price
        var AmountGasPrice = await zkSyncProvider.getGasPrice();
        
        if (AmountGasPrice.lt(HighGasPrice)){

        // Count price for ETH.
        let priceETH = await zkSyncProvider.getTokenPrice(ethers.constants.AddressZero);
        writeLog(`Price ETH = ${priceETH}`);
        console.log(`Price ETH = ${priceETH}`);

        // Count price in cents for ETH.
        let priceETHInCents = (Number(priceETH))*100;
    
        // 10-11$
        let liquidityAmountInCents = 1000 + randomInt(100) // random 10-11$ 
        let liquidityAmountInETH = Math.floor(1000000000000000000 / (priceETHInCents / liquidityAmountInCents)) 
        writeLog(`liquidityAmountInETH =${ethers.utils.formatUnits(liquidityAmountInETH.toString(),18)}`);
        console.log(`liquidityAmountInETH =${ethers.utils.formatUnits(liquidityAmountInETH.toString(),18)}`);

        // Providing liquidity.
        let promise = await addLiquidityTokenAndETH(WorkingSigner, liquidityAmountInETH.toString() , TokenForLiquidity, '0', AmountGasPrice)
        writeLog(promise);

        // Getting balance in ETH.
        let AccountBalanceETH = await WorkingSigner.getBalance();
        writeLog(`Initial ETH balance = ${AccountBalanceETH.toString()}`);
        console.log(`Initial ETH balance = ${AccountBalanceETH.toString()}`);

        // Count working amount for ETH.
        let WorkingETH: string = AccountBalanceETH.div(100).mul(WorkingProcent).toString();

        // Swap counter cycle.
        for (let n = 0; n <= SwapsCounter - 1; n++){

            // Random tokens.
            const shuffledTokensData = TokensData.sort(() => Math.random() - 0.5);

            // Tokens swap cycle.
            for (let k = 0; k <= shuffledTokensData.length - 1; k++){

                // Swap ETH for token.
                await swapETHToToken(WorkingSigner, WorkingETH, shuffledTokensData[k], AmountGasPrice);

                // Create token contract for check token balance.
                const tokenInContract = new ethers.Contract(shuffledTokensData[k], zksync.utils.IERC20, WorkingSigner)
    
                // Check balance.
                let balanceOf = await tokenInContract.balanceOf(WorkingSigner.address)
                let TokenBalance: string = balanceOf.toString()

                // Swap token for ETH.
                await swapTokenToETH(WorkingSigner, shuffledTokensData[k], TokenBalance, AmountGasPrice)
            }    
        }

        // Getting final balance in ETH.
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
            setTimeout(main, 300000)
        }

        let timer = randomInt(timeMax) + timeMin;
    
        writeLog(`Work with account №${i} is finished`);
        console.log(`Work with account №${i} is finished`);
        writeLog(`Waiting ${timer/1000} sec`);
        console.log(`Waiting ${timer/1000} sec`);
    
        await new Promise(r => setTimeout(r, timer)); // Wait 3-11 sec

    }

    writeLog("PROGRAMM END");
    console.log("PROGRAMM END");

}

main();