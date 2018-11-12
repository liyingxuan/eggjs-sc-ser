'use strict';

exports.validate = {
  enable: true,
  package: 'egg-validate',
};

exports.mysql = {
	enable: true,
	package: 'egg-mysql',
};

// Egg.js中的ORM框架
exports.sequelize = {
	enable: true,
	package: 'egg-sequelize',
};

// 解决跨域
exports.cors = {
	enable: true,
	package: 'egg-cors',
};
