import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import * as flatted from 'flatted';
import * as fs from 'fs';
import { AccountsData } from "./Data/AccountsData";
import { TokensData, AmountGasLimit, WorkingProcent , TokenForLiquidity } from "./Data/TokensData";
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
    let tokenForPool = Contracts.wETH.Address;
    
    let ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenForPool, tokenOutAddress);
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

    let tx = await response.wait();
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
    let tokenOutPool = Contracts.wETH.Address;
    
    let ClassicPoolAddress: string = await classicPoolFactory.getPool(tokenInAddress, tokenOutPool);
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
        let getApproveTx = await approveTx.wait()
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
    let response = await router.swap(
            paths, // paths
            0, // amountOutMin // Note: ensures slippage here
            ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), // deadline // 30 minutes
            {
                gasLimit: AmountGasLimit
            }
        );

    let tx = await response.wait();
    writeLog("Swap token to ETH transaction hash =");
    writeLog(tx.transactionHash);
}

/*
 * Add liquidity function.
 */

async function addLiquidityTokenAndETH(signer: any, AmountETH: string, tokenAddress: string, tokenAmount: string) {

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
    writeLog("ClassicPoolAddress =");
    writeLog(ClassicPoolAddress);

    // Checks whether the pool exists.
    if (ClassicPoolAddress === ethers.constants.AddressZero) {
        throw Error('Pool not exists');
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
    writeLog("RecipientAddressData =");
    writeLog(RecipientAddressData);

    // Gets the router contract.
    const router = new ethers.Contract(
        Contracts.RouterContract.Address, 
        Contracts.RouterContract.ContractABI, 
        signer
    );    

    // The router will handle the deposit to the pool's vault account.
    let response = await router.addLiquidity(
        ClassicPoolAddress,             // pool address
        TokenInput,                     // Tokens Input
        RecipientAddressData,           // Recipient Address
        0,                              // minLiquidity // Note: ensures slippage here
        ethers.constants.AddressZero,   // we don't have a callback
        '0x',
        {
            value: AmountETH, 
            gasLimit: AmountGasLimit
        }
    );

    let tx = await response.wait();
    writeLog("Add token and ETH liquidity transaction hash =");
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

        // Getting balance in ETH
        let AccountBalanceETH = await WorkingSigner.getBalance();
        writeLog("Initial ETH balance =");
        writeLog(AccountBalanceETH.toString());

        // Count working amount for ETH
        let WorkingETH: string = AccountBalanceETH.div(WorkingProcent).toString();
        writeLog(WorkingETH);

        // Count price for ETH
        let priceETH = await zkSyncProvider.getTokenPrice(ethers.constants.AddressZero);
        writeLog("Price ETH =");
        writeLog(priceETH);

        // Count price in cents for ETH
        let priceETHInCents = (Number(priceETH))*100;
        writeLog(priceETHInCents);
    
        // 10-11$
        let liquidityAmountInCents = 1000 + randomInt(100) // random 10-11$ 
        let liquidityAmountInETH = Math.floor(1000000000000000000 / (priceETHInCents / liquidityAmountInCents)) 
        writeLog("liquidityAmountInETH =");
        writeLog(liquidityAmountInETH); 

        // Providing liquidity.
        await addLiquidityTokenAndETH(WorkingSigner, liquidityAmountInETH.toString() , TokenForLiquidity, '0')

        // Random tokens
        const shuffledTokensData = TokensData.sort(() => Math.random() - 0.5); 

        // Tokens swap cycle
        for (let k = 0; k <= shuffledTokensData.length - 1; k++){

            // Swap ETH for token
            await swapETHToToken(WorkingSigner, WorkingETH, shuffledTokensData[k]);

            // Create token contract for check token balance
            const tokenInContract = new ethers.Contract(shuffledTokensData[k], zksync.utils.IERC20, WorkingSigner)
    
            // Check balance
            let balanceOf = await tokenInContract.balanceOf(WorkingSigner.address)
            let TokenBalance: string = balanceOf.toString()
            writeLog("Token balance =");
            writeLog(TokenBalance);

            // Swap token for ETH
            await swapTokenToETH(WorkingSigner, shuffledTokensData[k], TokenBalance)
        }

        // Getting final balance in ETH
        let FinalAccountBalanceETH = await WorkingSigner.getBalance()
        writeLog("Final ETH balance =");
        writeLog(FinalAccountBalanceETH.toString());
    }
}

main()