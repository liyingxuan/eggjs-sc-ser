/**
 * 一些小数据处理
 *
 * @type {{}}
 */

MyTools = {
	/**
	 * 保证ID是int型
	 *
	 * @param str
	 * @return {*}
	 */
	toInt: function (str) {
		if (typeof str === 'number') return str;
		if (!str) return str;
		return parseInt(str, 10) || 0;
	}
};

module.exports = MyTools;
