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
import expectThrow from 'zeppelin-solidity/test/helpers/expectThrow';
// import assertRevert from 'zeppelin-solidity/test/helpers/assertRevert';
import increaseTime from 'zeppelin-solidity/test/helpers/increaseTime';

var MEXConomy = artifacts.require('./MEXConomy.sol');

contract('MEXConomy Tests', (accounts) => {

  // disable this test for now.
  // return;

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
    console.log('  | fees balance:', feesCollected.toString('10'));
    console.log('  | acc1 balance:', acc1Bal1.toString('10'));
    console.log('  | acc2 balance:', acc2Bal1.toString('10'));
    console.log('  +-------------------------------------------------------------+');
  });

  afterEach(async () => {
    let feesCollected = await web3.eth.getBalance(acc3);
    let acc1Bal1 = await web3.eth.getBalance(acc1);
    let acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log('  +----------------------- ending balance ----------------------+');
    console.log('  | fees balance:', feesCollected.toString('10'));
    console.log('  | acc1 balance:', acc1Bal1.toString('10'));
    console.log('  | acc2 balance:', acc2Bal1.toString('10'));
    console.log('  +-------------------------------------------------------------+');
    console.log('');
  });

  it('The main addresses should be owner', async () => {
    let abt = await escrow.checkArbitrator(owner);
    assert.equal(abt, true, 'Owner should be the arbitrator');

    let fa = await escrow.feesWallet();
    assert.equal(fa, owner, 'feesWallet should be the owner');
  });

  it('should be able to change arbitrator', async () => {
    await escrow.addArbitrator(acc3);
    let abt = await escrow.checkArbitrator(acc3);
    assert.equal(abt, true, 'Arbitrator should belong to acc3');
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
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.releaseEscrow(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('releaseEscrow resp:', resp);
    assert.equal(resp.logs[2].event, 'Released', 'Escrow is released');
    assert.equal(resp.logs[1].event, 'Fees', 'Fees are transferred');
    assert.equal(resp.logs[0].event, 'Transfer', 'Ether is transferred to buyer');
  });

  it('Should create dispute between acc1 and acc2, acc2 won', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry,
                              { from: acc1, value: value });
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.disableSellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    // console.log('disableSellerToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'SellerCancelDisabled', 'Seller cancel is disabled');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel trade under dispute');

    // resolve dispute
    let bal = await web3.eth.getBalance(acc2);

    // buyer wins the dispute
    resp = await escrow.resolveDispute(tid, acc1, acc2, value, fees, true, {from: owner});
    console.log('resolveDispute resp:', resp);
    console.log('  ** ----------- previous bal ------------- **');
    console.log('  ** acc2 balance:', bal.toString('10'), '   **');
    console.log('  ** -------------------------------------- **');
    assert.equal(resp.logs[2].event, 'Released', 'Escrow is released');
    assert.equal(resp.logs[1].event, 'Fees', 'Fees are transferred');
    assert.equal(resp.logs[0].event, 'Transfer', 'Ether is transferred to buyer');
  });

  it('Should create dispute between acc1 and acc2, acc1 won', async() => {
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
    assert.equal(resp.logs[0].event, 'SellerCancelDisabled', 'Seller cancel is disabled');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel trade under dispute');

    // resolve dispute
    let bal = await web3.eth.getBalance(acc1);

    // buyer wins the dispute
    resp = await escrow.resolveDispute(tid, acc1, acc2, value, fees, false, {from: owner});
    console.log('resolveDispute resp:', resp);
    console.log('  ** ----------- previous bal ------------- **');
    console.log('  ** acc1 balance:', bal.toString('10'), '   **');
    console.log('  ** -------------------------------------- **');
    assert.equal(resp.logs[2].event, 'Released', 'Escrow is released');
    assert.equal(resp.logs[1].event, 'Fees', 'Seller fees are deducted');
    assert.equal(resp.logs[0].event, 'Transfer', 'Ether is transferred to buyer');
  });

  it('Seller cancel the trade', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry,
                              { from: acc1, value: value });
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');


    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade yet');

    // after 2 hours.
    await increaseTime(expiry + 1);
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'CancelledBySeller', 'Seller cancelled the trade');
    assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');
  });

  it('Buyer cancel the trade', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry,
                              { from: acc1, value: value });
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');

    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.buyerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    // console.log('buyerToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'CancelledByBuyer', 'Buyer cancelled the trade');
    assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');
  });

  it('Seller to cancel long-running trade, cancelled by buyer', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 30 * 86400;  // 30 days
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, 0, now + expiry,
                              { from: acc1, value: value });
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');


    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    resp = await escrow.sellerRequestToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerRequestToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'SellerRequestedCancel', 'Seller request to cancel trade');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    // 1. Either seller can wait for 2 hours and cancel everything
    //
    // await increaseTime(2 * 60 * 60 * 1000);
    // resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // assert.equal(resp.logs[0].event, 'CancelledBySeller', 'Seller cancelled the trade after 2 hours');
    // assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');

    // or, 2. Buyer can cancel right away.
    resp = await escrow.buyerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'CancelledByBuyer', 'Buyer cancelled the trade immediately');
    assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');
  });

  it('Seller to cancel long-running trade, cancelled by seller', async() => {
    let amt = 1;
    let fees = web3.toWei(amt * 0.04);
    let value = web3.toWei(amt * 1.04);

    let expiry = 30 * 86400;  // 30 days
    let tid = tradeId++;
    let resp = await escrow.createEscrow(tid, acc1, acc2, value, fees, 0, now + expiry,
                              { from: acc1, value: value });
    // console.log('createEscrow resp:', resp);
    assert.equal(resp.logs[0].event, 'Created', 'Escrow is created');


    // and, let's take back the Ether added. Assuming payment has been made.
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    resp = await escrow.sellerRequestToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerRequestToCancelTrade resp:', resp);
    assert.equal(resp.logs[0].event, 'SellerRequestedCancel', 'Seller request to cancel trade');

    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    // console.log('sellerToCancelTrade resp:', resp);
    assert.equal(resp.logs.length, 0, 'Seller can\'t cancel the trade');

    // 1. Either seller can wait for 2 hours and cancel everything
    //
    await increaseTime(2 * 60 * 60 * 1000);
    resp = await escrow.sellerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc1});
    assert.equal(resp.logs[0].event, 'CancelledBySeller', 'Seller cancelled the trade after 2 hours');
    assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');

    // or, 2. Buyer can cancel right away.
    // resp = await escrow.buyerToCancelTrade(tid, acc1, acc2, value, fees, {from: acc2});
    // console.log('sellerToCancelTrade resp:', resp);
    // assert.equal(resp.logs[0].event, 'CancelledByBuyer', 'Buyer cancelled the trade immediately');
    // assert.equal(resp.logs[1].event, 'Transfer', 'Ether is transferred to Seller');
  });

});
