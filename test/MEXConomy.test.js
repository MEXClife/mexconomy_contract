
// import expectThrow from 'zeppelin-solidity/test/helpers/expectThrow';
// import assertRevert from 'zeppelin-solidity/test/helpers/assertRevert';
// import increaseTime from 'zeppelin-solidity/test/helpers/increaseTime';

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
    // relayer = await MEXCRelayer.deployed(tid, acc1, acc2, value, fees, expiry, now + expiry);
    let feesCollected = await web3.eth.getBalance(acc3);
    console.log(' ================= fees balance ================= ');
    console.log('owner balance:', feesCollected.toString('10'));

    let acc1Bal1 = await web3.eth.getBalance(acc1);
    let acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log(' ================= begining balance ================= ');    
    console.log('acc1 balance:', acc1Bal1.toString('10'));
    console.log('acc2 balance:', acc2Bal1.toString('10'));
    console.log('value:', value.toString('10'));
    console.log('fees:', fees.toString('10'));

    await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, 
                              { from: acc1, value: value });

    // and, let's take back the Ether added. Assuming payment has been made.
    await escrow.release(tid, acc1, acc2, value, fees, {from: acc1});
    acc1Bal2 = await web3.eth.getBalance(acc1);
    acc2Bal2 = await web3.eth.getBalance(acc2);
    console.log(' ================= final balance ================= ');
    console.log('acc1 balance:', acc1Bal2.toString('10'));
    console.log('acc2 balance:', acc2Bal2.toString('10'));

    feesCollected = await web3.eth.getBalance(acc3);
    console.log(' ================= fees balance ================= ');
    console.log('owner balance:', feesCollected.toString('10'));
    
  });

  it('', async() => {});

});
