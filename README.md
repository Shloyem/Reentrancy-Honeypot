# Deep dive into a real-world honeypot contract

Based on a real-world example described in [this reddit post](https://www.reddit.com/r/ethdev/comments/7x5rwr/tricked_by_a_honeypot_contract_or_beaten_by/) and given in the great [Mastering Ethereum book](https://github.com/ethereumbook/ethereumbook/blob/develop/09smart-contracts-security.asciidoc#real-world-example-reentrancy-honey-pot).

The post shows a hacker who tries to exploit the contract through a reentrancy bug, but ends up losing ether to the contract he expected to exploit.
The attack was performed by replacing an expected contract with a malicious one in the constructor, in a practice known as External Contract Referencing.

## Content
This project includes 3 parts:
1. Honeypot contract: The original one used in the post, taken [from the blockchain](https://etherscan.io/address/0xd116d1349c1382b0b302086a4e4219ae4f8634ff#code) as is.
2. NaiveExploiter contract: An implamantation of a contract that aims to take funds by exploiting reentrancy vulnerability, but will have funds taken instead.
3. MaliciousLog contract: An implamantation of a secret malicious contract, that overrides the provided Log contract in #1 source code.
**This is not a decompiled version of the original [malicious contract](https://etherscan.io/address/0xd116d1349c1382b0b302086a4e4219ae4f8634ff#code)** but a simplified version for illustration purposes.

## Running yourself
As part of this Hardhat project, it is recommended you look at the [test](test/test.js) and run it for an overview of how it works.

First clone the project and run ```npm install```.

Then, run the test with command:
```npx hardhat test``` or ```npm run test```.

#### Overview:
1. Set-up: Creation of MaliciousLog contract, that will also create the Private_Bank. We use the created Private_Bank address when creating the NaiveExploiter contract. Then send 1 ether to the bank contract and lure naive hackers to come take it.

2. A call to NaiveExploiter.exploitReentrancy() will move 1 ether from that NaiveExploiter(0 ether) to the honeypot contract(2 ethers), so there is something to withdraw, and attempt to use an existing reentrancy vulnerability to steal all funds. The NaiveExploiter attempt to CashOut will result in not being able to cash out, although the call will finish successfully, because of the honeypoy only enables the MaliciousLog contract to cashout. Deeper dive on the "How it works" seciton.

3. A call to MaliciousLog.exploitReentrancy() will have the malicious contract successfully exploiting the reentrancy bug and withdraw all the funds(2 ethers) from the honeypot(0 ether).

## How it works
Here is detailed explanation of how it works and the geniousity behind it.

It is recommended to have the 3 contracts in front of you and follow the steps.

#### Flow for NaiveExploiter:
* Balances: Malicious log - 0 ether; Private_Bank - 1 ether; Naive Exploiter - 1;
* Naive Exploiter runs "exploitReentrancy()" function - deposits 1 ether so he can withdraw it back
* Balances: Malicious log - 0 ether; Private_Bank - 2 ether; Naive Exploiter - 0;
1. NaiveExploiter.exploitReentrancy: starting reentrancy withdrawal with target.CashOut(1 ether)
2. Private_Bank.CashOut: **1st time function runs**, calls msg.sender.call.value(_am)
3. NaiveExploiter.[Fallback_Function]: Checks target has more ether, it does, reenters target.CashOut(1 ether)
4. Private_Bank.CashOut: **2nd time function runs**, call to msg.sender msg.sender.call.value(_am)
5. NaiveExploiter.[Fallback_Function]: Checks target has more ether, it does not, finishes the call.
6. Call from #4 continues, because the if condition (msg.sender.call.value(_am)) succeeded we enter the scope and get to TransferLog.AddMessage(msg.sender,_am,"CashOut");
7. **MaliciousLog.AddMessage(): Hidden logic checks the sender is not the only approved address, fails on purpose, throws and reverts.**
8. Calls #4 and #3 fail and revert. We continue from the end of #2: if(msg.sender.call.value(_am)) **returns false and does not throw**, so the #1-2 call of Private_Bank.CashOut doesn't enter the condition scope and call finishes successfully.

Overall result: On the #1 call to target.CashOut(1 ether) no sending was executed. The naive exploiter money is now locked, and trying to cash out won't work.
* Balances: Malicious log - 0 ether; Private_Bank - 2 ether; Naive Exploiter - 0;

#### Flow for MaliciousLog:

After the owner spots the honeypot has new locked balanced, he calls exploitReentrancy().

Flow is identical to NaiveExploiter, except #7 will not fail, so explioting reentrancy will go through and all funds will be taken. Owner can then withdraw it all.

* Balances: Malicious log - 2 ether; Private_Bank - 0 ether; Naive Exploiter - 0;

Credit to [u/smarx explanatory post](https://www.reddit.com/r/ethdev/comments/7xu4vr/oh_dear_somebody_just_got_tricked_on_the_same/dubakau/) that helped me understand how it works and inspired my implementation.