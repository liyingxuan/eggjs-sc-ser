/**
 * 一些处理数值的扩展函数
 *
 * @type {{}}
 */

MathExtend = {
	/**
	 * 获取指定位长的随机字符串。
	 *
	 * @param length
	 * @return {string}
	 */
	getRandomStr: function (length) {
		let str = '';

		// 十六进制
		let arr = [
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'A', 'B', 'C', 'D', 'E', 'F'
		];

		// let arr = [
		// 	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		// 	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		// 	'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		// 	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		// 	'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
		// ];

		for (let i = 0; i < length; i++) {
			let pos = Math.round(Math.random() * (arr.length - 1));
			str += arr[pos];
		}

		return '0x' + str;
	}
};

module.exports = MathExtend;
