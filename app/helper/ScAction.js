const web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const path = require('path'); //系统路径模块

let ScAction = {
	contractAbiPath: path.join(__dirname, '../public/LoadFiles/abi.json'),
	myFilePath: path.join(__dirname, '../public/LoadFiles/my-pk.json'),
	contractABI: '',
	myData: {
		"serverUrl": "",
		"contractAddress": "",
		"signAccountPK": "",
		"croupierAccountPK": ""
	},
	scWeb3: '',
	contracts:'',
	signAccount: '',
	croupierAccount: '',

	/**
	 * 初始化必要参数。
	 */
	init: function () {
		this.contractABI = JSON.parse(fs.readFileSync(this.contractAbiPath));
		this.myData = JSON.parse(fs.readFileSync(this.myFilePath))[0];

		this.scWeb3 = new web3(new web3.providers.HttpProvider(this.myData.serverUrl));
		this.contracts = new this.scWeb3.eth.Contract(this.contractABI, this.myData.contractAddress);
		this.signAccount = this.scWeb3.eth.accounts.privateKeyToAccount(this.myData.signAccountPK);
		this.croupierAccount = this.scWeb3.eth.accounts.privateKeyToAccount(this.myData.croupierAccountPK);
	},

	/**
	 * 通过随机数获取签名等信息。
	 *
	 * @param randNumber
	 * @return {Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)}> | Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | void | * | PromiseLike<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | Promise<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never>}
	 */
	getSign: function (randNumber) {
		this.init();

		return this.scWeb3.eth.getBlockNumber().then(res => {
			let num = res + 64; // 补到未来64的高度
			let bNumber = this.scWeb3.utils.padLeft(num, 10);
			let commit = this.scWeb3.utils.soliditySha3(randNumber);
			let hash = this.scWeb3.utils.soliditySha3(bNumber, commit);
			let sign = this.signAccount.sign(hash);

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
		this.init();

		this.scWeb3.eth.getTransactionCount(this.croupierAccount.address).then((nonce) => {
			let rawTransaction = {
				"from": this.croupierAccount.address,
				"gasPrice": this.scWeb3.utils.toHex(20 * 1e9),
				"gasLimit": this.scWeb3.utils.toHex(210000),
				"to": this.contractAddress,
				"value": 0,
				"data": this.contracts.methods.settleBet(reveal, blockhash).encodeABI(),
				"nonce": this.scWeb3.utils.toHex(nonce)
			};

			this.croupierAccount.signTransaction(rawTransaction).then((sTx) => {
				this.scWeb3.eth.sendSignedTransaction(sTx.rawTransaction).then()
			});
		})
	},

	/**
	 * 定时任务：获取Events的commit类型
	 */
	getEvents: function () {
		this.init();

		this.contracts.getPastEvents('Commit', {
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
		this.init();

		console.log(data)
		this.scWeb3.eth.getTransaction(data[0].transactionHash).then(res => {
			const decoder = new InputDataDecoder(this.contractABI);

			// 解构event获得的数据
			let inputs = decoder.decodeData(res.input);
			let value = this.scWeb3.utils.fromWei(res.value, 'ether') + 'ether';
			let mask = inputs.inputs[0].toString();
			let modulo = inputs.inputs[1].toString();
			let blockNumber = inputs.inputs[2].toString();
			let commit = this.scWeb3.utils.toHex(inputs.inputs[3]);

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
