# <a href='http://redux.js.org'><img src='https://camo.githubusercontent.com/f28b5bc7822f1b7bb28a96d8d09e7d79169248fc/687474703a2f2f692e696d6775722e636f6d2f4a65567164514d2e706e67' height='60' alt='Redux Logo' aria-label='Redux.js.org' /></a>

### Redux 源码阅读 (v4.0.0-beta.2)

通过阅读 redux源码，来更清晰的认识 redux middleware，subscribe 与 react-redux。


- [x] [createStore](./src/createStore.js) done
- [x] [applyMiddleware](./src/applyMiddleware.js) done
- [x] [combineReducers](./src/combineReducers.js) done
- [x] [bindActionCreators](./src/bindActionCreators.js) done

### 感想

  前一阵子通过 [learnrx](http://reactivex.io/learnrx) 学习了一下 function programming，现在再看redux，感觉redux真是短小而精悍，没有什么深奥的东西，只是使用函数式编程的思想，对 function 进行一系列操作，进而实现了对应用状态的统一管理。很厉害。

  为什么redux能这么火呢？一方面是react的推崇，一方面也是代码质量过硬。 redux在 [npms](https://npms.io/search?q=redux) 上的得分高达92，从代码中看，对于异常case的处理也非常严谨，可以说是滴水不漏，已经尽量对可以预见的error做了正确的处理，同时测试的coverage也非常高。火起来也是正常的。
