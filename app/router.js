'use strict';

module.exports = app => {
  const { router } = app;

	/**
	 * 映射全部的接口
	 *
	 * 【Example】
	 * 查询全部：  GET     http://localhost:7001/api/sc/?address=[address]&limit=[limit]&offset=[offset]
	 * 查询某条：  GET     http://localhost:7001/api/sc/[commit]
	 * 新建数据：  POST    http://localhost:7001/api/sc/
	 * 更新数据：  PUT     http://localhost:7001/api/sc/[commit]
	 * 删除数据：  DELETE  http://localhost:7001/api/sc/[commit]
	 *
	 * 其中POST需要注意一下，默认不支持form-data的传参，如果使用postman调试需要在：
	 * Body -> raw 选择JSON(application/json) -> 传json，例如：
	 * {"address": "test"}
	 *
 	 */
	router.resources('smart-contract', '/api/sc', app.controller.smartContract);

	router.get('/api/misc', app.controller.misc.index);
};
