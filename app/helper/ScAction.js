const web3 = require('web3');
const fs = require('fs');
const path = require('path'); //系统路径模块
const InputDataDecoder = require('ethereum-input-data-decoder');
const EthCrypto = require('eth-crypto');

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
	contracts: '',
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
	 * @return {Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)}> | Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | void | * | PromiseLike<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never> | Promise<{blockNum: *, usedNum: *, random: *, commit: *, sign: (*|Buffer|string|number|PromiseLike<ArrayBuffer>)} | never>}
	 */
	getSign: function () {
		this.init();

		return this.scWeb3.eth.getBlockNumber().then(res => {
			let num = res + 64; // 补到未来64的高度
			let bNumber = this.scWeb3.utils.padLeft(num, 10);
			let randNumber = this.scWeb3.utils.randomHex(32);
			let commit = this.scWeb3.utils.soliditySha3(randNumber);
			let hash = this.scWeb3.utils.soliditySha3(bNumber, commit);

			let signHash = EthCrypto.sign(this.myData.signAccountPK, hash);
			let sign = {
				r: signHash.slice(0, 66),
				s: '0x' + signHash.slice(66, 130),
				v: this.scWeb3.utils.toDecimal('0x' + signHash.slice(130, 132))
			};

			return {
				blockNum: res,
				usedNum: bNumber,
				random: randNumber,
				commit: commit,
				sign: sign
			}
		})
	},

	/**
	 * 定时任务：获取Events的commit类型
	 */
	getEvents: function (ctx) {
		this.init();
		let fromBlock = 4452452;

		// 获得状态为starting的当天第一条数据的块高，然后减去300
		ctx.service.smartContract.getFromBlock('starting').then(res => {
			if (res !== false) {
				fromBlock = res - 300;

				// event Commit
				this.contracts.getPastEvents('Commit', {fromBlock: fromBlock, toBlock: 'latest'}).then(events => {
					if (events.length > 0) {
						for (let index in events) {
							ScAction.setEventCommitData(events[index], ctx);
						}
					}
				}).catch(error => {});
			}
		}).catch(error => {});

		// 获得状态为sent的当天第一条数据的块高，然后减去300
		ctx.service.smartContract.getFromBlock('sent').then(res => {
			if (res !== false) {
				fromBlock = res - 300;

				// event Payment
				this.contracts.getPastEvents('Payment', {fromBlock: fromBlock, toBlock: 'latest'}).then(events => {
					if (events.length > 0) {
						for (let index in events) {
							if (typeof(events[index].transactionHash) !== 'undefined') {
								ScAction.updatePayment(ctx, events[index].transactionHash, events[index].returnValues)
							}
						}
					}
				}).catch(error => {});
			}
		}).catch(error => {});

		// this.contracts.getPastEvents('FailedPayment', {
		// 	fromBlock: fromBlock,
		// 	toBlock: 'latest'
		// }).then(res => {
		// 	console.log(res.length)
		// })
	},

	/**
	 * 将符合要求的commit数据入库
	 *
	 * @param data
	 */
	setEventCommitData: function (data, ctx) {
		this.init();

		this.scWeb3.eth.getTransaction(data.transactionHash).then(res => {
			const decoder = new InputDataDecoder(this.contractABI);

			// 解构event获得的数据
			let inputs = decoder.decodeData(res.input);
			let value = this.scWeb3.utils.fromWei(res.value, 'ether');
			let mask = inputs.inputs[0].toString();
			let modulo = inputs.inputs[1].toString();
			let blockNumber = inputs.inputs[2].toString();
			let commit = this.scWeb3.utils.toHex(inputs.inputs[3]);

			// 补齐0x + 64位长
			if(commit.length < 66) {
				let tmpStr = '0';
				for(let i = 1; i < (66 - commit.length); i++) {
					tmpStr = '0' + tmpStr
				}
				commit = '0x' + tmpStr + commit.substr(2);
			}

			// 更新数据到数据库
			const updates = {
				placeTxHash: res.hash,
				commitBlockHash: res.blockHash,
				value: value,
				mask: mask,
				modulo: modulo,
				blockNumber: blockNumber
			};

			this.updateSC(ctx, commit, updates).then(res => {
				if (res !== false) {
					this.redeem(ctx, res.commit, res.random, data.blockHash);
				}
			});
		});
	},

	/**
	 * 赎回
	 *
	 * @param ctx
	 * @param commit
	 * @param reveal
	 * @param blockHash
	 * @return {Bluebird<any> | Bluebird<R | never> | void | * | PromiseLike<T | never> | Promise<T | never>}
	 */
	redeem: function (ctx, commit, reveal, blockHash) {
		this.init();

		return this.scWeb3.eth.getTransactionCount(this.croupierAccount.address).then((nonce) => {
			// Get gas price
			return this.scWeb3.eth.getGasPrice().then(price => {
				let rawTransaction = {
					"from": this.croupierAccount.address,
					"gasPrice": this.scWeb3.utils.toHex(price),
					"gasLimit": this.scWeb3.utils.toHex(210000),
					"to": this.myData.contractAddress,
					"value": 0,
					"data": this.contracts.methods.settleBet(reveal, blockHash).encodeABI(),
					"nonce": this.scWeb3.utils.toHex(nonce)
				};

				return this.croupierAccount.signTransaction(rawTransaction).then(sTx => {
					this.scWeb3.eth.sendSignedTransaction(sTx.rawTransaction).then(res => {
						return this.updateStatus(ctx, commit, res, true)
					}).catch(error => {
						return this.updateStatus(ctx, commit, error, false)
					})
				});
			})


		})
	},

	/**
	 * 更新commit数据到SC库里。
	 *
	 * @param ctx
	 * @param commit
	 * @param updates
	 * @return {*}
	 */
	updateSC: async function (ctx, commit, updates) {
		const params = {
			commit: commit,
			updates: updates
		};

		return await ctx.service.smartContract.update(params).then(res => {
			return res;
		});
	},

	/**
	 * 更新settleBetRet、交易hash和status。
	 *
	 * @param ctx
	 * @param commit
	 * @param resData
	 * @param right
	 * @return {Promise<any | R | T>}
	 */
	updateStatus: async function (ctx, commit, resData, right) {
		let params = {};

		if (right) {
			params = {
				commit: commit,
				updates: {
					txHash: typeof(resData.logs[0].transactionHash) === 'undefined' ? '' : resData.logs[0].transactionHash,
					settleBetRet: JSON.stringify(resData),
					status: 'sent' // starting：开始游戏； sent：已发送settleBet； completed：已完成; error：出错。
				}
			};
		} else {
			params = {
				commit: commit,
				updates: {
					txHash: '',
					settleBetRet: resData.toString(),
					status: 'error' // starting：开始游戏； sent：已发送settleBet； completed：已完成; error：出错。
				}
			};
		}

		return await ctx.service.smartContract.update(params).then(res => {
			return res;
		});
	},

	/**
	 * 根据txHash更新event Payment的返回数据和status。
	 *
	 * @param ctx
	 * @param txHash
	 * @param paymentRet
	 * @return {Promise<boolean>}
	 */
	updatePayment: async function (ctx, txHash, paymentRet) {
		const params = {
			txHash: txHash,
			updates: {
				paymentRet: JSON.stringify({
					amount: paymentRet.amount,
					beneficiary: paymentRet.beneficiary
				}),
				status: 'completed' // starting：开始游戏； sent：已发送settleBet； completed：已完成; error：出错。
			},
		};

		return await ctx.service.smartContract.updatePaymentStatus(params).then(res => {
			return res;
		});
	}
};

module.exports = ScAction;
