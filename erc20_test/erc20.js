// =============================================================================
//
// ERC20 test suite
//
// *** Needs web3.js version at least 1.0.0 ***
//
// Instructions:
//
// 1. Compile the bytecode, e.g.
//    > lllc ../erc20.lll > erc20_evm.dat
// 2. Start testrpc (ideally in a different terminal) with -d flag
//    > /opt/node/lib/node_modules/ethereumjs-testrpc/bin/testrpc -d
// 3a. Run all the tests:
//    > node erc20.js
// 3b. Run the subset of tests matching 'regex'
//    > node erc20.js 'regex'
// 3c. Run with debugging info (n = 0,1,2 or 3)
//    > DEBUG=n node erc20.js 'regex'
//
// =============================================================================

// TODO - Try testing against cpp-ethereum

// Test selection expression
const testSelector = process.argv[2] || '';

// Input files
const abi_file = 'erc20_abi.json';
const evm_file = 'erc20_evm.dat';

// Token paramaters
const TOTALSUPPLY = 100;
const DECIMALS = 0;
const SYMBOL = 'LLL';
const NAME = 'LLL Coin - love to code in LLL.';

// Set up Web3. Need testrpc to be running.
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// These addresses are generated as standard by testrpc -d
const ADDR0 = web3.utils.toChecksumAddress("0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1");
const ADDR1 = web3.utils.toChecksumAddress("0xffcf8fdee72ac11b5c542428b35eef5769c409f0");
const ADDR2 = web3.utils.toChecksumAddress("0x22d491bde2303f2f43325b2108d26f1eaba1e32b");

// Set up the Contract object
const fs = require('fs');
const ABI = fs.readFileSync(abi_file,'utf8');
const EVM = fs.readFileSync(evm_file,'utf8').trim();
const ERC20 = new web3.eth.Contract(JSON.parse(ABI));
ERC20.options.from = ADDR0;
ERC20.options.data = EVM;
ERC20.options.gas  = 4000000

// =============================================================================
// The Tests

const theTests = {

    // -------------------------------------------------------------------------
    // Constant functions

    t1_constants:function(testName, erc20)
    {
        Promise.all([
            erc20.methods.symbol().call()
                .then(checkResult(testName, 'string', SYMBOL))
                .catch(checkResult(testName, 'isError', false)),
            erc20.methods.name().call()
                .then(checkResult(testName, 'string', NAME))
                .catch(checkResult(testName, 'isError', false)),
            erc20.methods.totalSupply().call()
                .then(checkResult(testName, 'uint256', TOTALSUPPLY))
                .catch(checkResult(testName, 'isError', false)),
            erc20.methods.decimals().call()
                .then(checkResult(testName, 'uint256', DECIMALS))
                .catch(checkResult(testName, 'isError', false))
        ]).then(finalResult(testName));
    },

    t1_balances:function(testName, erc20)
    {
        Promise.all([
            erc20.methods.balanceOf(ADDR0).call()
                .then(checkResult(testName, 'uint256', TOTALSUPPLY))
                .catch(checkResult(testName, 'isError', false)),
            erc20.methods.balanceOf(ADDR1).call()
                .then(checkResult(testName, 'uint256', 0))
                .catch(checkResult(testName, 'isError', false)),
            erc20.methods.balanceOf(ADDR2).call()
               .then(checkResult(testName, 'uint256', 0))
                .catch(checkResult(testName, 'isError', false))
        ]).then(finalResult(testName));
    },


    t1_allowances:function(testName, erc20)
    {
        erc20.methods.allowance(ADDR1,ADDR2).call()
            .then(checkResult(testName, 'uint256', 0))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    // -------------------------------------------------------------------------
    // Input validation tests

    t2_call_invalid_function:function(testName, erc20)
    {
        // Test sending correct and non-existent function selectors
        Promise.all([

            // Good function call - totalSupply()
            web3.eth.call({to: erc20.options.address, data: '0x18160ddd'})
                .then(checkResult(testName, 'bytes32', decToBytes32(TOTALSUPPLY)))
                .catch(checkResult(testName, 'isError', false)),

            // Call to non-existent function
            web3.eth.call({to: erc20.options.address, data: '0x12345678'})
                .then(checkResult(testName, 'isError', true))
                .catch(checkResult(testName, 'isError', true))

        ]).then(finalResult(testName));
    },

    t2_send_ether_to_transfer:function(testName, erc20)
    {
        // Any attempt to send Ether to the contract should fail.
        web3.eth.sendTransaction({from: ADDR0, to: erc20.options.address, data: '0xa9059cbb' + hexToBytes32(ADDR1) + decToBytes32(1), value: 1})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t2_low_level_transfer:function(testName, erc20)
    {
        // Check this works as expected as it is the template for the following
        // tests. Transfer 1 Token from ADDR0 to ADDR1.
        web3.eth.sendTransaction({from: ADDR0, to: erc20.options.address, data: '0xa9059cbb' + hexToBytes32(ADDR1) + decToBytes32(1)})
            .then(checkResult(testName, 'isReceipt', true))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t2_too_little_call_data:function(testName, erc20)
    {
        // Test with transfer() function, providing truncated call data.
        web3.eth.sendTransaction({from: ADDR0, to: erc20.options.address, data: '0xa9059cbb' + hexToBytes32(ADDR1) + decToBytes32(1).substr(2)})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t2_too_much_call_data:function(testName, erc20)
    {
        // Test with transfer() function, providing extended call data.
        web3.eth.sendTransaction({from: ADDR0, to: erc20.options.address, data: '0xa9059cbb' + hexToBytes32(ADDR1) + decToBytes32(1) + '00'})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t2_invalid_address:function(testName, erc20)
    {
        // Test with transfer() function, providing a malformed address.
        web3.eth.sendTransaction({from: ADDR0, to: erc20.options.address, data: '0xa9059cbb' + '01' + hexToBytes32(ADDR1).substr(2) + decToBytes32(1)})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    // -------------------------------------------------------------------------
    // Smoke tests on transfer(), approve(), transferFrom()

    t3_transfer:function(testName, erc20)
    {
        // Transfer 10 tokens from ADDR0 to ADDR1
        erc20.methods.transfer(ADDR1, 10).send({from: ADDR0})
            .then(checkResult(testName, 'isReceipt', true))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t3_transfer_too_much:function(testName, erc20)
    {
        // Try to send more than totalSupply
        erc20.methods.transfer(ADDR1, 1 + TOTALSUPPLY).send({from: ADDR0})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t3_approve:function(testName, erc20)
    {
        // Approve ADDR1 to transfer 10 tokens from ADDR0
        erc20.methods.approve(ADDR1, 10).send({from: ADDR0})
            .then(checkResult(testName, 'isReceipt', true))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t3_approve_too_much:function(testName, erc20)
    {
        // Approve ADDR1 to transfer more than totalSupply tokens from ADDR0
        erc20.methods.approve(ADDR1, 1 + TOTALSUPPLY).send({from: ADDR0})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t3_transfer_from_no_approval:function(testName, erc20)
    {
        // ADDR1 tries transfer from ADDR0 to ADDR2 without having approval
        erc20.methods.transferFrom(ADDR0, ADDR2, 10).send({from: ADDR1})
            .then(checkResult(testName, 'isError', true))
            .catch(checkResult(testName, 'isError', true))
            .then(finalResult(testName));
    },

    t3_transfer_from_no_approval_zero:function(testName, erc20)
    {
        // ADDR1 tries transfer from ADDR0 to ADDR2 without having approval
        // But zero value, so should not be an error.
        erc20.methods.transferFrom(ADDR0, ADDR2, 0).send({from: ADDR1})
            .then(checkResult(testName, 'isReceipt', true))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    // -------------------------------------------------------------------------
    // End-to-End Tests

    t4_valid_transfer:function(testName, erc20)
    {
        let amount = 10;
        let addr0_startTokens;
        let addr1_startTokens;

        serialExec([

            // Save initial balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(bal => {addr0_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(bal => {addr1_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Successful transfer
            next => {erc20.methods.transfer(ADDR1, amount).send({from: ADDR0})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(checkResult(testName, 'uint256', addr0_startTokens - amount))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(checkResult(testName, 'uint256', addr1_startTokens + amount))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))},
        ]);
    },

    t4_invalid_transfer:function(testName, erc20)
    {
        let addr0_startTokens;
        let addr1_startTokens;

        serialExec([

            // Save initial balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(bal => {addr0_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(bal => {addr1_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Unsuccessful transfer
            next => {erc20.methods.transfer(ADDR1, addr0_startTokens + 1).send({from: ADDR0})
                     .then(checkResult(testName, 'isError', true))
                     .catch(checkResult(testName, 'isError', true))
                     .then(next)},

            // Check balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(checkResult(testName, 'uint256', addr0_startTokens))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(checkResult(testName, 'uint256', addr1_startTokens))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    t4_multiple_transfers:function(testName, erc20)
    {
        let amount;
        let addr0_startTokens;
        let addr1_startTokens;

        serialExec([

            // Save initial balances and calculate transfer amount
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(bal => {
                         addr0_startTokens = parseInt(bal);
                         amount = 1 + Math.floor(addr0_startTokens / 3);})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(bal => {addr1_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Two successful transfers and an unsuccessful
            next => {erc20.methods.transfer(ADDR1, amount).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.transfer(ADDR1, amount).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.transfer(ADDR1, amount).send({from: ADDR0})
                     .then(checkResult(testName, 'isError', true))
                     .catch(checkResult(testName, 'isError', true))
                     .then(next)},

            // Check balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(checkResult(testName, 'uint256', addr0_startTokens - 2 * amount))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR1).call()
                     .then(checkResult(testName, 'uint256', addr1_startTokens + 2 * amount))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))},
        ]);
    },

    t4_multiple_approve:function(testName, erc20)
    {
        serialExec([

            // Check ADDR0 => ADDR1 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR1 to 10
            next => {erc20.methods.approve(ADDR1, 10).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is 10
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 10))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Try to set allowance ADDR0 => ADDR1 to 5 (should fail)
            next => {erc20.methods.approve(ADDR1, 5).send({from: ADDR0})
                     .then(checkResult(testName, 'isError', true))
                     .catch(checkResult(testName, 'isError', true))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is still 10
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 10))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR1 to 0
            next => {erc20.methods.approve(ADDR1, 0).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is now 0
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Try to set allowance ADDR0 => ADDR1 to 5 (should succeed)
            next => {erc20.methods.approve(ADDR1, 5).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is now 5
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 5))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    t4_transfer_from:function(testName, erc20)
    {
        let addr0_startTokens;
        let addr2_startTokens;

        serialExec([

            // Save initial balances
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(bal => {addr0_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR2).call()
                     .then(bal => {addr2_startTokens = parseInt(bal)})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // ADDR1 tries transfer from ADDR0 to ADDR2 with no allowance
            next => {erc20.methods.transferFrom(ADDR0, ADDR2, 42).send({from: ADDR1})
                     .then(checkResult(testName, 'isError', true))
                     .catch(checkResult(testName, 'isError', true))
                     .then(next)},

            // Set allowance ADDR0 => ADDR1 to 83
            next => {erc20.methods.approve(ADDR1, 83).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is now 83
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 83))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // ADDR1 transfers 42 from ADDR0 to ADDR2
            next => {erc20.methods.transferFrom(ADDR0, ADDR2, 42).send({from: ADDR1})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check balance of ADDR0 is start-42, ADDR2 is start+42
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(checkResult(testName, 'uint256', addr0_startTokens - 42))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR2).call()
                     .then(checkResult(testName, 'uint256', addr2_startTokens + 42))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is now 41
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 41))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // ADDR1 tries to transfer 42 from ADDR0 to ADDR2 (should fail)
            next => {erc20.methods.transferFrom(ADDR0, ADDR2, 42).send({from: ADDR1})
                     .then(checkResult(testName, 'isError', true))
                     .catch(checkResult(testName, 'isError', true))
                     .then(next)},

            // Check balance of ADDR0 remains start-42, ADDR2 +42
            next => {erc20.methods.balanceOf(ADDR0).call()
                     .then(checkResult(testName, 'uint256', addr0_startTokens - 42))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},
            next => {erc20.methods.balanceOf(ADDR2).call()
                     .then(checkResult(testName, 'uint256', addr2_startTokens + 42))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    t4_multiple_allowances_1:function(testName, erc20)
    {
        serialExec([

            // Check that multiple approvals from different owners for
            // the same spender are correctly handled.

            // Check ADDR0 => ADDR2 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR1 => ADDR2 allowance is 0
            next => {erc20.methods.allowance(ADDR1, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR2 to 10
            next => {erc20.methods.approve(ADDR2, 10).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR1 => ADDR2 to 20
            next => {erc20.methods.approve(ADDR2, 20).send({from: ADDR1})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR2 allowance is 10
            next => {erc20.methods.allowance(ADDR0, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 10))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR1 => ADDR2 allowance is 20
            next => {erc20.methods.allowance(ADDR1, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 20))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    t4_multiple_allowances_2:function(testName, erc20)
    {
        serialExec([

            // Check that multiple approvals from the same owner for
            // different spenders are correctly handled.

            // Check ADDR0 => ADDR1 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR2 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR1 to 10
            next => {erc20.methods.approve(ADDR1, 10).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR2 to 20
            next => {erc20.methods.approve(ADDR2, 20).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is 10
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 10))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR2 allowance is 20
            next => {erc20.methods.allowance(ADDR0, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 20))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    t4_symmetric_allowances:function(testName, erc20)
    {
        serialExec([

            // Check that setting allowance for ADDR0 -> ADDR1
            // doesn't set allowance for ADDR1 -> ADDR0

            // Check ADDR0 => ADDR1 allowance is 0
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR1 => ADDR0 allowance is 0
            next => {erc20.methods.allowance(ADDR1, ADDR0).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Set allowance ADDR0 => ADDR1 to 10
            next => {erc20.methods.approve(ADDR1, 10).send({from: ADDR0})
                     .then(checkResult(testName, 'isReceipt', true))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR0 => ADDR1 allowance is 10
            next => {erc20.methods.allowance(ADDR0, ADDR1).call()
                     .then(checkResult(testName, 'uint256', 10))
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            // Check ADDR1 => ADDR0 allowance remains 0
            next => {erc20.methods.allowance(ADDR0, ADDR2).call()
                     .then(checkResult(testName, 'uint256', 0))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

    // -------------------------------------------------------------------------
    // Events

    t5_transfer_event:function(testName, erc20)
    {
        erc20.methods.transfer(ADDR1, 42).send({from: ADDR0})
            .then(checkResult(testName, 'event', {Transfer: {_value: '42', _from: ADDR0, _to: ADDR1}}))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t5_zero_transfer_no_event:function(testName, erc20)
    {

        erc20.methods.transfer(ADDR1, 0).send({from: ADDR0})
            .then(checkResult(testName, 'hasEvent', false))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t5_approve_event:function(testName, erc20)
    {
        erc20.methods.approve(ADDR1, 42).send({from: ADDR0})
            .then(checkResult(testName, 'event', {Approval: {_value: '42', _owner: ADDR0, _spender: ADDR1}}))
            .catch(checkResult(testName, 'isError', false))
            .then(finalResult(testName));
    },

    t5_transfer_from_event:function(testName, erc20)
    {
        serialExec([
            next => {erc20.methods.approve(ADDR1, 50).send({from: ADDR0})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            next => {erc20.methods.transferFrom(ADDR0, ADDR2, 42).send({from: ADDR1})
                     .then(checkResult(testName, 'event', {Transfer: {_value: '42', _from: ADDR0, _to: ADDR2}}))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ])
    },

    t5_zero_transfer_from_no_event:function(testName, erc20)
    {
        serialExec([

            next => {erc20.methods.approve(ADDR1, 50).send({from: ADDR0})
                     .catch(checkResult(testName, 'isError', false))
                     .then(next)},

            next => {erc20.methods.transferFrom(ADDR0, ADDR2, 0).send({from: ADDR1})
                     .then(checkResult(testName, 'hasEvent', false))
                     .catch(checkResult(testName, 'isError', false))
                     .then(finalResult(testName))}
        ]);
    },

}

// =============================================================================
// Control Loop
//
// List the tests and execute the ones that match the selector Regex
//

var tests = getAllMethods(theTests);
var testsToRun = tests.filter(function(name){return name.match(testSelector)});
var numTestsToRun = testsToRun.length;
var allTestResults = {};
var testsPassed = 0, testsFailed = 0;

console.log('Running ' + numTestsToRun + ' test'
            + (numTestsToRun == 1 ? '.' : 's.'));

// We now run each test sequentially. This is is much kinder to the node than
// blatting them all out asynchronously, and results in far fewer crashes.
// runNextTest() will be called again via processResult().
runNextTest();

// =============================================================================
// Helper functions

// Used to list the names of the available tests
function getAllMethods(object)
{
    return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
    });
}

// Re-deploy the contract and run the `test` function with name `testName`
function newTest(testName, test)
{
    ERC20.deploy().send().then(
        function(myContract){
            if(myContract.options.address) {
                debug(2, '[newTest] Contract deployed to ' + myContract.options.address);
                debug(1, '[newTest] Starting ' + testName);
                return test(testName, myContract);
            } else {
                // TODO - error handling.
            }
        });
}

// Checks the global list of remaining tests and runs the next if exists.
function runNextTest()
{
    let nextTestName = testsToRun.shift();
    if (nextTestName) {
        allTestResults[nextTestName] = true;
        newTest(nextTestName, theTests[nextTestName]);
    }
}

// Sometimes it's useful to serialise the execution of the asynchronous calls
function serialExec(callbacks)
{
    function next()
    {
        let callback = callbacks.shift();
        if(callback) {
            callback(function() {next();});
        }
    }
    next();
}

// Aggregate the results of each individual subtest making up a larger test
function logResult(testName, pass)
{
    allTestResults[testName] &= pass;
    debug(0, '[testAssert] ' + testName + (pass ? ' PASSED' : ' FAILED'));
}

// Output the final result of a test when all promises have resolved
function processResult(testName)
{
    console.log(testName + ': '
                + (allTestResults[testName] ? 'PASSED' : 'FAILED'));
    if (allTestResults[testName]) {
        testsPassed++;
    } else {
        testsFailed++;
    }
    console.log('  Tests passed: ' + testsPassed + '. Tests failed: ' + testsFailed + '.' + "\n");

    runNextTest();
}

// -----------------------------------------------------------------------------
// Callback functions, curried for ease of parameter handling.

// Callback to check that the actual result of a test
// matches the expected result.
function checkResult(testName, type, expected)
{
    return function(result)
    {
        testAssert(testName, result, type, expected);
    }
}

// Callback to output the final result of a test once all promises resolve
function finalResult(testName)
{
    return function(v)
    {
        processResult(testName);
    }
}

// -----------------------------------------------------------------------------
// For checking test results

function testAssert(testName, result, type, expected)
{
    debug(2, '[testAssert] result = ' + result + ', expected = ' + expected + ', type = ' + type);
    let pass = compare(type, result, expected);
    if (!pass) {
        debug(1, '*** Failure in test ' + testName);
        debug(1, '  Expected: ' + expected);
        debug(1, '  Got:      ' + result);
        debug(1, '  Return:   ' + pass);
    }
    logResult(testName, pass);
}

function compare(type, result, expected)
{
    debug(3, '[compare] typeof result = ' + typeof result + ', typeof expected = ' + typeof expected);
    debug(2, '[compare] Looking for ' + type);
    switch(type) {
    case 'string':
        return(result === expected);
        break;
    case 'uint256':
        return(result === expected.toString());
        break;
    case 'bytes32':
        return(result === '0x' + expected);
        break;
    case 'isReceipt':
        return((result.transactionHash !== undefined) === expected);
        break;
    case 'isError':
        return((result instanceof Error) === expected);
        break;
    case 'hasEvent':
        debug(3, '[compare] result.events: ' + JSON.stringify(result, null, 1));
        return ((result.events !== undefined && Object.keys(result.events).length !== 0) === expected);
        break;
    case 'event':
        let events = result.events;
        if (events === undefined) {
            debug(3, '[compare] result does not have an events key:');
            debug(3, '[compare] ' + JSON.stringify(result, null , 1));
            return false;
        }
        let eventName = Object.keys(expected)[0];
        if (events[eventName] === undefined) {
            debug(3, '[compare] event ' + eventName + ' not found.');
            debug(3, '[compare] ' + JSON.stringify(events, null, 1));
            return false;
        }
        let expKeys = Object.keys(expected[eventName]);
        for (let i=0; i<expKeys.length; i++) {
            debug(2, '[compare] Comparing ' + expKeys[i]);
            if (events[eventName]['returnValues'][expKeys[i]] !== expected[eventName][expKeys[i]]) {
                debug(3, '[compare] For expected key ' + expKeys[i] + ': ' + expected[eventName][expKeys[i]]);
                debug(3, '[compare] Got: ' + events[eventName]['returnValues'][expKeys[i]]);
                debug(3, '[compare] ' + JSON.stringify(events, null, 1));
                return false;
            }
        }
        return true;
        break;
    default:
        debug(2, '[compare] Type ' + type + ' is not recognised.');
        return('Type error: ' + type);
    }
}

// Extends Hex numbers to 32 bytes and drops the 0x
function hexToBytes32(param)
{
    return(web3.utils.leftPad(param, 64).substr(2))
}

// Converts integers to 32 byte hex form (no leading 0x)
function decToBytes32(param)
{
    return(hexToBytes32(web3.utils.fromDecimal(param)));
}

// -----------------------------------------------------------------------------
// Deubugging

// e.g. DEBUG=2 node erc20.js
var debugLevel = parseInt(process.env.DEBUG);
function debug(level, message)
{
    if(debugLevel !== NaN && debugLevel >= level) {
        console.log('DEBUG[' + level + '] ' + message);
    }
}
