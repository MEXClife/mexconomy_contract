
var MEXConomy = artifacts.require('./MEXConomy.sol');
var MEXConomyTokens = artifacts.require('./MEXConomyTokens.sol');
var MEXCToken = artifacts.require('./MEXCToken.sol');
var MXToken = artifacts.require('./MXToken.sol');

module.exports = function(deployer) {
  deployer.deploy(MEXConomy);
  deployer.deploy(MEXConomyTokens);
  deployer.deploy(MEXCToken);
  deployer.deploy(MXToken);
};
