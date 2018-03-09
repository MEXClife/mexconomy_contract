
import expectThrow from 'zeppelin-solidity/test/helpers/expectThrow';
// import assertRevert from 'zeppelin-solidity/test/helpers/assertRevert';
import increaseTime from 'zeppelin-solidity/test/helpers/increaseTime';

var MEXConomy = artifacts.require('./MEXConomy.sol');
var MEXCRelayer = artifacts.require('./MEXCRelayer.sol');
var BN = web3.BigNumber;

contract('MEXConomy Tests', (accounts) => {
  // accounts
  let owner = accounts[0];
  let acc1 = accounts[1];
  let acc2 = accounts[2];
  let acc3 = accounts[3];
  let tradeId = 1;

  let escrow, now;
  beforeEach(async () => {
    escrow = await MEXConomy.deployed();
    now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    let feesCollected = await web3.eth.getBalance(acc3);
    let acc1Bal1 = await web3.eth.getBalance(acc1);
    let acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log('');
    console.log('  +--------------------- beginning balance ---------------------+');    
    console.log('  | fees balance:', feesCollected.toString('10'), '\t\t\t|');
    console.log('  | acc1 balance:', acc1Bal1.toString('10'), '\t\t\t\t|');
    console.log('  | acc2 balance:', acc2Bal1.toString('10'), '\t\t\t|');
    console.log('  +-------------------------------------------------------------+');
  });  

  afterEach(async () => {
    let feesCollected = await web3.eth.getBalance(acc3);
    let acc1Bal1 = await web3.eth.getBalance(acc1);
    let acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log('  +----------------------- ending balance ----------------------+');    
    console.log('  | fees balance:', feesCollected.toString('10'), '\t\t\t|');
    console.log('  | acc1 balance:', acc1Bal1.toString('10'), '\t\t\t\t|');
    console.log('  | acc2 balance:', acc2Bal1.toString('10'), '\t\t\t|');
    console.log('  +-------------------------------------------------------------+');
    console.log('');
  });

  it('The main addresses should be owner', async () => {
    let add = await escrow.arbitrator();
    assert.equal(add, owner, 'Owner should be the arbitrator');

    let fa = await escrow.feesWallet();
    assert.equal(fa, owner, 'feesWallet should be the owner');
  });

  it('should be able to change arbitrator', async () => {
    await escrow.changeArbitrator(acc1);
    let abt = await escrow.arbitrator();
    assert.equal(abt, acc1, 'Arbitrator should belong to acc1');
  });

  it('Should be able to change the fees wallet', async() => {
    await escrow.changeFeesWallet(acc3);
    let fa = await escrow.feesWallet();
    assert.equal(fa, acc3, 'feesWallet should belong to acc3');
  });

  it('Should create escrow between acc1 and acc2', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, 
                              { from: acc1, value: value });
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.releaseEscrow(tid, acc1, acc2, value, fees, {from: acc1});
    console.log('resp:', resp);
    assert.equal(resp.logs[1].event, 'Released', 'Escrow is released');
    assert.equal(resp.logs[0].event, 'Fees', 'Escrow is released');
  });

  it('Should create dispute between acc1 and acc2', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, 
                              { from: acc1, value: value });
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.disableSellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    assert.equal(resp.logs[0].event, 'SellerCancelDisabled', 'Seller cancel is disables');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel trade under dispute');
  });

  it('Seller cancel the trade', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, 
                              { from: acc1, value: value });
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');


    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    console.log('resp:', resp);    
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade yet');

    // after 2 hours.
    await increaseTime(expiry + 1);
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    console.log('resp:', resp);    
    assert.equal(resp.logs[0].event, 'CancelledBySeller', 'Seller cancel is disables');
  });

  it('Buyer cancel the trade', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, 
                              { from: acc1, value: value });
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.buyerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    assert.equal(resp.logs[0].event, 'CancelledByBuyer', 'Seller cancel is disables');
  });

  it('Seller to cancel long-running trade', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 30 * 86400;  // 30 days
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, 0, now + expiry, 
                              { from: acc1, value: value });
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');


    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    resp = await escrow.sellerRequestToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs[0].event, 'SellerRequestedCancel', 'Seller cancel is disables');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    // after 2 hours, seller can cancel trade.
    await increaseTime(2 * 60 * 60 * 1000);
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('resp:', resp);
    assert.equal(resp.logs[0].event, 'CancelledBySeller', 'Seller cancelled the trade');
  });

});
