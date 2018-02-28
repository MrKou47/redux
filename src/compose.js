/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 * 将单参数的function从右向左结合。
 * 最右边的函数可以接受多个参数，因为它提供了生成的复合函数的签名。
 * @param {...Function} funcs The functions to compose.
 * 要进行组合的 functions
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

// Example：
// function composeFunc1(arg1) {
//   console.log(`composeFunc1 console: ${arg1}`);
//   return `composeFunc1: ${arg1}`;
// }
// function composeFunc2(arg2) {
//   console.log(`composeFunc2 console: ${arg2}`);
//   return `composeFunc2: ${arg2}`;
// }
// function composeFunc3(arg3) {
//   console.log(`composeFunc3 console: ${arg3}`);
//   return `composeFunc3: ${arg3}`;
// }

// var composedFunc = compose(composeFunc1, composeFunc2, composeFunc3);

// /**
//  * 参数为最右侧函数调用时的参数
//  * composeFunc3 console: 1
//  * composeFunc2 console: composeFunc3: 1
//  * composeFunc1 console: composeFunc2: composeFunc3: 1
//  * 
//  * @returns {String} composeFunc1: composeFunc2: composeFunc3: 1
//  * 返回值为最左侧函数的返回值
//  */
// composedFunc(1);