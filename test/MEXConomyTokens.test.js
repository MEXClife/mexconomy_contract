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
var MEXCToken = artifacts.require('./MEXCToken.sol');
var MXToken = artifacts.require('./MXToken.sol');

contract('MEXConomy Tokens Tests', (accounts) => {

  // disable this test for now.
  // return;

  let owner = accounts[0];
  let acc1 = accounts[1];
  let acc2 = accounts[2];
  let acc3 = accounts[3];
  let tradeId = 1;

  before(async () => {
    // fund the accounts with MEXC
    mx = await MXToken.deployed();
    mexc = await MEXCToken.deployed();
    escrow = await MEXConomy.deployed();

    mexc.mint(acc1, web3.toWei(50000, 'ether'), { from: owner });
    mexc.mint(acc2, web3.toWei(50000, 'ether'), { from: owner });
    mexc.mint(escrow.address, web3.toWei(1000000, 'ether'), { from: owner });

    // some mx
    mx.mint(acc1, web3.toWei(50000, 'ether'), { from: owner });
    mx.mint(acc2, web3.toWei(50000, 'ether'), { from: owner });
    mx.mint(escrow.address, web3.toWei(1000000, 'ether'), { from: owner });

    // set the MX address
    await escrow.setMXToken(mx.address, { from: owner });
    await escrow.setMEXCToken(mexc.address, { from: owner });
    await mx.transferOwnership(escrow.address, { from: owner });
    await escrow.changeFeesWallet(acc3, { from: owner });
  });

  let escrow, mexc, mx, now;
  beforeEach(async () => {
    escrow = await MEXConomy.deployed();
    mexc = await MEXCToken.deployed();
    mx = await MXToken.deployed();
    now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    let bal1 = await mexc.balanceOf(acc1);
    let bal2 = await mexc.balanceOf(acc2);
    let bal3 = await mexc.balanceOf(escrow.address);
    let bal4 = await mexc.balanceOf(acc3);
    let bal5 = await mx.balanceOf(acc2);

    console.log('');
    console.log('  +----------------------- balance before ------------------------+');
    console.log('  | acc1 balance:', bal1.toString('10'));
    console.log('  | acc2 balance:', bal2.toString('10'));
    console.log('  | escr balance:', bal3.toString('10'));
    console.log('  | fees balance:', bal4.toString('10'));
    console.log('  +---------------------------------------------------------------+');
    console.log('  | acc2 balance:', bal5.toString('10'));
    console.log('  +---------------------------------------------------------------+');
  });

  afterEach(async () => {
    let bal1 = await mexc.balanceOf(acc1);
    let bal2 = await mexc.balanceOf(acc2);
    let bal3 = await mexc.balanceOf(escrow.address);
    let bal4 = await mexc.balanceOf(acc3);
    let bal5 = await mx.balanceOf(acc2);

    console.log('  +-------------------- MEXC balance after ----------------------+');
    console.log('  | acc1 balance:', bal1.toString('10'));
    console.log('  | acc2 balance:', bal2.toString('10'));
    console.log('  | escr balance:', bal3.toString('10'));
    console.log('  | fees balance:', bal4.toString('10'));
    console.log('  +---------------------------------------------------------------+');
    console.log('  | acc2 balance:', bal5.toString('10'));
    console.log('  +---------------------------------------------------------------+');
    console.log('');
  });

  // it('The main addresses should be owner', async () => {
  //   let abt = await escrow.checkArbitrator(owner);
  //   assert.equal(abt, true, 'Owner should be the arbitrator');

  //   let fa = await escrow.feesWallet();
  //   assert.equal(fa, owner, 'feesWallet should be the owner');
  // });

  // it('should be able to change arbitrator', async () => {
  //   await escrow.addArbitrator(acc3);
  //   let abt = await escrow.checkArbitrator(acc3);
  //   assert.equal(abt, true, 'Arbitrator should belong to acc3');
  // });

  // it('Should be able to change the fees wallet', async() => {
  //   await escrow.changeFeesWallet(acc3);
  //   let fa = await escrow.feesWallet();
  //   assert.equal(fa, acc3, 'feesWallet should belong to acc3');
  // });

  it('Should create escrow between acc1 and acc2', async () => {
    let amt = 5;
    let fees = web3.toWei(amt * 0.04, 'ether');
    let value = web3.toWei(amt * 1.04, 'ether');
    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let rate = 100; // 1 dollar

    // approve the fund first
    let resp = await mexc.approve(escrow.address, value, { from: acc1 });

    // create the escrow
    resp = await escrow.createTokenEscrow(
          mexc.address, tid, acc1, acc2, value, fees, rate, expiry, now + expiry,
          { from: acc1, value: value });

    resp = await escrow.releaseTokenEscrow(
          mexc.address, tid, acc1, acc2, value, fees, rate, { from: acc1 });
  });

  it('Should create escrow between acc1 and acc2, second time', async () => {
    let amt = 5;
    let fees = web3.toWei(amt * 0.04, 'ether');
    let value = web3.toWei(amt * 1.04, 'ether');
    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let rate = 50; // 50 cents

    // approve the fund first
    let resp = await mexc.approve(escrow.address, value, { from: acc1 });

    // create the escrow
    resp = await escrow.createTokenEscrow(
          mexc.address, tid, acc1, acc2, value, fees, rate, expiry, now + expiry,
          { from: acc1, value: value });

    resp = await escrow.releaseTokenEscrow(
          mexc.address, tid, acc1, acc2, value, fees, rate, { from: acc1 });
  });

  it('should revert back when buyer cancel the trade', async () => {
    let amt = 5;
    let fees = web3.toWei(amt * 0.04, 'ether');
    let value = web3.toWei(amt * 1.04, 'ether');
    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    let rate = 200; // 200 cents

    // approve the fund first
    let resp = await mexc.approve(escrow.address, value, { from: acc1 });

    // create the escrow
    resp = await escrow.createTokenEscrow(
          mexc.address, tid, acc1, acc2, value, fees, rate, expiry, now + expiry,
          { from: acc1, value: value });

    resp = await escrow.buyerToCancelTokenTrade(
          mexc.address, tid, acc1, acc2, value, fees, rate, { from: acc2 });
    console.log('buyerToCancelTrade resp: ', resp);

  });

  it('should convert MEXC to MX directly', async () => {
    let bal1 = await mx.balanceOf(acc2)

    // let's convert 40 MEXC at a price of 0.50 USD. Means, we should get half MX.
    let amt = 40;
    let value = web3.toWei(amt * 1.04, 'ether');
    let fees = web3.toWei(amt * 0.04, 'ether');
    let rate = 50; // 0.50 cents

    await mexc.approve(escrow.address, value, { from: acc2 });
    await escrow.convertTokens(mexc.address, 18, mx.address, 18, value, fees, rate, { from: acc2 });

    let bal2 = await mx.balanceOf(acc2);
    let add2 = web3.toWei(20, 'ether');

    // some conversion
    let b1 = web3.toBigNumber(bal1),
        b2 = web3.toBigNumber(bal2),
        b3 = web3.toBigNumber(add2);

    assert.equal(b1.plus(b3).toString('10'), b2.toString('10'), 'Balance of MX should increase by 20');

  });

  it('should convert MX to MEXC directly', async () => {
    let bal1 = await mexc.balanceOf(acc2)

    // let's convert 40 MEXC at a price of 0.50 USD. Means, we should get half MX.
    let amt = 40;
    let value = web3.toWei(amt * 1.04, 'ether');
    let fees = web3.toWei(amt * 0.04, 'ether');
    let rate = 50; // 0.50 cents

    await mx.approve(escrow.address, value, { from: acc2 });
    await escrow.convertTokens(mx.address, 18, mexc.address, 18, value, fees, rate, { from: acc2 });

    let bal2 = await mexc.balanceOf(acc2);
    let add2 = web3.toWei(20, 'ether');

    // some conversion
    let b1 = web3.toBigNumber(bal1),
        b2 = web3.toBigNumber(bal2),
        b3 = web3.toBigNumber(add2);

    console.log('b1:', b1.toString('10'));
    console.log('b2:', b2.toString('10'));
    console.log('b3:', b3.toString('10'));

    assert.equal(b1.plus(b3).toString('10'), b2.toString('10'), 'Balance of MEXC should increase by 20');

  });

  it('should be able to send MEXC out', async () => {
    let bal1 = await mexc.balanceOf(acc2),
        value = web3.toWei(20, 'ether');

    await escrow.transferToken(mexc.address, acc2, value, { from: owner });
    let bal2 = await mexc.balanceOf(acc2),
        bal3 = web3.toBigNumber(bal1),
        bal4 = web3.toBigNumber(value),
        bal5 = web3.toBigNumber(bal2);

    assert.equal(bal3.plus(bal4).toString('10'), bal5.toString('10'), 'Balance MEXC should increase by 20');
  });

  it('should be able to send MX out', async () => {
    let bal1 = await mx.balanceOf(acc2),
        value = web3.toWei(20, 'ether');

    await escrow.transferToken(mx.address, acc2, value, { from: owner });
    let bal2 = await mx.balanceOf(acc2),
        bal3 = web3.toBigNumber(bal1),
        bal4 = web3.toBigNumber(value),
        bal5 = web3.toBigNumber(bal2);

    assert.equal(bal3.plus(bal4).toString('10'), bal5.toString('10'), 'Balance MX should increase by 20');

  });


});
