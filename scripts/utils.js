const { utils } = require("ethers");
const { expect } = require("chai");

async function assertBalance(address, expectedEthers, provider) {
    let balance =  await provider.getBalance(address);
    expect(balance).to.equal(utils.parseEther(expectedEthers.toString()));
  }

module.exports = { assertBalance };