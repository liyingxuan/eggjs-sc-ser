'use strict';

module.exports = appInfo => {
	const config = {};

	// should change to your own
	config.keys = appInfo.name + '_1490750627161_5967';

	config.middleware = ['errorHandler'];

	// 禁用了CSRF安全检测
	config.security = {
		csrf: {
			enable: false
		}
	};

	// 跨域问题
	config.cors = {
		origin: '*',
		allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
	};

	return config;
};
