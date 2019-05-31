const Subscription = require('egg').Subscription;
const ScAction = require('../helper/ScAction');

class ScEvent extends Subscription {
	// 通过 schedule 属性来设置定时任务的执行间隔等配置
	static get schedule() {
		return {
			interval: '5s',
			type: 'all', // 指定所有的 worker 都需要执行
		};
	}

	// subscribe 是真正定时任务执行时被运行的函数
	async subscribe() {
		ScAction.getEvents(this.ctx)
	}
}

module.exports = ScEvent;
