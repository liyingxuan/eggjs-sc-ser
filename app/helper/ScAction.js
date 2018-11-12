const web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const path = require('path'); //系统路径模块

let ScAction = {
	contractAbiPath: path.join(__dirname, '../public/LoadFiles/abi.json'),

	myFilePath: path.join(__dirname, '../public/LoadFiles/my-pk.json'),

	myData: {
		"serverUrl": "",
		"contractAddress": "",
		"signAccountPK": "",
		"croupierAccountPK": ""
	},

	/**
	 * 通过随机数获取签名等信息。
	 *
	 * @param randNumber
	 * @return {Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)}> | Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | void | * | PromiseLike<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | Promise<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never>}
	 */
	getSign: function (randNumber) {
		let myFile = JSON.parse(fs.readFileSync(this.myFilePath));
		this.myData = myFile[0];

		const scWeb3 = new web3(new web3.providers.HttpProvider(this.myData.serverUrl));
		const signAccount = scWeb3.eth.accounts.privateKeyToAccount(this.myData.signAccountPK);

		return scWeb3.eth.getBlockNumber().then(res => {
			let num = res + 64; // 补到未来64的高度
			let bNumber = scWeb3.utils.padLeft(num, 10);
			let commit = scWeb3.utils.soliditySha3(randNumber);
			let hash = scWeb3.utils.soliditySha3(bNumber, commit);
			let sign = signAccount.sign(hash);

			return {
				blockNum: res,
				usedNum: bNumber,
				random: randNumber,
				commit: commit,
				sign: sign
			}
		})
	},

	// TODO 测试中
	redeem: function (reveal, blockhash) {
		let contractABI = JSON.parse(fs.readFileSync(this.contractAbiPath));
		let myFile = JSON.parse(fs.readFileSync(this.myFilePath));
		this.myData = myFile[0];

		const scWeb3 = new web3(new web3.providers.HttpProvider(this.myData.serverUrl));
		const croupierAccount = scWeb3.eth.accounts.privateKeyToAccount(this.myData.croupierAccountPK);
		const contracts = new scWeb3.eth.Contract(contractABI, this.myData.contractAddress);

		scWeb3.eth.getTransactionCount(croupierAccount.address).then((nonce) => {
			let rawTransaction = {
				"from": croupierAccount.address,
				"gasPrice": scWeb3.utils.toHex(20 * 1e9),
				"gasLimit": scWeb3.utils.toHex(210000),
				"to": this.contractAddress,
				"value": 0,
				"data": contracts.methods.settleBet(reveal, blockhash).encodeABI(),
				"nonce": scWeb3.utils.toHex(nonce)
			};

			croupierAccount.signTransaction(rawTransaction).then((sTx) => {
				scWeb3.eth.sendSignedTransaction(sTx.rawTransaction).then()
			});
		})
	},

	/**
	 * 定时任务：获取Events的commit类型
	 */
	getEvents: function () {
		let contractABI = JSON.parse(fs.readFileSync(this.contractAbiPath));
		let myFile = JSON.parse(fs.readFileSync(this.myFilePath));
		this.myData = myFile[0];

		const scWeb3 = new web3(new web3.providers.HttpProvider(this.myData.serverUrl));
		const contracts = new scWeb3.eth.Contract(contractABI, this.myData.contractAddress);

		contracts.getPastEvents('Commit', {
			fromBlock: 0,
			toBlock: 'latest'
		}).then(function (events) {
			console.log('event data: ');
			console.log(events);

			if (events.length > 0) {
				this.setEventCommitData(events);
			}
		});
	},

	/**
	 * 将符合要求的commit数据入库
	 *
	 * @param data
	 */
	setEventCommitData: function (data) {
		let contractABI = JSON.parse(fs.readFileSync(this.contractAbiPath));
		let myFile = JSON.parse(fs.readFileSync(this.myFilePath));
		this.myData = myFile[0];

		const scWeb3 = new web3(new web3.providers.HttpProvider(this.myData.serverUrl));

		console.log(data)
		scWeb3.eth.getTransaction(data[0].transactionHash).then(res => {
			const decoder = new InputDataDecoder(contractABI);

			// 解构event获得的数据
			let inputs = decoder.decodeData(res.input);
			let value = scWeb3.utils.fromWei(res.value, 'ether') + 'ether';
			let mask = inputs.inputs[0].toString();
			let modulo = inputs.inputs[1].toString();
			let blockNumber = inputs.inputs[2].toString();
			let commit = scWeb3.utils.toHex(inputs.inputs[3]);

			// 更新数据到数据库
			const updates = {
				value: value,
				mask: mask,
				modulo: modulo,
				blockNumber: blockNumber
			};
			console.log('commit: ' + commit)
			console.log(updates)
			let dbData = this.updateSC(commit, updates)
			console.log(dbData)

			this.redeem(dbData.random, data[0].blockHash);
		});
	},

	/**
	 * 更新数据到SC库里。
	 *
	 * @param commit
	 * @param updates
	 * @return {*}
	 */
	updateSC: function (commit, updates) {
		const ctx = this.ctx;
		const params = {
			commit: commit,
			updates: updates
		};

		return ctx.service.smartContract.update(params);
	}
};

module.exports = ScAction;
