// app.js
// 业务数据始终落在本地 wx 存储；云同步是可选能力，未配置或网络失败都不影响本地使用。
const store = require('./utils/store.js');
const cloudSync = require('./utils/cloudSync.js');

App({
  onLaunch() {
    // 启动时做一次数据读取，触达旧版本数据迁移/字段补全，异常时回退为空数据。
    try {
      store.listPlayers();
    } catch (err) {
      console.error('本地数据初始化失败', err);
    }

    // 已填写云开发环境 ID 时才初始化，未配置时静默跳过
    try {
      cloudSync.init();
    } catch (err) {
      console.error('云开发初始化失败', err);
    }
  }
});
