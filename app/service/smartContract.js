'use strict';

const Service = require('egg').Service;

class SmartContract extends Service {
	// 向数据库请求全部数据，默认10条
	async list({offset = 0, limit = 10}) {
		return this.ctx.model.SmartContract.findAndCountAll({
			offset,
			limit,
			order: [['created_at', 'desc'], ['id', 'desc']],
		});
	}

	// 向数据库获取指定address的数据
	async find(address) {
		const data = await this.ctx.model.SmartContract.findAll({
			where: {
				address: address
			}
		});
		if (!data) {
			this.ctx.throw(404, 'address not found');
		}
		return data;
	}

	// 新建数据
	async create(initData) {
		return this.ctx.model.SmartContract.create(initData);
	}

	// 更新数据
	async update({commit, updates}) {
		const data = await this.ctx.model.SmartContract.find('commit', commit);
		if (!data) {
			this.ctx.throw(404, 'data not found');
		}
		return data.update(updates);
	}
}

module.exports = SmartContract;
