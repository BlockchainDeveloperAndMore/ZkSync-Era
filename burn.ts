import * as zksync from "zksync-web3";
import * as ethers from "ethers";
import * as flatted from 'flatted';
import * as fs from 'fs';
import { AccountsData } from "./Data/AccountsData";
import { AmountGasLimit, TokenForLiquidity } from "./Data/TokensData";
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
 * Burn liquidity function.
 */

async function burnLiquidityTokenAndETH(signer: any, tokenAddress: string) {

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

    // LP token balance
    const LPTokenInContract = new ethers.Contract(ClassicPoolAddress, zksync.utils.IERC20, signer)
    
    // Check balance
    let balanceOf = await LPTokenInContract.balanceOf(signer.address)
    let LPTokensBalance: string = balanceOf.toString()
    writeLog("LP token balance =");
    writeLog(LPTokensBalance);

    // Check allowance
    let allowedAmount: ethers.BigNumber = await LPTokenInContract.allowance(signer.address, Contracts.RouterContract.Address)
    
    if (allowedAmount.lte(LPTokensBalance)) {
    
        // Send approve for router contract
        let approveTx = await LPTokenInContract.approve(Contracts.RouterContract.Address, MAX_APPROVE_VALUE)
        let getApproveTx = await approveTx.wait()
        writeLog("Approve transaction hash =")
        writeLog(getApproveTx.transactionHash);
    } 

    const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

    // Recipient Address calldata.
    const RecipientAddressData: string = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint8"],
        [ETHAddress, RecipientAddress, withdrawMode], // address _tokenOut address _to, uint8 _withdrawMode
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
    let response = await router.burnLiquiditySingle(
        ClassicPoolAddress,             // pool address
        LPTokensBalance,                // LP                
        RecipientAddressData,           // Recipient Address
        0,                              // minAmounts // Note: ensures slippage here                             
        ethers.constants.AddressZero,   // we don't have a callback
        '0x',
        { 
            gasLimit: AmountGasLimit
        }
    );

    let tx = await response.wait();
    writeLog("Burn liquidity transaction hash =");
    writeLog(tx.transactionHash);
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
        writeLog("Account now working =");
        writeLog(WorkingSigner.address);        

        // Getting balance in ETH
        let AccountBalanceETH = await WorkingSigner.getBalance();
        writeLog("Initial ETH balance =");
        writeLog(AccountBalanceETH.toString());

        // Burn
        await burnLiquidityTokenAndETH(WorkingSigner, TokenForLiquidity)

        // Getting final balance in ETH
        let FinalAccountBalanceETH = await WorkingSigner.getBalance()
        writeLog("Final ETH balance =");
        writeLog(FinalAccountBalanceETH.toString());
    }
}

burn();