// =============================================================================
//
// ERC20 test suite
//
// Instructions:
//
// 1. Compile the bytecode:
//    > lllc ../erc20.lll > erc20_evm.dat
// 2. Start testrpc (ideally in a different terminal)
//    > /opt/node/lib/node_modules/ethereumjs-testrpc/bin/testrpc -d
// 3. Run the tests:
//    > DEBUG=0 node erc20.js
//
// =============================================================================

// TODO - Refactoring
// TODO - Find a better way to pass the test function name around
// TODO - Count successes and failures
// TODO - Better criteria for debug levels

// Input files
const abi_file = 'erc20_abi.json';
const evm_file = 'erc20_evm.dat';

// Token paramaters
const TOTALSUPPLY = 100000;
const DECIMALS = 2;
const SYMBOL = 'BEN';
const NAME = 'Ben Token'

// These addresses are generated as standard by testrpc -d
const ADDR0 = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";
const ADDR1 = "0xffcf8fdee72ac11b5c542428b35eef5769c409f0";
const ADDR2 = "0x22d491bde2303f2f43325b2108d26f1eaba1e32b";
const ADDR3 = "0xe11ba2b4d45eaed5996cd0823791e0c93114882d";
const ADDR4 = "0xd03ea8624c8c5987235048901fb614fdca89b117";

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
const GAS = web3.eth.estimateGas({data:EVM});

// =============================================================================
// Control loop

// TODO - Automate this.
// TODO - Allow specific tests to be given on the command-line.

newTest(test_constants);
newTest(test_balances);
newTest(test_allowances);
newTest(test_call_invalid_function);
newTest(test_send_ether_to_transfer);
newTest(test_low_level_transfer);
newTest(test_too_little_call_data);
newTest(test_too_much_call_data);
newTest(test_invalid_address);
newTest(test_transfer);
newTest(test_transfer_too_much);
newTest(test_approve);
newTest(test_approve_too_much);
newTest(test_transfer_from_no_approval);
newTest(test_transfer_from_no_approval_zero);
newTest(test_valid_transfer);
newTest(test_invalid_transfer);
newTest(test_multiple_transfers);
newTest(test_multiple_approve);
newTest(test_transfer_from);
newTest(test_transfer_event);
newTest(test_zero_transfer_no_event);
newTest(test_approve_event);

// =============================================================================
//
// Test functions
//
// =============================================================================

// =============================================================================
// Constant functions

function test_constants(erc20)
{
    testAssert(erc20.symbol(), 'string', SYMBOL);
    testAssert(erc20.name(), 'string', NAME);
    testAssert(erc20.totalSupply(), 'uint256', TOTALSUPPLY);
    testAssert(erc20.decimals(), 'uint256', DECIMALS);
}

function test_balances(erc20)
{
    testAssert(erc20.balanceOf(ADDR0), 'uint256', TOTALSUPPLY);
    testAssert(erc20.balanceOf(ADDR1), 'uint256', 0);
    testAssert(erc20.balanceOf(ADDR2), 'uint256', 0);
}

function test_allowances(erc20)
{
    testAssert(erc20.allowance(ADDR1,ADDR2), 'uint256', 0);
}

// =============================================================================
// Input validation tests

function test_call_invalid_function(erc20)
{
    // Test behaviour when sending correct and non-existent function selectors

    // Good function call - decimals()
    testAssert(
        safeCall(web3.eth.call, {to: erc20.address, data: '0x313ce567'}),
        'isBytes32', true);

    // Call to non-existent function
    testAssert(
        safeCall(web3.eth.call, {to: erc20.address, data: '0x12345678'}),
        'bool', false);
}

function test_send_ether_to_transfer(erc20)
{
    // Any attempt to send Ether to the contract should fail.
    testAssert(
        safeCall(
            web3.eth.sendTransaction,
            {from: ADDR0, to: erc20.address, data: '0xa9059cbb', value: 1}),
        'bool', false);
}

function test_low_level_transfer(erc20)
{
    // Check this works as expected as it is the template for the following
    // tests. Transfer 1 Token from ADDR0 to ADDR1.
    testAssert(
        safeCall(
            web3.eth.sendTransaction,
            {from: ADDR0, to: erc20.address, data: '0xa9059cbb' + bytes32(ADDR1) + uint256(1)}),
        'isBytes32', true);
}

function test_too_little_call_data(erc20)
{
    // Test with transfer() function, providing truncated call data.
    testAssert(
        safeCall(
            web3.eth.sendTransaction,
            {from: ADDR0, to: erc20.address, data: '0xa9059cbb' + bytes32(ADDR1) + uint256(1).substr(2)}),
        'bool', false);
}

function test_too_much_call_data(erc20)
{
    // Test with transfer() function, providing extended call data.
    testAssert(
        safeCall(
            web3.eth.sendTransaction,
            {from: ADDR0, to: erc20.address, data: '0xa9059cbb' + bytes32(ADDR1) + uint256(1) + '00'}),
        'bool', false);
}

function test_invalid_address(erc20)
{
    // Test with transfer() function, providing a malformed address.
    testAssert(
        safeCall(
            web3.eth.sendTransaction,
            {from: ADDR0, to: erc20.address, data: '0xa9059cbb' + '01' + bytes32(ADDR1).substr(2) + uint256(1)}),
        'bool', false);
}

// =============================================================================
// Smoke tests on transfer(), approve(), transferFrom()

function test_transfer(erc20)
{
    // Transfer 100 tokens from ADDR0 to ADDR1
    testAssert(
        safeCall(erc20.transfer, ADDR1, 100, {from: ADDR0}), 
        'isBytes32', true);
}

function test_transfer_too_much(erc20)
{
    // Try to send more than totalSupply
    testAssert(
        safeCall(erc20.transfer, ADDR1, 1+TOTALSUPPLY, {from: ADDR0}), 
        'bool', false);
}

function test_approve(erc20)
{
    // Approve ADDR1 to transfer 100 tokens from ADDR0
    testAssert(
        safeCall(erc20.approve, ADDR1, 100, {from: ADDR0}), 
        'isBytes32', true);
}

function test_approve_too_much(erc20)
{
    // Approve ADDR1 to transfer more that totalSupply tokens from ADDR0
    testAssert(
        safeCall(erc20.approve, ADDR1, 1+TOTALSUPPLY, {from: ADDR0}), 
        'bool', false);
}

function test_transfer_from_no_approval(erc20)
{
    // ADDR1 tries transfer from ADDR0 to ADDR2 without having approval
    testAssert(
        safeCall(erc20.transferFrom, ADDR0, ADDR2, 100, {from: ADDR1}), 
        'bool', false);
}

function test_transfer_from_no_approval_zero(erc20)
{
    // ADDR1 tries transfer from ADDR0 to ADDR2 without having approval
    // But zero value, so should not be an error.
    testAssert(
        safeCall(erc20.transferFrom, ADDR0, ADDR2, 0, {from: ADDR1}), 
        'isBytes32', true);
}


// =============================================================================
// End-to-End Tests

function test_valid_transfer(erc20)
{
    var addr0_startTokens = erc20.balanceOf(ADDR0);
    var addr1_startTokens = erc20.balanceOf(ADDR1);

    testAssert(
        safeCall(erc20.transfer, ADDR1, 1000, {from: ADDR0}), 
        'isBytes32', true);

    testAssert(erc20.balanceOf(ADDR0), 'int256', addr0_startTokens - 100);
    testAssert(erc20.balanceOf(ADDR1), 'int256', addr1_startTokens + 100);
}

function test_invalid_transfer(erc20)
{
    var addr0_startTokens = erc20.balanceOf(ADDR0);
    var addr1_startTokens = erc20.balanceOf(ADDR1);

    testAssert(
        safeCall(erc20.transfer, ADDR1, addr0_startTokens+1, {from: ADDR0}), 
        'bool', false);

    testAssert(erc20.balanceOf(ADDR0), 'int256', addr0_startTokens);
    testAssert(erc20.balanceOf(ADDR1), 'int256', addr1_startTokens);
}

function test_multiple_transfers(erc20)
{
    var addr0_startTokens = erc20.balanceOf(ADDR0);
    var addr1_startTokens = erc20.balanceOf(ADDR1);

    var amount = 1 + Math.floor(addr0_startTokens / 3);
    
    testAssert(
        safeCall(erc20.transfer, ADDR1, amount, {from: ADDR0}), 
        'isBytes32', true);

    testAssert(
        safeCall(erc20.transfer, ADDR1, amount, {from: ADDR0}), 
        'isBytes32', true);

    testAssert(
        safeCall(erc20.transfer, ADDR1, amount, {from: ADDR0}), 
        'bool', false);

    testAssert(erc20.balanceOf(ADDR0), 'int256', addr0_startTokens - 2*amount);
    testAssert(erc20.balanceOf(ADDR1), 'int256', addr1_startTokens + 2*amount);
}

function test_multiple_approve(erc20)
{
    // Check ADDR0 => ADDR1 allowance is 0
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 0);

    // Set allowance ADDR0 => ADDR1 to 1000
    testAssert(
        safeCall(erc20.approve, ADDR1, 1000, {from: ADDR0}), 
        'isBytes32', true);

    // Check ADDR0 => ADDR1 allowance is 1000
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 1000);

    // Try to set allowance ADDR0 => ADDR1 to 500 (should fail)
    testAssert(
        safeCall(erc20.approve, ADDR1, 500, {from: ADDR0}), 
        'bool', false);

    // Check ADDR0 => ADDR1 allowance is still 1000
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 1000);

    // Set allowance ADDR0 => ADDR1 to 0
    testAssert(
        safeCall(erc20.approve, ADDR1, 0, {from: ADDR0}), 
        'isBytes32', true);

    // Check ADDR0 => ADDR1 allowance is now 0
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 0);

    // Try to set allowance ADDR0 => ADDR1 to 500 (should succeed)
    testAssert(
        safeCall(erc20.approve, ADDR1, 500, {from: ADDR0}), 
        'isBytes32', true);

    // Check ADDR0 => ADDR1 allowance is now 500
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 500);
}

function test_transfer_from(erc20)
{
    var addr0_startTokens = erc20.balanceOf(ADDR0);
    var addr2_startTokens = erc20.balanceOf(ADDR2);

    // Check ADDR0 => ADDR1 allowance is 0
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 0);

    // ADDR1 tries transfer from ADDR0 to ADDR2 with no allowance
    testAssert(
        safeCall(erc20.transferFrom, ADDR0, ADDR2, 42, {from: ADDR1}), 
        'bool', false);

    // Set allowance ADDR0 => ADDR1 to 83
    testAssert(
        safeCall(erc20.approve, ADDR1, 83, {from: ADDR0}), 
        'isBytes32', true);

    // Check ADDR0 => ADDR1 allowance is now 83
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 83);

    // ADDR1 transfers 42 from ADDR0 to ADDR2
    testAssert(
        safeCall(erc20.transferFrom, ADDR0, ADDR2, 42, {from: ADDR1}), 
        'isBytes32', true);

    // Check balance of ADDR0 is start-42, ADDR2 is +42
    testAssert(erc20.balanceOf(ADDR0), 'int256', addr0_startTokens - 42);
    testAssert(erc20.balanceOf(ADDR2), 'int256', addr2_startTokens + 42);

    // Check ADDR0 => ADDR1 allowance is now 41
    testAssert(
        safeCall(erc20.allowance, ADDR0, ADDR1),
        'uint256', 41);

    // ADDR1 tries to transfer 42 from ADDR0 to ADDR2 (should fail)
    testAssert(
        safeCall(erc20.transferFrom, ADDR0, ADDR2, 42, {from: ADDR1}), 
        'bool', false);

    // Check balance of ADDR0 remains start-42, ADDR2 +42
    testAssert(erc20.balanceOf(ADDR0), 'int256', addr0_startTokens - 42);
    testAssert(erc20.balanceOf(ADDR2), 'int256', addr2_startTokens + 42);
}

// =============================================================================
// Events

function test_transfer_event(erc20)
{
    var events = erc20.Transfer({},{fromBlock: 0, toBlock: 'latest'});

    erc20.transfer(ADDR1, 321, {from: ADDR0});

    var myResults = events.get(function(error, logs){
        if(!error) {
            let foo = JSON.parse(JSON.stringify(logs));
            testAssert(foo[0].args._from,  'string', ADDR0);
            testAssert(foo[0].args._to,    'string', ADDR1);
            testAssert(foo[0].args._value, 'string', '321');
        }
    });

    events.stopWatching();
}

function test_zero_transfer_no_event(erc20)
{
    var events = erc20.Transfer({},{fromBlock: 0, toBlock: 'latest'});

    erc20.transfer(ADDR1, 0, {from: ADDR0});

    var myResults = events.get(function(error, logs){
        if(!error) {
            testAssert(JSON.stringify(logs), 'string', '[]');
        }
    });

    events.stopWatching();
}

function test_approve_event(erc20)
{
    var events = erc20.Approval({},{fromBlock: 0, toBlock: 'latest'});

    erc20.approve(ADDR1, 1234, {from: ADDR0});

    var myResults = events.get(function(error, logs){
        if(!error) {
            debug(3, JSON.stringify(logs));
            let foo = JSON.parse(JSON.stringify(logs));
            testAssert(foo[0].args._owner,   'string', ADDR0);
            testAssert(foo[0].args._spender, 'string', ADDR1);
            testAssert(foo[0].args._value,   'string', '1234');
        }
    });

    events.stopWatching();
}

// =============================================================================
// Helper functions

function newTest(test)
{
    ERC20.new(
        {from: ADDR0, data: EVM, gas: GAS},
        function(err, myContract){
            if(!err) {
                // NOTE: The callback will fire twice!
                // Once the contract has the transactionHash property set
                // and once its deployed on an address.
                if(myContract.address) {
                    debug(3, '[newTest] Contract deployed to ' + myContract.address);
                    debug(1, '[newTest] Starting ' + test.name);
                    test(myContract);
                } else {
                    // TODO - error handling.
                }
            }
        });
}

function testAssert(result, type, expected)
{
    var testName = arguments.callee.caller.name;
    debug(2, '[testAssert] result = ' + result + ', expected = ' + expected);
    pass = compare(type, result, expected);
    if (!pass) {
        console.log('*** Failure in test ' + testName);
        console.log('  Expected: ' + expected);
        console.log('  Got:      ' + result);
    }
    debug(0, '[testAssert] ' + testName + (pass ? ' PASSED' : ' FAILED'));
    return(pass);
}

function compare(type, result, expected)
{
    debug(3, '[compare] typeof result = ' + typeof result + ', typeof expected = ' + typeof expected);
    switch(type) {
    case 'string':
        return(result === expected);
        break;
    case 'uint256':
        return(result.equals(web3.toBigNumber(expected)));
        break;
    case 'isBytes32':
        return(result && result.length === 66 && result.match('0x[0-9a-fA-F]*') !== null);
        break;
    case 'bool':
        return(result === expected);
        break;
    default:
        return('Type error: ' + type);
    }
}

// Callback to allow graceful handling of failures in contract execution
// This is a bit tricky. Basically the first arg is the function to be
// called, the remainder are the function arguments/parameters.
function safeCall() {
    var args = Array.from(arguments);
    var func = args[0];
    var params = args.slice(1);
    try {
        debug(3, '[safeCall] ' + func.name);
        debug(3, '[safeCall] ' + JSON.stringify(params));
        return(func.apply(func, params));
    } catch(err) {
        debug(2, '[safeCall] ' + err);
        return(false);
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

// Extends Hex numbers to 32 bytes and drops the 0x
function bytes32(param)
{
    var stripped = param.substr(2);
    var len = stripped.length;
    return ('0000000000000000000000000000000000000000000000000000000000000000'.substr(len) + stripped);
}

// Converts integers to 32 byte hex form (no leading 0x)
function uint256(param)
{
    return(bytes32(web3.fromDecimal(param)));
}
