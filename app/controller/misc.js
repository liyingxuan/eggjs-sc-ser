'use strict';

const Controller = require('egg').Controller;

/**
 * 获取一些杂项统计数据
 */
class MiscController extends Controller {
	async index() {
		const ctx = this.ctx;

		let bets = await ctx.service.smartContract.getBets().then();
		let amount = await ctx.service.smartContract.getAmount().then();
		let currentJackpot = await ctx.service.smartContract.getCurrentJackpot().then();

		ctx.body = {
			flow: {
				amount: amount[0].dataValues.amount,
				bets: bets[0].dataValues.bets
			},
			currentJackpot: ((currentJackpot[0].dataValues.bets) * 0.001).toFixed(4),
			last5LuckyMan: [{
				address: '',
				amount: 0,
				tx: ''
			}],
			top3: [{
				address: '',
				modulo: 0,
				amount: 0,
				tx: ''
			}]
		}
	}
}

module.exports = MiscController;
