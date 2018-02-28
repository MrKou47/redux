import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 * 创建一个store增强器，将中间件应用于 Redux store的dispatch 方法。这对于多样的task很方便，
 * 比如使用一种简单的方式来传递异步的action，或者打印出每一个action的payload。
 * See `redux-thunk` package as an example of the Redux middleware.
 * `redux-thunk` 是Redux middleware的一个栗子
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 * 因为middleware可能是异步的，所以这应该是store增强器链条中的第一个
 * 
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 * 需要注意的是，每一个middleware function都会包含 `dispatch` 和 `getState` 参数。
 * @param {...Function} middlewares The middleware chain to be applied.
 * 要应用的链式 middleware
 * @returns {Function} A store enhancer applying the middleware.
 * 返回一个 store 增强器
 */

/**
 * import { creatStore, applyMiddleware } from 'redux';
 * import thunk from 'redux-thunk';
 * const store = createStore(
 *  reducer,
 *  applyMiddleware(
 *    thunk
 *  )
 * );
 */
export default function applyMiddleware(...middlewares) {

  return createStore => (...args) => { // createStore.js - L45
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }
    let chain = [] // middleware chain

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    /**
     * 取得 middleware list， 然后取得每一个middleware 接收 getState(from store)和 dispatch 后的返回值
     */
    chain = middlewares.map(middleware => middleware(middlewareAPI))

    /**
     * 由此可看出 chain list 的 item 为 function，每个函数接收的参数为
     * 原生的 store.dispatch，最终返回的结果为装饰过的 dispatch 方法
     * 由此可以得知 middleware 的写法为
     * 
     * function someMiddleware(getState, dispatch) {
     *   return middleRes(dispatch) {
     *     return newDispatchFunc () {
     *      
     *     }
     *   }
     * }
     */
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
