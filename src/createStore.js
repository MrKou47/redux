import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * 创建 Redux store，用于保持状态树。
 * The only way to change the data in the store is to call `dispatch()` on it.
 * 改变store中数据的唯一方法是调用在 store 上挂载的 `dispatch()` 方法。
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 * 你的应用必须只维护一个 store。如果需要指定store中不同的部分如何相应action，你可以使用 `combineReducers`方法将几个reducer组合为一个reducer
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 * 一个返回值为下一个状态树的函数，需要的参数为当前的状态树和要处理的action的函数
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 * 初始状态，可选参数。可用于在同构react中，将服务端初始化好的state同步到客户端；也可用于恢复之前已经序列化好user session。
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 * store的增强器，可选参数。你可以选择设置此参数为一些第三方的东西，如middleware，time travel，persistence来增加store。
 * 与redux一起提供的唯一增强器为 `applyMiddleware()`
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 * 返回一个 Redux store 实例。你可以通过此实例来读取state，派发actions，监听任何修改。
 */
export default function createStore(reducer, preloadedState, enhancer) {
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') { // 设置 preloadedState 为可选参数
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    /**
     * 如果有enhancer参数，则在 enhancer 中调用调用此方法后，使用middleware包装dispatch，最后返回的是
     * store对象，但是此store对象的 dispatch 方法是经过包装过的dispatch
     */
    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false // 控制器，用于检测当前是否有正在处理的action

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice() // 取消引用关联
    }
  }

  /**
   * Reads the state tree managed by the store.
   * 从store中获取状态树
   * @returns {any} The current state tree of your application.
   * 返回你应用的当前状态树
   */
  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   * 增加一个修改监听器。它会在任何 action 被 dispatch后调用；
   * 也会在状态树的任何部分更新时调用（潜在的）。
   * 然后，你可以在回调函数中使用getState()来获取当前的状态树
   * You may call `dispatch()` from a change listener, with the following
   * 你可能会从一些变化的监听器中调用 `dispatch()`，但需要注意以下几点
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   * 
   * 1. 每次dispatch调用前都， 订阅列表都会被快照。
   * 如果你在listners调用时同时调用subscribe或者unsubscribe方法，这对当前正在执行的 `dispatch()`没有任何影响。
   * 然而，下一个 `dispatch()` 调用时，无论是否嵌套，都会使用 订阅列表最近的快照
   * 
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   * 
   * 2. 监听器不能期望获得所有的改变的状态，因为在监听器被调用之前，嵌套的`dispatch()`可能会多次更新状态
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * 一个会被任何 dispatch 唤起的回调函数
   * @returns {Function} A function to remove this change listener.
   * 一个用于移除此监听器的函数
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
      )
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() { // 返回 unsubscribe 函数 用于从 nextListeners 移除此 listener
      if (!isSubscribed) {
        return
      }

      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
        )
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   * 派发一个action。这是改变state的唯一方式
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   * 用于创建store的 `reducer` 函数会被调用，参数为 当前状态树和给定的 `action`。
   * 它的返回值会视为状态树的下一个状态，同时 change listeners 将收到通知
   * 
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   * 
   * 最基础的实现只支持 dispatch 一个 普通对象。 如果你希望dispatch 一个 Promise, 一个Observable，一个thunk 或者其他的东西，
   * 你需要使用相符的中间件来包裹 你的 store 创建函数。
   * 举一个栗子， 请看 `redux-thunk` 包的文档。
   * 即使是中间件函数，它最终仍然会使用此方法来dispath一个普通的对象。
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   * 一个用来表示 “那些东西改变” 了的普通对象。一个最佳实践是
   * 序列化你的 actions ，这样你就可以记录或者重新实现用户的行为，或者使用 历史记录(time travelling) `redux-devtools`
   * 一个action必须拥有 `type` 属性，同时此属性不能为undefined
   * 一个最佳实践是使用字符串常量来表示你的 action type。
   * @returns {Object} For convenience, the same action object you dispatched.
   * 为了方便，会返回一个和你派发的对象一样的action object。
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   * 有一点需要注意的是, 如果你使用了一个自定义的 middleware，他可能封装了 `dispatch()` 来返回一些其他的东西
   * （例如一个你可以 await 的 Promise）
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   * 替换store当前使用的reducer 来计算state
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * 当你的应用实现了代码分割同时你希望动态引入reducer时，你可能需要此方法。
   * 当你实现了redux的热加载时你也可能会使用到此方法
   * 
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * 用于与 observable/reactive libraries进行通信
   * @returns {observable} A minimal observable of state changes.
   *  A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.

  // 当一个store被创建时，redux 将触发一个 type为 “INIT” 的action。这会让每一个reducer都返回它的初始状态，由此来渲染整个状态树
  // PS：我们在使用 redux-devtools 可以看到一开始调用了此方法
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
