"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var zksync = require("zksync-web3");
var ethers = require("ethers");
var flatted = require("flatted");
var fs = require("fs");
var AccountsData_1 = require("./Data/AccountsData");
var TokensData_1 = require("./Data/TokensData");
var Contracts_1 = require("./Data/Contracts");
/*
 * Const.
 */
// Max approve value.
var MAX_APPROVE_VALUE = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
/*
 * Logs function.
 */
// Opening a file for recording
var logFile = fs.createWriteStream('logs.txt', { flags: 'a' });
// Function for logging to a file
function writeLog(log) {
    var logString = flatted.stringify(log);
    logFile.write("".concat(new Date().toISOString(), " ").concat(logString, "\n"));
}
/*
 * Setup Providers.
 */
// ZkSync Era Provider
var zkSyncProvider = new zksync.Provider("https://testnet.era.zksync.dev");
// Ethereum Provider
var ethProvider = ethers.getDefaultProvider("goerli");
/*
 * Burn liquidity function.
 */
function burnLiquidityTokenAndETH(signer, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var classicPoolFactory, RecipientAddress, ETHAddress, ClassicPoolAddress, LPTokenInContract, balanceOf, LPTokensBalance, allowedAmount, approveTx, getApproveTx, withdrawMode, RecipientAddressData, router, response, tx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    classicPoolFactory = new ethers.Contract(Contracts_1.Contracts.ClassicPoolFactoryContract.Address, Contracts_1.Contracts.ClassicPoolFactoryContract.ContractABI, zkSyncProvider);
                    RecipientAddress = signer.address;
                    ETHAddress = Contracts_1.Contracts.wETH.Address;
                    return [4 /*yield*/, classicPoolFactory.getPool(ETHAddress, tokenAddress)];
                case 1:
                    ClassicPoolAddress = _a.sent();
                    writeLog("ClassicPoolAddress =");
                    writeLog(ClassicPoolAddress);
                    // Checks whether the pool exists.
                    if (ClassicPoolAddress === ethers.constants.AddressZero) {
                        throw Error('Pool not exists');
                    }
                    LPTokenInContract = new ethers.Contract(ClassicPoolAddress, zksync.utils.IERC20, signer);
                    return [4 /*yield*/, LPTokenInContract.balanceOf(signer.address)];
                case 2:
                    balanceOf = _a.sent();
                    LPTokensBalance = balanceOf.toString();
                    writeLog("LP token balance =");
                    writeLog(LPTokensBalance);
                    return [4 /*yield*/, LPTokenInContract.allowance(signer.address, Contracts_1.Contracts.RouterContract.Address)];
                case 3:
                    allowedAmount = _a.sent();
                    if (!allowedAmount.lte(LPTokensBalance)) return [3 /*break*/, 6];
                    return [4 /*yield*/, LPTokenInContract.approve(Contracts_1.Contracts.RouterContract.Address, MAX_APPROVE_VALUE)];
                case 4:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 5:
                    getApproveTx = _a.sent();
                    writeLog("Approve transaction hash =");
                    writeLog(getApproveTx.transactionHash);
                    _a.label = 6;
                case 6:
                    withdrawMode = 1;
                    RecipientAddressData = ethers.utils.defaultAbiCoder.encode(["address", "address", "uint8"], [ETHAddress, RecipientAddress, withdrawMode]);
                    writeLog("RecipientAddressData =");
                    writeLog(RecipientAddressData);
                    router = new ethers.Contract(Contracts_1.Contracts.RouterContract.Address, Contracts_1.Contracts.RouterContract.ContractABI, signer);
                    return [4 /*yield*/, router.burnLiquiditySingle(ClassicPoolAddress, // pool address
                        LPTokensBalance, // LP                
                        RecipientAddressData, // Recipient Address
                        0, // minAmounts // Note: ensures slippage here                             
                        ethers.constants.AddressZero, // we don't have a callback
                        '0x', {
                            gasLimit: TokensData_1.AmountGasLimit
                        })];
                case 7:
                    response = _a.sent();
                    return [4 /*yield*/, response.wait()];
                case 8:
                    tx = _a.sent();
                    writeLog("Burn liquidity transaction hash =");
                    writeLog(tx.transactionHash);
                    return [2 /*return*/];
            }
        });
    });
}
/*
 * Main burn liquidity function.
 */
// Burn liquidity
function burn() {
    return __awaiter(this, void 0, void 0, function () {
        var i, WorkingSigner, AccountBalanceETH, FinalAccountBalanceETH;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i <= AccountsData_1.AccountsData.length - 1)) return [3 /*break*/, 6];
                    WorkingSigner = new zksync.Wallet(AccountsData_1.AccountsData[i], zkSyncProvider, ethProvider);
                    writeLog("Account now working =");
                    writeLog(WorkingSigner.address);
                    return [4 /*yield*/, WorkingSigner.getBalance()];
                case 2:
                    AccountBalanceETH = _a.sent();
                    writeLog("Initial ETH balance =");
                    writeLog(AccountBalanceETH.toString());
                    // Burn
                    return [4 /*yield*/, burnLiquidityTokenAndETH(WorkingSigner, TokensData_1.TokenForLiquidity)
                        // Getting final balance in ETH
                    ];
                case 3:
                    // Burn
                    _a.sent();
                    return [4 /*yield*/, WorkingSigner.getBalance()];
                case 4:
                    FinalAccountBalanceETH = _a.sent();
                    writeLog("Final ETH balance =");
                    writeLog(FinalAccountBalanceETH.toString());
                    _a.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
burn();
