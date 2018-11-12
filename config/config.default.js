'use strict';

module.exports = appInfo => {
	const config = {};

	// should change to your own
	config.keys = appInfo.name + '_1490750627161_5967';

	config.middleware = ['errorHandler'];

	// Egg.js中的ORM框架
	config.sequelize = {
		dialect: 'mysql',
		host: '127.0.0.1',
		port: 3306,
		database: 'node-js',
		password: 'password'
	};

	// 禁用了CSRF安全检测
	config.security = {
		csrf: {
			enable: false,
			ignoreJSON: true, // 默认为 false，当设置为 true 时，将会放过所有 content-type 为 `application/json` 的请求
		}
	};

	// 跨域问题
	config.cors = {
		origin: '*',
		allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
	};

	return config;
};
