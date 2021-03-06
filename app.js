const web3 = require('web3');
const fs = require('fs');

module.exports = app => {
	app.beforeStart(async () => {
		// 加载文件
		app.myData = JSON.parse(fs.readFileSync('app/public/LoadFiles/my-pk.json'))[0];
		app.contractABI = JSON.parse(fs.readFileSync('app/public/LoadFiles/abi.json'));

		// 设置web3
		app.scWeb3 = new web3(new web3.providers.HttpProvider(app.myData.serverUrl));
		app.contracts = new app.scWeb3.eth.Contract(app.contractABI, app.myData.contractAddress);
		app.signAccount = app.scWeb3.eth.accounts.privateKeyToAccount(app.myData.signAccountPK);
		app.croupierAccount = app.scWeb3.eth.accounts.privateKeyToAccount(app.myData.croupierAccountPK);

		// 初始Gas Price、nonce
		app.latestGasPrice = 12000000000;
		app.nonce = -1;

		// 应用会等待这个函数执行完成才启动
		app.isGetEvent = true;
		await app.runSchedule('update-gas-price');
		await app.runSchedule('sc-event');
	});
};