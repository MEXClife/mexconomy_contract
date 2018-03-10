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

contract HasNoEther is Ownable {

  function HasNoEther() public payable {
    require(msg.value == 0);
  }
  function() external {
  }
  function reclaimEther() external onlyOwner {
    assert(owner.send(this.balance));
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

contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;
  uint256 totalSupply_;

  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }
  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

}

contract StandardToken is ERC20, BasicToken {
  mapping (address => mapping (address => uint256)) internal allowed;

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }
  function allowance(address _owner, address _spender) public view returns (uint256) {
    return allowed[_owner][_spender];
  }
  function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }
  function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

contract MintableToken is StandardToken, Ownable {
  event Mint(address indexed to, uint256 amount);
  event MintFinished();
  bool public mintingFinished = false;

  modifier canMint() {
    require(!mintingFinished);
    _;
  }
  function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(address(0), _to, _amount);
    return true;
  }
  function finishMinting() onlyOwner canMint public returns (bool) {
    mintingFinished = true;
    MintFinished();
    return true;
  }
}

/**
 * The MEXConomy contract is the smart contract whereby buyers and
 * sellers conggregate and trade among themselves using MEXConomy platform.
 * Special thanks to LocalEthereum for inspiring us to take this further
 * for the community to use.
 */
contract MEXConomyTokens is HasNoEther, Destructible {
  using SafeMath for uint256;
  using SafeERC20 for ERC20;

  // variables
  address feesWallet_;
  uint32  cancellationMinimumTime_;
  MintableToken mxToken_ = MintableToken(address(0));

  // events
  event Created(bytes32 _tradeHash);
  event SellerCancelDisabled(bytes32 _tradeHash);
  event SellerRequestedCancel(bytes32 _tradeHash);
  event CancelledBySeller(bytes32 _tradeHash);
  event CancelledByBuyer(bytes32 _tradeHash);
  event Released(bytes32 _tradeHash);
  event DisputeResolved(bytes32 _tradeHash);
  event Transfer(address _to, uint256 _value);
  event MintMXTokens(address _to, uint256 _value);
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

  modifier mxTokenIsSet() {
    require(mxToken_ != MintableToken(address(0)));
    _;
  }

  function MEXConomyTokens () public {
    arbitrators[msg.sender] = true;
    feesWallet_ = msg.sender;
    cancellationMinimumTime_ = 2 hours;  // ample time I think.
  }

  function feesWallet() public view returns (address) {
    return feesWallet_;
  }

  // setter and getter functions
  function setMXToken(address _addr) public onlyOwner {
    require(_addr != address(0));
    mxToken_ = MintableToken(_addr);
  }

  function addArbitrator(address _newArbitrator) public onlyOwner {
    require(_newArbitrator != address(0));
    arbitrators[_newArbitrator] = true;
  }

  function checkArbitrator(address _addr) public view returns (bool) {
    return arbitrators[_addr];
  }

  function changeFeesWallet(address _wallet) public onlyOwner {
    require(_wallet != address(0));
    feesWallet_ = _wallet;
  }

  function changeCancellationMinimumTime(uint32 _cancelTime) public onlyOwner {
    require (_cancelTime > 1 hours);  // min time.
    cancellationMinimumTime_ = _cancelTime;
  }

  // main exported functions
  function releaseEscrow(
      ERC20 _token, bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate) external returns (bool){
    require(msg.sender == _seller);
    return doReleaseEscrow(_token, _tradeID, _seller, _buyer, _value, _fees, _rate);
  }
  function resolveDispute(
      ERC20 _token, bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate, bool _buyerWins) onlyArbitrators external returns (bool) {
    return doResolveTradeDispute(_token, _tradeID, _seller, _buyer, _value, _fees, _rate, _buyerWins);
  }
  function disableSellerToCancelTrade(
      bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate) external returns (bool) {
    // have to add arbitrators here, since maybe first time user doesn't have ether balance.
    require(msg.sender == _buyer || arbitrators[msg.sender]);
    return doDisableSellerToCancelTrade(_tradeID, _seller, _buyer, _value, _fees, _rate);
  }
  function buyerToCancelTrade(
      ERC20 _token, bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate) external returns (bool) {
    require(msg.sender == _buyer);
    return doBuyerToCancelTrade(_token, _tradeID, _seller, _buyer, _value, _fees, _rate);
  }
  function sellerToCancelTrade(
      ERC20 _token, bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate) external returns (bool) {
    require(msg.sender == _seller);
    return doSellerToCancelTrade(_token, _tradeID, _seller, _buyer, _value, _fees, _rate);
  }
  function sellerRequestToCancelTrade(
      bytes32 _tradeID, address _seller, address _buyer,
      uint256 _value, uint256 _fees, uint256 _rate) external returns (bool) {
    require(msg.sender == _seller);
    return doSellerRequestToCancelTrade(_tradeID, _seller, _buyer, _value, _fees, _rate);
  }

  /**
   * External function to be invoked by another contract where the
   * information shall be supplied.
   */
  function createEscrow(
    ERC20 _token,           // the token address
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate,          // MEXC rate at the creation time
    uint32 _paymentWindow,  // in seconds
    uint32 _expiry          // in seconds for total time.
  ) payable external returns (bytes32) {

    // call this first --> _token.approve(address(this), _value);
    require(_token.allowance(_seller, address(this)) == _value);
    _token.safeTransferFrom(_seller, address(this), _value);

    bytes32 tradeHash = keccak256(_tradeID, _seller, _buyer, _value, _fees, _rate);

    // do some validations
    require(!escrows[tradeHash].exists);            // tradeHash is new.
    require(block.timestamp < _expiry);             // not yet expired
    uint32 sellerCanCancelAfter = _paymentWindow == 0 ? 1 : uint32(block.timestamp) + _paymentWindow;
    escrows[tradeHash] = Escrow(true, sellerCanCancelAfter);

    // emit escrow created.
    Created(tradeHash);
    return tradeHash;
  }

  function doReleaseEscrow(
    ERC20 _token,           // the token address
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) private mxTokenIsSet returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;
    revertOrMintTokens(_token, _buyer, _value, _fees, _rate);
    delete escrows[tradeHash];
    Released(tradeHash);
    return true;
  }

  function doResolveTradeDispute(
    ERC20 _token,           // the token address
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate,          // MEXC rate at the creation time
    bool _buyerWins         // whether the dispute wins by buyer or not.
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;

    // see who won.
    if (_buyerWins) {
      revertOrMintTokens(_token, _buyer, _value, _fees, _rate);
    } else {
      revertOrMintTokens(_token, _seller, _value, 0, _rate);
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
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;
    if (escrow.sellerCanCancelAfter == 0) return false; // already marked under dispute.

    escrows[tradeHash].sellerCanCancelAfter = 0;
    SellerCancelDisabled(tradeHash);
    return true;
  }

  function doBuyerToCancelTrade(
    ERC20 _token,           // the token address
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;

    // delete the escrow record
    delete escrows[tradeHash];
    CancelledByBuyer(tradeHash);
    revertOrMintTokens(_token, _seller, _value, 0, _rate);
    return true;
  }

  function doSellerToCancelTrade(
    ERC20 _token,           // the token address
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;

    // time has lapsed, and not unlimited time.
    if (escrow.sellerCanCancelAfter <= 1 || escrow.sellerCanCancelAfter > block.timestamp) return false;

    // delete the escrow record
    delete escrows[tradeHash];
    CancelledBySeller(tradeHash);

    revertOrMintTokens(_token, _seller, _value, 0, _rate);

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
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) private returns (bool) {
    var (escrow, tradeHash) = getEscrowAndTradeHash(_tradeID, _seller, _buyer, _value, _fees, _rate);
    if (!escrow.exists) return false;

    // ensure unlimited time only
    if (escrow.sellerCanCancelAfter != 1) return false;

    // delete the escrow record
    escrows[tradeHash].sellerCanCancelAfter = uint32(block.timestamp) + cancellationMinimumTime_;

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
    bytes32 _tradeID,       // _tradeID generated from MEXConomy.
    address _seller,        // seller's address
    address _buyer,         // buyer's address
    uint256 _value,         // the value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate           // MEXC rate at the creation time
  ) view private returns (Escrow, bytes32) {
    bytes32 tradeHash = keccak256(_tradeID, _seller, _buyer, _value, _fees, _rate);
    return (escrows[tradeHash], tradeHash);
  }

  function revertOrMintTokens(
    ERC20 _token,           // the token address
    address _to,            // recipient address
    uint256 _value,         // value in ETH
    uint256 _fees,          // fees in ETH
    uint256 _rate           // exchange rate for MEXC
  ) private mxTokenIsSet {

    uint256 value = _value.sub(_fees);  // can be zero fees.

    if (_fees != 0) {
      // ok, transfer the tokens, and mint MX Tokens
      assert(_token.transfer(feesWallet_, _value));
      Transfer(feesWallet_, _value);

      // mint MX tokens for this user.
      uint256 minted = value.mul(_rate);

      mxToken_.mint(_to, minted);
      MintMXTokens(_to, minted);

    } else {
      // return back the tokens to the _to address.
      assert(_token.transfer(_to, value));
      Transfer(_to, value);

      // take the fees
      assert(_token.transfer(feesWallet_, _fees));
      Fees(_fees);
    }

  }


}