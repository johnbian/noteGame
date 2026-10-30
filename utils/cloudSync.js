/**
 * 云同步客户端
 * - 本机存储始终是唯一事实来源，上传/同步失败只返回错误，不影响本地数据
 * - 两个云函数：uploadRecord（整体覆盖云端）、syncRecord（读取云端唯一记录）
 * - 所有异常都收敛为 { ok:false, error }，页面只负责提示
 */
const cloudConfig = require('./cloudConfig.js');

const META_KEY = 'monopoly_sync_v1';
const CALL_TIMEOUT = 10000;

let initialized = false;

function isConfigured() {
  return !!(cloudConfig.ENV_ID && String(cloudConfig.ENV_ID).trim());
}

function init() {
  if (!isConfigured()) return false;
  if (initialized) return true;
  if (!wx.cloud) return false;
  try {
    wx.cloud.init({ env: cloudConfig.ENV_ID.trim(), traceUser: true });
    initialized = true;
    return true;
  } catch (err) {
    console.error('云开发初始化失败', err);
    return false;
  }
}

function getMeta() {
  try {
    return wx.getStorageSync(META_KEY) || {};
  } catch (err) {
    return {};
  }
}

function setMeta(patch) {
  const meta = Object.assign({}, getMeta(), patch);
  try {
    wx.setStorageSync(META_KEY, meta);
  } catch (err) {
    console.error('保存同步状态失败', err);
  }
  return meta;
}

// 云函数调用：10 秒超时 + 永不抛错，保证页面逻辑简单
function callFunction(name, data) {
  return new Promise((resolve) => {
    if (!init()) {
      resolve({ ok: false, error: 'NOT_CONFIGURED' });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: 'TIMEOUT' });
    }, CALL_TIMEOUT);

    wx.cloud.callFunction({
      name,
      data: data || {},
      success: (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve((res && res.result) || { ok: false, error: 'EMPTY_RESULT' });
      },
      fail: (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.error(`云函数 ${name} 调用失败`, err);
        resolve({ ok: false, error: 'NETWORK', message: err && err.errMsg });
      }
    });
  });
}

function uploadPlayers(players) {
  return callFunction('uploadRecord', { players: players || [] }).then((res) => {
    if (res && res.ok) {
      setMeta({ lastUploadAt: Date.now(), remoteUpdatedAt: res.updatedAt || 0 });
    }
    return res;
  });
}

function fetchPlayers() {
  return callFunction('syncRecord', {}).then((res) => {
    if (res && res.ok) {
      setMeta({ lastSyncAt: Date.now(), remoteUpdatedAt: res.updatedAt || 0 });
    }
    return res;
  });
}

// 把错误码翻译成用户能看懂的提示
function describeError(res) {
  const error = res && res.error;
  if (error === 'NOT_CONFIGURED') return '请先配置云开发环境 ID';
  if (error === 'NETWORK') return '网络不可用，本地记录未受影响';
  if (error === 'TIMEOUT') return '请求超时，稍后再试';
  if (error === 'PAYLOAD_TOO_LARGE') return '数据过大，请精简头像后再试';
  if (error === 'INVALID_PLAYERS') return '本机数据异常，请检查后重试';
  if (res && res.hint) return res.hint;
  return '云端暂时不可用，请稍后再试';
}

module.exports = {
  isConfigured,
  init,
  getMeta,
  setMeta,
  uploadPlayers,
  fetchPlayers,
  describeError
};
