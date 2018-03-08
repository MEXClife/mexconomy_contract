pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/CanReclaimToken.sol';
import 'zeppelin-solidity/contracts/lifecycle/Destructible.sol';

import './MEXConomy.sol';

/**
 * The MEXCPayment contract is the one inititated the MEXConomy contract
 */
contract MEXCRelayer {

  bytes32 public tradeID;
  address public seller;
  address public buyer;
  uint256 public value;
  uint16  public fees;
  uint32  public paymentWindow;
  uint32  public expiry;
  MEXConomy public escrow;
  
  function MEXCRelayer (
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint16 _fees,            // fees in ETH
    uint32 _paymentWindow,  // in seconds
    uint32 _expiry,          // in seconds for total time.
    MEXConomy _escrow                       
  ) public {    
    tradeID = _tradeID;
    seller = _seller;
    buyer = _buyer;
    value = _value;
    fees = _fees;
    paymentWindow = _paymentWindow;
    expiry = _expiry;
    escrow = _escrow;
  }  

  function() payable public {
    escrow.createEscrow.value(msg.value)(tradeID, seller, buyer, value, fees, paymentWindow, expiry);
  }
}


