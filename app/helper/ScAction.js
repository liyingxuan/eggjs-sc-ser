const InputDataDecoder = require('ethereum-input-data-decoder');
const EthCrypto = require('eth-crypto');
const MyTools = require('./MyTools');

/**
 * SmartContact Action
 *
 * @type {{getSign: (function(*): (Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}}> | Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never> | void | * | PromiseLike<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never> | Promise<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never>)), getEvents: ScAction.getEvents, setEventCommitData: ScAction.setEventCommitData, redeem: (function(*=, *=, *=, *=): (Bluebird<any> | Bluebird<R | never> | void | * | PromiseLike<T | never> | Promise<T | never>)), updateSC: (function(*, *=, *=): (any | R | T)), updateStatusSend: (function(*, *=, *=): (any | R | T)), updateStatus: (function(*, *=, *=, *=): (any | R | T)), updatePayment: (function(*, *=, *): boolean)}}
 */
let ScAction = {
	/**
	 * 通过随机数获取签名等信息。
	 *
	 * @param ctx
	 * @return {Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}}> | Bluebird<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never> | void | * | PromiseLike<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never> | Promise<{blockNum: *, usedNum: *, random: *, commit: *, sign: {r: string, s: string, v: *}} | never>}
	 */
	getSign: function (ctx) {
		return ctx.app.scWeb3.eth.getBlockNumber().then(res => {
			let num = res + 64; // 补到未来64的高度
			let bNumber = ctx.app.scWeb3.utils.padLeft(num, 10);
			let randNumber = ctx.app.scWeb3.utils.randomHex(32);
			let commit = ctx.app.scWeb3.utils.soliditySha3(randNumber);
			let hash = ctx.app.scWeb3.utils.soliditySha3(bNumber, commit);

			let signHash = EthCrypto.sign(ctx.app.myData.signAccountPK, hash);
			let sign = {
				r: signHash.slice(0, 66),
				s: '0x' + signHash.slice(66, 130),
				v: ctx.app.scWeb3.utils.toDecimal('0x' + signHash.slice(130, 132))
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
		if(ctx.app.contractABI === undefined) return;

		let fromBlock = 4452452;

		// 获得状态为starting的当天第一条数据的块高，然后减去300
		ctx.service.smartContract.getFromBlock('starting').then(res => {
			if (res !== false) {
				fromBlock = res - 300;

				// event Commit
				ctx.app.contracts.getPastEvents('Commit', {fromBlock: fromBlock, toBlock: 'latest'}).then(events => {
					if (events.length > 0) {
						for (let index in events) {
							ScAction.setEventCommitData(events[index], ctx);
						}
					}
				}).catch(error => {
				});
			}
		}).catch(error => {
		});

		// 获得状态为sent的当天第一条数据的块高，然后减去300
		ctx.service.smartContract.getFromBlock('sent').then(res => {
			if (res !== false) {
				fromBlock = res - 300;

				// event Payment
				ctx.app.contracts.getPastEvents('Payment', {fromBlock: fromBlock, toBlock: 'latest'}).then(events => {
					if (events.length > 0) {
						for (let index in events) {
							if (typeof(events[index].transactionHash) !== 'undefined') {
								ScAction.updatePayment(ctx, events[index].transactionHash, events[index].returnValues)
							}
						}
					}
				}).catch(error => {
				})
			}
		}).catch(error => {
		});

		// 获得状态为send的当天第一条数据的块高，然后减去300
		// ctx.service.smartContract.getFromBlock('starting').then(res => {
		// 	if (res !== false) {
		// 		fromBlock = res - 1000;
		//
		// 		ctx.app.contracts.getPastEvents('Payment', {fromBlock: 6822380, toBlock: 'latest'}).then(events => {
		// 			for (let index in events) {
		// 				ctx.app.scWeb3.eth.getTransaction(events[index].transactionHash).then(res => {
		// 					let decoder = new InputDataDecoder(ctx.app.contractABI);
		// 					let inputs = decoder.decodeData(res.input);
		// 					let str = MyTools.to66Length(inputs.inputs[0].toString(16));
		// 					let json = {
		// 						'str': str,
		// 						'commit': ctx.app.scWeb3.utils.soliditySha3(str),
		// 						'hash': res.hash,
		// 					};
		//
		// 					console.log(JSON.stringify(json))
		// 				})
		// 			}
		// 		}).catch(error => {
		// 		})
		// 	}
		// }).catch(error => {
		// });
	},

	/**
	 * 将符合要求的commit数据入库
	 *
	 * @param data
	 * @param ctx
	 */
	setEventCommitData: function (data, ctx) {
		ctx.app.scWeb3.eth.getTransaction(data.transactionHash).then(res => {
			const decoder = new InputDataDecoder(ctx.app.contractABI);

			// 解构event获得的数据
			let inputs = decoder.decodeData(res.input);
			let value = ctx.app.scWeb3.utils.fromWei(res.value, 'ether');
			let mask = inputs.inputs[0].toString();
			let modulo = inputs.inputs[1].toString();
			let blockNumber = inputs.inputs[2].toString();
			let commit = MyTools.to66LengthFor0x(ctx.app.scWeb3.utils.toHex(inputs.inputs[3]));

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
		return ctx.app.scWeb3.eth.getGasPrice().then(price => {
			let rawTransaction = {
				"from": ctx.app.croupierAccount.address,
				"gasPrice": ctx.app.scWeb3.utils.toHex(ctx.app.scWeb3.utils.toDecimal(price) * 1.2),
				"gasLimit": ctx.app.scWeb3.utils.toHex(210000),
				"to": ctx.app.myData.contractAddress,
				"value": 0,
				"data": ctx.app.contracts.methods.settleBet(reveal, blockHash).encodeABI()
			};

			// Update to send
			this.updateStatusSend(ctx, commit, rawTransaction);

			return ctx.app.croupierAccount.signTransaction(rawTransaction).then(sTx => {
				ctx.app.scWeb3.eth.sendSignedTransaction(sTx.rawTransaction).then(res => {
					return this.updateStatus(ctx, commit, res, true)
				}).catch(error => {
					return this.updateStatus(ctx, commit, error, false)
				})
			});
		}).catch()
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

		return await ctx.service.smartContract.update(params, 'starting').then(res => {
			return res;
		});
	},

	/**
	 * 已经发送过signTransaction
	 *
	 * @param ctx
	 * @param commit
	 * @param rawTransaction
	 * @return {Promise<any | R | T>}
	 */
	updateStatusSend: async function(ctx, commit, rawTransaction) {
		let params = {
			commit: commit,
			updates: {
				sendSignTxData: JSON.stringify(rawTransaction),
				status: 'send' // starting：开始游戏； send：已发送sign；sent：已发送settleBet； completed：已完成; error：出错。
			}
		};

		return await ctx.service.smartContract.update(params, 'starting').then(res => {
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
					status: 'sent' // starting：开始游戏； send：已发送sign；sent：已发送settleBet； completed：已完成; error：出错。
				}
			};
		} else {
			let txHash = '';
			let settleBetRet = resData.toString();
			let status = 'error' // starting：开始游戏； send：已发送sign；sent：已发送settleBet； completed：已完成; error：出错。
			if(settleBetRet.indexOf('known transaction') !== -1) {
				txHash = settleBetRet.substr(42); // 取出合约hash
				txHash = MyTools.to66Length(txHash.trim());
				status = 'sent'
			}
			params = {
				commit: commit,
				updates: {
					txHash: txHash,
					settleBetRet: settleBetRet,
					status: status
				}
			};
		}

		return await ctx.service.smartContract.update(params, 'send').then(res => {
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
				status: 'completed' // starting：开始游戏； send：已发送sign；sent：已发送settleBet； completed：已完成; error：出错。
			},
		};

		return await ctx.service.smartContract.updatePaymentStatus(params).then(res => {
			return res;
		});
	}
};

module.exports = ScAction;
