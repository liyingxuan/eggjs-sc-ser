var Contracts = artifacts.require("./contracts.sol");

module.exports = function(deployer) {
	  deployer.deploy(Contracts);
};
