'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
	  const { INTEGER, DATE, STRING, TEXT } = Sequelize;

	  return queryInterface.createTable('smart-contracts', {
		  id: { type: INTEGER, primaryKey: true, autoIncrement: true },
		  address: STRING(42),
      blockNum: INTEGER, // 获得的实时块高
		  usedNum: STRING(64), // 增加了64的实际使用的未来块高数据
		  random: STRING(66),
		  commit: STRING(66),
      sign: TEXT,
		  value: STRING(64), // event获得的游戏下注额度
		  mask: STRING(64), // event获得的游戏类型
		  modulo: STRING(64), // event获得的用户下注数据
		  blockNumber: STRING(64), // event获得的块高
		  settleBetRet: TEXT, // settleBet的返回数据
		  txHash: STRING(66), // Transaction Hash
		  paymentRet: TEXT, // event Payment返回的returnValues
      status: STRING(64), // starting：开始游戏； sent：已发送settleBet； completed：已完成。
		  created_at: DATE,
		  updated_at: DATE,
	  });
  },

  down: (queryInterface, Sequelize) => {
	  return queryInterface.dropTable('smart-contracts');
  }
};
