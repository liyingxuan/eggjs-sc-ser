'use strict';

const Service = require('egg').Service;

class SmartContract extends Service {
	// 向数据库请求全部数据，默认10条
	async list({offset = 0, limit = 10, address, modulo}) {
		const attributes = ['address', 'random', 'placeTxHash', 'commitBlockHash', 'value', 'mask', 'modulo', 'txHash', 'paymentRet'];
		const order = [['id', 'desc']];

		if ((typeof(address) === 'undefined' || address === '') && (typeof(modulo) === 'undefined' || modulo === '')) {
			return this.ctx.model.SmartContract.findAndCountAll({
				attributes: attributes,
				offset,
				limit,
				order: order,
			});
		} else {
			let where = {};

			if (typeof(modulo) === 'undefined' || modulo === '') {
				where = {address: address}
			} else {
				where = {modulo: modulo}
			}

			return this.ctx.model.SmartContract.findAndCountAll({
				attributes: attributes,
				offset,
				limit,
				order: order,
				where: where
			});
		}
	}

	// 向数据库获取指定commit的数据
	async find({commit}) {
		const attributes = ['address', 'random', 'placeTxHash', 'commitBlockHash', 'value', 'mask', 'modulo', 'txHash', 'paymentRet'];
		const data = await this.ctx.model.SmartContract.findAll({
			attributes: attributes,
			where: {
				commit: commit
			}
		});

		if (!data) {
			this.ctx.throw(404, 'commit not found');
		}

		return data;
	}

	// 获取从哪个块高开始
	async getFromBlock(status) {
		const data = await this.ctx.model.SmartContract.findOne({
			where: {
				status: status,
				$add: this.app.Sequelize.where(
					this.app.Sequelize.fn('DATE', this.app.Sequelize.col('created_at')),
					this.app.Sequelize.literal('CURRENT_DATE'),
				)
			},
		});

		if (!data) {
			return false
		}
		return data.dataValues.blockNum;
	}

	// 新建数据
	async create(initData) {
		return this.ctx.model.SmartContract.create(initData);
	}

	// 更新数据
	async update({commit, updates}, status) {
		let where = {commit: commit};
		if (status !== '') { // starting：开始游戏；send:发送了sign； sent：已发送settleBet； completed：已完成。
			where.status = status;
		}

		const data = await this.ctx.model.SmartContract.find({where: where});
		if (!data) return false;

		// 更新入库
		data.update(updates);

		return data;
	}

	// 更新Payment数据
	async updatePaymentStatus({txHash, updates}) {
		const data = await this.ctx.model.SmartContract.find({
			where: {
				txHash: txHash,
				status: 'sent' // starting：开始游戏；send:发送了sign； sent：已发送settleBet； completed：已完成。
			}
		});
		if (!data) {
			return false
		}

		// 更新入库
		data.update(updates);

		return data;
	}

	// 获取成交的总笔数
	async getBets() {
		return await this.ctx.model.SmartContract.findAll({
			attributes: [[this.app.model.fn('COUNT', this.app.model.col('status')), 'bets']],
			where: {
				status: 'completed'
			}
		});
	}

	// 获取成交的总金额
	async getAmount() {
		return await this.ctx.model.SmartContract.findAll({
			attributes: [[this.app.model.literal('SUM(value)'), 'amount']],
			where: {
				status: 'completed'
			}
		});
	}

	// 获取大于0.1的总笔数
	async getCurrentJackpot() {
		return await this.ctx.model.SmartContract.findAll({
			attributes: [[this.app.model.fn('COUNT', this.app.model.col('value')), 'bets']],
			where: {
				value: {
					[this.app.model.Op.gte]: 0.1
				}
			}
		});
	}
}

module.exports = SmartContract;
