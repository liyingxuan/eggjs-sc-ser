'use strict';

const Controller = require('egg').Controller;
const MyTools = require('../helper/MyTools');
const ScAction = require('../helper/ScAction');

class SmartContractController extends Controller {
	/**
	 * Method: GET
	 * URL: http://localhost:7001/api/sc/
	 * Func: 获取全部数据，默认10条。
	 *
	 * 获取5条每页的第2页，地址是test的（3个参数都可选）：
	 * http://localhost:7001/api/sc?limit=5&offset=2&address=test
	 *
	 * @return {Promise<void>}
	 */
	async index() {
		const ctx = this.ctx;
		const query = {
			limit: MyTools.toInt(ctx.query.limit),
			offset: MyTools.toInt(ctx.query.offset),
			address: ctx.query.address,
			modulo: ctx.query.modulo
		};

		let allData = await ctx.service.smartContract.list(query);
		allData.rows = await this.retDataParse(allData.rows);

		ctx.body = allData
	}

	/**
	 * Method: GET
	 * URL: http://localhost:7001/api/sc/[commit]
	 * Func:根据commit查看信息。
	 *
	 * @return {Promise<void>}
	 */
	async show() {
		const ctx = this.ctx;
		const query = {commit: ctx.params.id};

		let allData = await ctx.service.smartContract.find(query);

		ctx.body = await this.retDataParse(allData)
	}

	/**
	 * JSON对象格式返回
	 *
	 * @param allData
	 * @return {Promise<*>}
	 */
	async retDataParse(allData) {
		for (let i in allData) {
			// allData[data].dataValues.sign = JSON.parse(allData[data].dataValues.sign);
			// allData[data].dataValues.settleBetRet = JSON.parse(allData[data].dataValues.settleBetRet);
			allData[i].dataValues.paymentRet = JSON.parse(allData[i].dataValues.paymentRet)

			// 防攻击
			if(allData[i].txHash === null){
				allData[i].random = null
			}

		}

		return allData
	}

	/**
	 * Method: POST
	 * URL: http://localhost:7001/api/sc/
	 * DataType: JSON(application/json)
	 * Data: {"address": "test"}
	 * Func: POST用户address生成新的游戏。
	 *
	 * @return {Promise<void>}
	 */
	async create() {
		const ctx = this.ctx;
		let res;

		if (typeof(ctx.request.body.address) === 'undefined' || ctx.request.body.address === '') {
			// 返回错误给前台
			ctx.status = 400;
			ctx.body = {info: 'address is required'};
		} else {
			// 签名
			try {
				do {
					res = await ScAction.getSign(ctx);
				} while (res.sign.v !== 27) ; // 必须要27，否则无法使用
			} catch (e) {
				ctx.status = 500;
				ctx.body = res;
			}

			// 数据构造
			res.address = ctx.request.body.address;
			let status = 'starting'; // starting：开始游戏； sent：已发送settleBet； completed：已完成。
			let {address, blockNum, usedNum, random, commit, sign} = res;
			sign = JSON.stringify(sign); // String格式存入DB

			// 入库
			const ret = await ctx.service.smartContract.create({address, blockNum, usedNum, random, commit, sign, status});
			ret.sign = JSON.parse(ret.sign); // JSON对象格式返回

			// 返回数据给前台
			ctx.status = 201;
			ctx.body = {
				usedNum: ret.usedNum,
				commit: ret.commit,
				sign: {
					r: ret.sign.r,
					s: ret.sign.s
				}
			}
		}
	}

	/**
	 * Method: PUT
	 * URL: http://localhost:7001/api/sc/[address]
	 * DataType: JSON(application/json)
	 * Data: {"address": "test", "status": 0}
	 * Func: 可以把address为test的用户状态修改成0。
	 *
	 * @return {Promise<void>}
	 */
	// async update() {}

	/**
	 * Method: DELETE
	 * URL: http://localhost:7001/api/sc/[address]
	 * Func: 可以删除指定address的用户
	 *
	 * @return {Promise<void>}
	 */
	// async destroy() {}
}

module.exports = SmartContractController;
