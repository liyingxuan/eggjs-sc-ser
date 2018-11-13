'use strict';

const Service = require('egg').Service;

class SmartContract extends Service {
	// 向数据库请求全部数据，默认10条
	async list({offset = 0, limit = 10, address}) {
		if(typeof(address) === 'undefined' || address === '') {
			return this.ctx.model.SmartContract.findAndCountAll({
				offset,
				limit,
				order: [['created_at', 'desc'], ['id', 'desc']],
			});
		} else {
			return this.ctx.model.SmartContract.findAndCountAll({
				offset,
				limit,
				order: [['created_at', 'desc'], ['id', 'desc']],
				where: {
					address: address
				}
			});
		}
	}

	// 向数据库获取指定address的数据
	async find({commit}) {
		const data = await this.ctx.model.SmartContract.findAll({
			where: {
				commit: commit
			}
		});
		if (!data) {
			this.ctx.throw(404, 'commit not found');
		}
		return data;
	}

	// 新建数据
	async create(initData) {
		return this.ctx.model.SmartContract.create(initData);
	}

	// 更新数据
	async update({commit, updates}) {
		const data = await this.ctx.model.SmartContract.find({
			where: {
				commit: commit,
				status: 'starting' // starting：开始游戏； sent：已发送settleBet； completed：已完成。'
			}
		});
		if (!data) {
			return false
		}

		// 更新入库
		data.update(updates);

		return data;
	}
}

module.exports = SmartContract;
