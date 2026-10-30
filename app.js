// app.js
// 本项目为纯本地记录工具：不包含任何网络请求，所有业务数据均落在 wx 本地存储。
const store = require('./utils/store.js');

App({
  onLaunch() {
    // 启动时做一次数据读取，触达旧版本数据迁移/字段补全，异常时回退为空数据。
    try {
      store.listPlayers();
    } catch (err) {
      console.error('本地数据初始化失败', err);
    }
  }
});
