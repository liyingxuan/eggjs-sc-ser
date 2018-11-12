let HDWalletProvider = require("truffle-hdwallet-provider");

// Ganache生成的助记词，记得替换：
let mnemonic = "cup finish derive napkin focus hammer concert vacant anxiety worth wrap write";

module.exports = {
	networks: {
		development: {
			// provider: () => new HDWalletProvider(mnemonic, "http://127.0.0.1:7545"),
			host: '127.0.0.1',
			port: '7545',
			network_id: "*"
		},
		ropsten: {
			// 后面那一串是https://infura.io/dashboard的API KEY，记得替换：
			provider: () => new HDWalletProvider(mnemonic, "https://ropsten.infura.io/de21b1273afe44f292c6dd82de249654"),
			network_id: '3'
		},
		mainnet: {
			provider: () => new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/de21b1273afe44f292c6dd82de249654'),
			network_id: '1',
			gas: 4500000,
			gasPrice: 10000000000
		}
	}
};
