
var MEXConomy = artifacts.require('./MEXConomy.sol');
var MEXCToken = artifacts.require('./MEXCToken.sol');
var MXToken = artifacts.require('./MXToken.sol');

module.exports = function(deployer) {
  deployer.deploy(MEXCToken);
  deployer.deploy(MXToken);
  deployer.deploy(MEXConomy);
};
