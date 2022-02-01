const { expect } = require("chai");
const { utils } = require("ethers");
const { ethers } = require("hardhat");
const { assertBalance } = require('../scripts/utils');

describe("Honeypot", function () {
  it("Should steal Naive Exploiter funds, and allow Malicious Log to take all funds", async function () {
    // arrange
    const MaliciousLog = await ethers.getContractFactory("MaliciousLog");
    const maliciousLog = await MaliciousLog.deploy({value: utils.parseEther('1.0')});
    await maliciousLog.deployed();

    const accountOwner = await maliciousLog.signer.getAddress();
    const provider = maliciousLog.provider;
    await maliciousLog.initBankValue();
    
    const privateBankAddress = await maliciousLog.getPrivateBank();

    const NaiveExploiter = await ethers.getContractFactory("NaiveExploiter");
    const naiveExploiter = await NaiveExploiter.deploy(privateBankAddress, {value: utils.parseEther('1.0')})  ;
    await naiveExploiter.deployed();
    
    await assertBalance(naiveExploiter.address, 1 , provider);
    await assertBalance(privateBankAddress, 1 , provider);
    await assertBalance(maliciousLog.address, 0 , provider);

    // act 1 - Naive Exploiter tries to exploit
    await naiveExploiter.exploitReentrancy();

    // assert 1 - Assert honeyput took Naive Exploiter funds
    await assertBalance(naiveExploiter.address, 0 , provider);
    await assertBalance(privateBankAddress, 2 , provider);
    await assertBalance(maliciousLog.address, 0 , provider);

    // act 2 - Malicious Log exploits his own contract
    await maliciousLog.exploitReentrancy();

    // assert 2 - Assert exploit works for Malicious Log owner
    await assertBalance(naiveExploiter.address, 0 , provider);
    await assertBalance(privateBankAddress, 0 , provider);
    await assertBalance(maliciousLog.address, 2 , provider);

    // act 3 - Malicious Log allows owner to withdraw all funds
    const accountBalanceBefore =  utils.formatEther((await provider.getBalance(accountOwner)).toString());
    await maliciousLog.withdraw();
    const accountBalanceAfter =  utils.formatEther((await provider.getBalance(accountOwner)).toString());
    const accountDelta = accountBalanceAfter - accountBalanceBefore;

    // assert 3 - Assert funds withdrawn successfully
    await assertBalance(maliciousLog.address, 0 , provider);
    expect(accountDelta).to.be.above(1.99).and.below(2); // withdraw all 2 ethers after fees
  });
});

