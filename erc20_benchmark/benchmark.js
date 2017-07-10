// =============================================================================
//
// ERC20 benchmark suite
//
// Instructions:
//
// 1. Start testrpc (ideally in a different terminal)
//    > /opt/node/lib/node_modules/ethereumjs-testrpc/bin/testrpc -d
// 2. Run the tests - the last arg is the bytecode file for the contract
//    > DEBUG=1 node benchmark.js erc20_solidity_opt.hex
//
// =============================================================================

// Input files
const abi_file = 'erc20_abi.json';
const evm_file = process.argv[2];

// These addresses are generated as standard by testrpc -d
const ADDR0 = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";
const ADDR1 = "0xffcf8fdee72ac11b5c542428b35eef5769c409f0";
const ADDR2 = "0x22d491bde2303f2f43325b2108d26f1eaba1e32b";

// Set up Web3. Need testrpc to be running.
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

const fs = require('fs');

// Read the Contract ABI [TODO - error handling]
const ABI = fs.readFileSync(abi_file,'utf8');
const ERC20 = web3.eth.contract(JSON.parse(ABI));

// Read the EVM bytecode [TODO - error handling]
const EVM = fs.readFileSync(evm_file,'utf8').trim();
//const GAS = web3.eth.estimateGas({data:EVM}); <-- doesn't work for Solidity
const GAS = 4000000;

// =============================================================================
// Control loop

deployAndRun();

function runAll(erc20)
{
    // Get token constants
    erc20.name.sendTransaction({from: ADDR0}, getGas);
    erc20.symbol.sendTransaction({from: ADDR0}, getGas);
    erc20.decimals.sendTransaction({from: ADDR0}, getGas);
    erc20.totalSupply.sendTransaction({from: ADDR0}, getGas);

    // First and second transfers to an account. The first should cost more
    erc20.transfer(ADDR1, 100, {from: ADDR0}, getGas);
    erc20.transfer(ADDR1, 100, {from: ADDR0}, getGas);

    // Balance
    erc20.balanceOf.sendTransaction(ADDR1, {from: ADDR0}, getGas);

    // Approval and first and second transferFroms
    erc20.approve(ADDR1, 100, {from: ADDR0}, getGas);
    erc20.transferFrom(ADDR0, ADDR2, 42, {from: ADDR1}, getGas);
    erc20.transferFrom(ADDR0, ADDR2, 42, {from: ADDR1}, getGas);

    // Reset approval amount to zero
    erc20.approve(ADDR1, 0, {from: ADDR0}, getGas);

    // Check approved allowance
    erc20.allowance.sendTransaction(ADDR1, ADDR2, {from: ADDR0}, getGas);
}

// =============================================================================
// Helper functions

function deployAndRun()
{
    ERC20.new(
        {from: ADDR0, data: EVM, gas: GAS},
        function(err, myContract){
            if(!err) {
                // NOTE: The callback will fire twice!
                // Once the contract has the transactionHash property set
                // and once its deployed on an address.
                if(myContract.address) {
                    debug(2, '[deployAndRun] Contract deployed to ' + myContract.address);
                    debug(1, '[deployAndRun] Starting benchmarks.');
                    var receipt = web3.eth.getTransactionReceipt(myContract.transactionHash);
                    debug(1, receipt.cumulativeGasUsed);
                    runAll(myContract);
                }
            } else {
                debug(1, '[deployAndRun] Error deployng contract.');
            }
        });
}

function getGas(err, transaction)
{
    if(!err) {
        debug(2, '[getGas] ' + transaction);
        var receipt = web3.eth.getTransactionReceipt(transaction);
        debug(3, JSON.stringify(receipt));
        debug(1, receipt.cumulativeGasUsed);
    }
}

// e.g. DEBUG=2 node erc20.js
let debugLevel = parseInt(process.env.DEBUG);
function debug(level, message)
{
    if(debugLevel !== NaN && debugLevel >= level) {
        console.log('DEBUG[' + level + '] ' + message);
    }
}
