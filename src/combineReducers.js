import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

/**
 * reducer中针对某个action返回了undefined的错误信息
 * @param {*} key 
 * @param {*} action 
 * 
 * @returns {String} ❌错误信息
 */ 
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}
/**
 * 返回的state为非期望结构的state时的警告
 * @param {*} inputState 
 * @param {*} reducers 
 * @param {*} action 
 * @param {*} unexpectedKeyCache 
 * 
 * @returns {String} ⚠️警告信息
 */
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

/**
 * 检测reducers是否符合要求
 * @param {object} reducers 
 * 
 */
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    const initialState = reducer(undefined, { type: ActionTypes.INIT }) // state, action

    // reducer 的返回值不能为 undefined
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }

    // 检测 reducer是否能正确相应未catch的action
    const type =
      '@@redux/PROBE_UNKNOWN_ACTION_' +
      Math.random()
        .toString(36)
        .substring(7)
        .split('')
        .join('.')
    if (typeof reducer(undefined, { type }) === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            ActionTypes.INIT
          } or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 * 将一个对象中值为不同的 reducer 函数转换为单个reducer 函数。它将调用每一个子reducer，并将他们的结果收集到
 * 一个单个的state对象中， 这个对象的key对应着 reducer functions中的key。
 * 
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 * 一个对象，它的value对应着需要合并为一个reducer function的reducer functions对应。
 * 获得它的一个简单的方法是 使用 ES6 提供的 `import * as reducers` 语法。
 * 这些reducer function对任何action都不应该返回undefined。与之相反，如果传递给 reducer 函数的state是undefined的，
 * 则它应该返回它的初始状态(initial state)。并且返回任何未识别的 action 的当前状态。
 * 
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 * 一个reducer function，调用每一个reducer function，将他们的结果整合为一个具有相同形状的state。
 */
export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers) // [home, profile, cart]
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      // 开发环境 如果 某一个reducer为undefined 则警告
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  const finalReducerKeys = Object.keys(finalReducers) // 筛选出正确的reducer的key [home, profile, cart]

  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  // 此时finalReducers 只是filter 了value为undefined的key
  let shapeAssertionError
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }
  // 返回一个新的 reducer函数
  return function combination(state = {}, action) {
    // 如果之前test 传入的reducers时有异常，则抛出异常
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') { // 如果是开发环境，则部署警告函数（超级瞄准已部署！）
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalReducerKeys.length; i++) { // [home, profile, cart]
      // The following text is first loop comment.
      const key = finalReducerKeys[i] // home
      const reducer = finalReducers[key] // homeReducer
      const previousStateForKey = state[key] // undefined
      const nextStateForKey = reducer(previousStateForKey, action) // homeInitialState
      if (typeof nextStateForKey === 'undefined') { // 如果某个reducer返回 undefined 报错
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey // 增加了 homeInitialState，对应为 nextState: { home: homeInitialState }
      hasChanged /** true */ = hasChanged /** false */ || nextStateForKey !== previousStateForKey /** true */
    }
    return hasChanged ? nextState : state
  }
}

/**
 * Example:
 * 
 * import { combineReducers } from 'redux';
 * import { homeReducer, profileReducer, cartReducer } from 'customer-reducer-src';
 * const rootReducer = combineReducers({
 *   home: homeReducer,
 *   profile: profileReducer,
 *   cart: cartReducer,
 * });
 */
