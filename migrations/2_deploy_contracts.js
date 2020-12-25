const Arbitrage = artifacts.require("Arbitrage");

module.exports = function (deployer) {
  deployer.deploy(Arbitrage, { value: 100 });
};
