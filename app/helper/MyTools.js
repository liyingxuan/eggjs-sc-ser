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
	},

	/**
	 * 补齐0x + 64位长
	 *
	 * @param str
	 * @return {*}
	 */
	to66Length: function (str) {
		let tmpStr = '';
		if(str.length < 64) {
			for(let i = 0; i < (64 - str.length); i++) {
				tmpStr = '0' + tmpStr
			}
		}

		return '0x' + tmpStr + str
	}
};

module.exports = MyTools;
