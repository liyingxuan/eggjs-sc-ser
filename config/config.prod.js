exports.mysql = {
	app: true, // 是否加载到 app 上，默认开启
	agent: false, // 是否加载到 agent 上，默认关闭
};

// Egg.js中的ORM框架
exports.sequelize = {
	dialect: 'mysql',
	host: '127.0.0.1',
	port: 3306,
	database: 'node-js',
	password: 'password'
};
