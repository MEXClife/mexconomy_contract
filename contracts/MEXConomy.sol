/**
 *
 * MIT License
 *
 * Author: Hisham Ismail <mhishami@gmail.com>
 * Copyright (c) 2018, MEXC Program Developers & OpenZeppelin Project.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
pragma solidity ^0.4.18;

contract Ownable {
  address public owner;
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  function Ownable() public {
    owner = msg.sender;
  }
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }
}

contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

library SafeERC20 {
  function safeTransfer(ERC20Basic token, address to, uint256 value) internal {
    assert(token.transfer(to, value));
  }
  function safeTransferFrom(ERC20 token, address from, address to, uint256 value) internal {
    assert(token.transferFrom(from, to, value));
  }
  function safeApprove(ERC20 token, address spender, uint256 value) internal {
    assert(token.approve(spender, value));
  }
}

contract CanReclaimToken is Ownable {
  using SafeERC20 for ERC20Basic;

  function reclaimToken(ERC20Basic token) external onlyOwner {
    uint256 balance = token.balanceOf(this);
    token.safeTransfer(owner, balance);
  }
}


contract Destructible is Ownable {
  function Destructible() public payable { }

  function destroy() onlyOwner public {
    selfdestruct(owner);
  }
  function destroyAndSend(address _recipient) onlyOwner public {
    selfdestruct(_recipient);
  }
}

library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a / b;
    return c;
  }
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * The MEXConomy contract is the smart contract whereby buyers and
 * sellers conggregate and trade among themselves using MEXConomy platform.
 * Special thanks to LocalEthereum for inspiring us to take this further
 * for the community to use.
 */
contract MEXConomy is CanReclaimToken, Destructible {
  using SafeMath for uint256;

  // variables
  address public feesWallet;
  uint32  public cancellationMinimumTime;

  // events
  event Created(bytes32 _tradeHash);
  event SellerCancelDisabled(bytes32 _tradeHash);
  event SellerRequestedCancel(bytes32 _tradeHash);
  event CancelledBySeller(bytes32 _tradeHash);
  event CancelledByBuyer(bytes32 _tradeHash);
  event Released(bytes32 _tradeHash);
  event DisputeResolved(bytes32 _tradeHash);
  event Transfer(address _to, uint256 _value);
  event Fees(uint256 _fees);

  // structs
  struct Escrow {
    // Set so we know the trade has already been created
    bool exists;
    // The timestamp in which the seller can cancel the trade if the buyer has not yet marked as paid.
    // 0 = marked paid or dispute
    // 1 = unlimited cancel time
    uint32 sellerCanCancelAfter;
  }
  mapping (bytes32 => Escrow) public escrows;
  mapping (address => bool) public arbitrators;

  modifier onlyArbitrators() {
    require(arbitrators[msg.sender]);
    _;
  }

  function MEXConomy () public {
    arbitrators[msg.sender] = true;
    feesWallet = msg.sender;
    cancellationMinimumTime = 2 hours;  // ample time I think.
  }

  // setter and getter functions
  function addArbitrator(address _newArbitrator) public onlyOwner {
    require(_newArbitrator != address(0));
    arbitrators[_newArbitrator] = true;
  }

  function checkArbitrator(address _addr) public view returns (bool) {
    return arbitrators[_addr];
  }

  function changeFeesWallet(address _wallet) public onlyOwner {
    require(_wallet != address(0));
    feesWallet = _wallet;
  }

  function changeCancellationMinimumTime(uint32 _cancelTime) public onlyOwner {
    require (_cancelTime > 1 hours);  // min time.
    cancellationMinimumTime = _cancelTime;
  }

  // main exported functions
  function releaseEscrow(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees) external returns (bool){
    require(msg.sender == _seller);
    return doReleaseEscrow(_tradeID, _seller, _buyer, _value, _fees);
  }
  function resolveDispute(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees, bool _buyerWins) onlyArbitrators external returns (bool) {
    return doResolveTradeDispute(_tradeID, _seller, _buyer, _value, _fees, _buyerWins);
  }
  function disableSellerToCancelTrade(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees) external returns (bool) {
    // have to add arbitrators here, since maybe first time user doesn't have ether balance.
    require(msg.sender == _buyer || arbitrators[msg.sender]);
    return doDisableSellerToCancelTrade(_tradeID, _seller, _buyer, _value, _fees);
  }
  function buyerToCancelTrade(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees) external returns (bool) {
    require(msg.sender == _buyer);
    return doBuyerToCancelTrade(_tradeID, _seller, _buyer, _value, _fees);
  }
  function sellerToCancelTrade(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees) external returns (bool) {
    require(msg.sender == _seller);
    return doSellerToCancelTrade(_tradeID, _seller, _buyer, _value, _fees);
  }
  function sellerRequestToCancelTrade(bytes32 _tradeID, address _seller, address _buyer, uint256 _value, uint256 _fees) external returns (bool) {
    require(msg.sender == _seller);
    return doSellerRequestToCancelTrade(_tradeID, _seller, _buyer, _value, _fees);
  }

  /**
   * External function to be invoked by another contract where the
   * information shall be supplied.
   */
  function createEscrow(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint32 _paymentWindow,  // in seconds
    uint32 _expiry          // in seconds for total time.
  ) payable external returns (bytes32) {
    bytes32 tradeHash = keccak256(_tradeID, _seller, _buyer, _value, _fees);

    // do some validations
    require(!escrows[tradeHash].exists);            // tradeHash is new.
    require(block.timestamp < _expiry);             // not yet expired
    require(msg.value == _value && msg.value > 0);  // eth sent > 0
    uint32 sellerCanCancelAfter = _paymentWindow == 0 ? 1 : uint32(block.timestamp) + _paymentWindow;
    escrows[tradeHash] = Escrow(true, sellerCanCancelAfter);

    // emit escrow created.
    Created(tradeHash);
    return tradeHash;
  }

  function doReleaseEscrow(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees           // fees in ETH
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;
    transferMinusFees(_buyer, _value, _fees);
    delete escrows[tradeHash];
    Released(tradeHash);
    return true;
  }

  function doResolveTradeDispute(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    bool _buyerWins         // whether the dispute wins by buyer or not.
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;

    // see who won.
    if (_buyerWins) {
      transferMinusFees(_buyer, _value, _fees);
    } else {
      transferMinusFees(_seller, _value, 0);
    }

    delete escrows[tradeHash];
    Released(tradeHash);
    return true;
  }

  function doDisableSellerToCancelTrade(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees           // fees in ETH
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;
    if (escrow.sellerCanCancelAfter == 0) return false; // already marked under dispute.

    escrows[tradeHash].sellerCanCancelAfter = 0;
    SellerCancelDisabled(tradeHash);
    return true;
  }

  function doBuyerToCancelTrade(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees           // fees in ETH
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;

    // delete the escrow record
    delete escrows[tradeHash];
    CancelledByBuyer(tradeHash);
    transferMinusFees(_seller, _value, 0);
    return true;
  }

  function doSellerToCancelTrade(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees           // fees in ETH
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;

    // time has lapsed, and not unlimited time.
    if (escrow.sellerCanCancelAfter <= 1 || escrow.sellerCanCancelAfter > block.timestamp) return false;

    // delete the escrow record
    delete escrows[tradeHash];
    CancelledBySeller(tradeHash);

    transferMinusFees(_seller, _value, 0);

    return true;
  }

  /**
   * This function is invoked when the seller didn't reveice any confirmation
   * from the buyer when the cancellation time is set to unlimited.
   *
   */
  function doSellerRequestToCancelTrade(
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees           // fees in ETH
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees);
    if (!escrow.exists) return false;

    // ensure unlimited time only
    if (escrow.sellerCanCancelAfter != 1) return false;

    // delete the escrow record
    escrows[tradeHash].sellerCanCancelAfter = uint32(block.timestamp) + cancellationMinimumTime;

    // we don't delete the escrow yet. The buyer has to do that.
    // delete escrows[tradeHash];
    SellerRequestedCancel(tradeHash);

    // and no transfer yet, until buyer confirms it.
    // transferMinusFees(_seller, _value, 0);
    return true;
  }

  function getEscrowAndTradeHash(
    /**
     * Hashes the values and returns the matching escrow object and trade hash.
     * Returns an empty escrow struct and 0 _tradeHash if not found
     */
    bytes32 _tradeID,
    address _seller,
    address _buyer,
    uint256 _value,
    uint256 _fees
  ) view private returns (Escrow, bytes32) {
    bytes32 tradeHash = keccak256(_tradeID, _seller, _buyer, _value, _fees);
    return (escrows[tradeHash], tradeHash);
  }

  function transferMinusFees(
      address _to,      // recipient address
      uint256 _value,   // value in ETH
      uint256 _fees     // fees in ETH
  ) private {
    uint256 value = _value.sub(_fees);  // can be zero fees.
    _to.transfer(value);
    Transfer(_to, value);

    if (_fees > 0) {
      feesWallet.transfer(_fees);
      Fees(_fees);
    }
  }

}
