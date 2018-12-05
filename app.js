const web3 = require('web3');
const fs = require('fs');

module.exports = app => {
	app.beforeStart(async () => {
		// 应用会等待这个函数执行完成才启动
		await app.runSchedule('sc-event');

		// 加载文件
		let myData = JSON.parse(fs.readFileSync('app/public/LoadFiles/my-pk.json'))[0];
		app.contractABI = JSON.parse(fs.readFileSync('app/public/LoadFiles/abi.json'));

		// 设置web3
		app.scWeb3 = new web3(new web3.providers.HttpProvider(myData.serverUrl));
		app.contracts = new app.scWeb3.eth.Contract(app.contractABI, myData.contractAddress);
		app.signAccount = app.scWeb3.eth.accounts.privateKeyToAccount(myData.signAccountPK);
		app.croupierAccount = app.scWeb3.eth.accounts.privateKeyToAccount(myData.croupierAccountPK);
	});
};