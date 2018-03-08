
// import expectThrow from 'zeppelin-solidity/test/helpers/expectThrow';
// import assertRevert from 'zeppelin-solidity/test/helpers/assertRevert';
// import increaseTime from 'zeppelin-solidity/test/helpers/increaseTime';

var MEXConomy = artifacts.require('./MEXConomy.sol');
var MEXCRelayer = artifacts.require('./MEXCRelayer.sol');

contract('MEXConomy Tests', (accounts) => {
  // accounts
  let owner = accounts[0];
  let acc1 = accounts[1];
  let acc2 = accounts[2];
  let acc3 = accounts[3];
  let tradeId = 1;

  let escrow, relayer;
  beforeEach(async () => {
    escrow = await MEXConomy.deployed();
  });

  it('The main addresses should be owner', async () => {
    let add = await escrow.arbitrator();
    assert.equal(add, owner, 'Owner should be the arbitrator');

    let fa = await escrow.feesWallet();
    assert.equal(fa, owner, 'feesWallet should be the owner');
  });

  it('Fees collected should be 0', async () => {
    let fees = await escrow.feesCollected();
    assert.equal(0, fees, 'Fees collected shouyld be 0');
  });

  it('should be able to change arbitrator', async () => {
    await escrow.changeArbitrator(acc1);
    let abt = await escrow.arbitrator();
    assert.equal(abt, acc1, 'Arbitrator should belong to acc1');
  });

  it('Should be able to change the fees wallet', async() => {
    await escrow.changeFeesWallet(acc1);
    let fa = await escrow.feesWallet();
    assert.equal(fa, acc1, 'feesWallet should belong to acc1');
  });

  it('Should create escrow between acc1 and acc2', async() => {
    let fees = web3.toWei(1, 'ether') * 0.04;        // 4% fees
    let value = web3.toWei(1, 'ether');
    let now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let expiry = 2 * 60 * 60 * 1000;  // 2 hours
    let tid = tradeId++;
    // relayer = await MEXCRelayer.deployed(tid, acc1, acc2, value, fees, expiry, now + expiry);
    let acc1Bal1 = await web3.eth.getBalance(acc1);
    let acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log('acc1Bal1:', acc1Bal1.toString('10'));
    console.log('acc2Bal1:', acc2Bal1.toString('10'));

    await escrow.createEscrow(tid, acc1, acc2, value, fees, expiry, now + expiry, {from: acc1, value: value});

    // and, let's take back the Ether added. Assuming payment has been made.
    await escrow.release(tid, acc1, acc2, value, fees, {from: acc1});
    acc1Bal1 = await web3.eth.getBalance(acc1);
    acc2Bal1 = await web3.eth.getBalance(acc2);
    console.log('acc1Bal1:', acc1Bal1.toString('10'));
    console.log('acc2Bal1:', acc2Bal1.toString('10'));
    
  });

  it('', async() => {});

});
