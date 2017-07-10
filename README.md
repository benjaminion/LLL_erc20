# LLL

 * [Introduction](#introduction)
 * [ERC20 LLL contract](#erc20lll-an-implementation-of-ethereum-erc20-tokens-in-lll)
 * [Benchmarking](#benchmarking-the-erc20-contract-against-solidity)


## Introduction

According to the Ethereum [Homestead
Documentation](http://www.ethdocs.org/en/latest/contracts-and-transactions/contracts.html#id4),

> Lisp Like Language (LLL) is a low level language similar to Assembly. It is
  meant to be very simple and minimalistic; essentially just a tiny wrapper
  over coding in EVM directly.

LLL is one of the three living languages for Ethereum contract creation,
alongside Solidity and Serpent (which itself compiles to LLL). If you have the
Solidity compiler, then you may well have LLL already. It's bundled with some
of the `solc` releases as `lllc`.

It's fair to say that LLL is lagging substantially behind Solidity in
popularity for contract creation. But Daniel Ellison of ConsenSys is on a
[mission](https://media.consensys.net/@zigguratt) to revive
it. [Here](http://blog.syrinx.net/the-resurrection-of-lll-part-1/) as well.

LLL is a low-level language, just one step above Ethereum Virtual Machine (EVM)
bytecode.  Why would we choose to go back to the 1970s in programming terms
when we have all the object-oriented joys of Solidity at our disposal?

Well, the EVM is a severely resource-constrained environment. Execution, memory
and storage all have significant costs. For all its popularity, the Solidity
compiler is not great at producing very efficient code. The bytecode generated
by Solidity is full of redundancies, bloat, pointless jumps and other
inefficiencies that cause steam come out of my ears, but, much more
importantly, unnecessarily high gas usage.

The low-level nature of LLL reminds you constantly that you are dealing with a
resource-constrained environment. The LLL compiler doesn't auto-generate any of
the junk you see in Solidity bytecode. This typically results in LLL bytecode
being substantially more compact and efficient to run than Solidity bytecode.
It is for this reason that the [deployed ENS
registry](https://etherscan.io/address/0x314159265dd8dbb310642f98f50c066173c1259b#code)
was [written in
LLL](https://github.com/ethereum/ens/blob/master/contracts/ENS.lll).

Of course, there are downsides. High-level languages exist for a reason. But
it's not as bad as you might imagine. After only a week's spare time dabbling
with LLL I was able to code up the `erc20.lll` example here. And I'm not any
kind of developer by profession (which may be apparent from the code).


## *erc20.lll*: An implementation of Ethereum ERC20 tokens in LLL

A fully functional (but as yet not fully tested) implementation of the [ERC20
token standard](https://theethereum.wiki/w/index.php/ERC20_Token_Standard).

I know it looks a bit long-winded, but of the (original) 349 lines, 84 are
blank, 138 are comment, and only 127 are actual code. These Lisp-like languages
lend themselves to sparse layout and lots of whitespace. I like this.  It is
possible to write LLL code [much more
compactly](https://github.com/ethereum/cpp-ethereum/wiki/LLL-Examples-for-PoC-5/04fae9e627ac84d771faddcf60098ad09230ab58),
but I find that style quite impenetrable, and there's really no efficiency
advantage. Actually, quite a lot of the preamble is re-usable and could be
moved to an include file (yes, LLL [has a
mechanism](http://lll-docs.readthedocs.io/en/latest/lll_reference.html#including-files-include)
for this).


## Benchmarking the ERC20 contract against Solidity

If one of the premises is that LLL compiles to more efficient code than
Solidity, I suppose we ought to do some benchmarking.

Some things to bear in mind:

 * The ERC20 contract is really, really simple: there isn't that much
   opportunity for LLL to shine.

 * The gas costs for the main functions are dominated by the enormous gas usage
   of `SSTORE`, which are identical for both the LLL and the Solidity versions.

 * The Solidity version is based on the [StandardToken
   contract](https://github.com/ethereum/solidity/blob/develop/std/StandardToken.sol)
   distributed with the Solidity source code. I've improved and modified it to
   bring it up to the functionality of my LLL contract, but the input
   validation of the Solidity contract remains a little weaker.

I've included both the optimised and unoptimised Solidity code; the LLL code
generated is the same whether optimised or not (i.e. the optimiser can't
improve it), which is noteworthy in and of itself.

### Deployment costs

This table shows the code sizes and deployment costs for each version. LLL
scores a clear win here.

|              | Size (bytes) | Deployment Gas |
|--------------|-------------:|---------------:|
| Solidity     | 2879         | 813908         |
| Solidity Opt | 1730         | 515759         |
| LLL          | 855          | 291859         |


### Usage costs

In the chart below I've subtracted the following high essential fixed costs for
each function which are common to both contracts and are unavoidable:

 * The cost of the sendTransaction operation (21000).

 * The costs (and refunds) from the `SSTORE` operations that persist the data.

 * The cost of transferring the call data to the contract (identical for both).

The point is to understand the overheads that each language entails, over and
above the unavoidable activities that they have in common.  The full details
are shown in the table underneath.

![Comparison of gas costs: bar chart](images/ERC20_gas_comparison_chart.png)

![Comparison of gas costs: table](images/ERC20_gas_comparison_table.png)

Of course, `name()`, `symbol()`, `decimals()`, `totalSupply()` and
`allowance()` are all constant functions, and are free to evaluate
off-blockchain. To make it more interesting, the chart is based on the cost of
calling these functions from another contract (i.e. with
`web3.eth.sendTransaction` rather than `web3.eth.call`.)

### Conclusion

Given the simplicity of this contract and the unavoidable overheads of dealing
with permanent storage, LLL acquits itself pretty well, I think, being
significantly cheaper even than optimised Solidity code across all the
functions. For more complex functions the gains can only be expected to be
greater.

Where LLL really shines is in the code size and deployment costs. Given that
this code will be on the blockchain in perpetuity, stored and executed on
thousands of individual nodes worldwide, minimising its footprint must be a
good thing in itself.
