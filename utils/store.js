/**
 * 本地存储层（唯一数据源）
 * - 仅使用 wx.setStorageSync / wx.getStorageSync / wx.removeStorageSync
 * - 单 key 保存整局数据，任何增删改都立即落盘
 * - 不包含任何网络请求
 */
const { normalizePlayer } = require('./model.js');

const STORAGE_KEY = 'monopoly_game_v1';
const SCHEMA_VERSION = 1;

function emptyState() {
  return { version: SCHEMA_VERSION, players: [], updatedAt: Date.now() };
}

function readState() {
  let raw;
  try {
    raw = wx.getStorageSync(STORAGE_KEY);
  } catch (err) {
    console.error('读取本地存储失败', err);
    return emptyState();
  }
  if (!raw) return emptyState();

  // 兼容早期可能直接存数组的结构
  let rawPlayers = [];
  if (Array.isArray(raw)) {
    rawPlayers = raw;
  } else if (raw && Array.isArray(raw.players)) {
    rawPlayers = raw.players;
  } else {
    return emptyState();
  }

  const players = rawPlayers.map(normalizePlayer).filter(Boolean);
  return {
    version: (raw && raw.version) || SCHEMA_VERSION,
    players,
    updatedAt: (raw && raw.updatedAt) || Date.now()
  };
}

function writeState(state) {
  const payload = {
    version: SCHEMA_VERSION,
    players: state.players.map(normalizePlayer),
    updatedAt: Date.now()
  };
  try {
    wx.setStorageSync(STORAGE_KEY, payload);
    return true;
  } catch (err) {
    console.error('写入本地存储失败', err);
    return false;
  }
}

function listPlayers() {
  return readState().players;
}

function getPlayer(playerId) {
  return listPlayers().find((player) => player.id === playerId) || null;
}

// 新增或覆盖保存（页面修改后立即调用）
function savePlayer(player) {
  const state = readState();
  const normalized = normalizePlayer(Object.assign({}, player, { updatedAt: Date.now() }));
  const index = state.players.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.players[index] = normalized;
  } else {
    state.players.push(normalized);
  }
  const ok = writeState(state);
  return ok ? normalized : null;
}

function deletePlayer(playerId) {
  const state = readState();
  state.players = state.players.filter((player) => player.id !== playerId);
  return writeState(state);
}

// 统计：其他玩家中，有多少条负债指向 playerId
function countDebtsTo(playerId) {
  let count = 0;
  readState().players.forEach((player) => {
    if (player.id === playerId) return;
    player.debts.forEach((debt) => {
      if (debt.toType === 'player' && debt.toPlayerId === playerId) count += 1;
    });
  });
  return count;
}

// 删除玩家，并把其他玩家欠他的负债迁移为“欠管理员”；返回迁移条数
function removePlayerAndMigrate(playerId) {
  const state = readState();
  let migrated = 0;
  state.players.forEach((player) => {
    if (player.id === playerId) return;
    player.debts.forEach((debt) => {
      if (debt.toType === 'player' && debt.toPlayerId === playerId) {
        debt.toType = 'admin';
        debt.toPlayerId = '';
        migrated += 1;
      }
    });
  });
  state.players = state.players.filter((player) => player.id !== playerId);
  const ok = writeState(state);
  return ok ? migrated : null;
}

// 一键清空资产：保留昵称、头像
function clearPlayerAssets(playerId) {
  const player = getPlayer(playerId);
  if (!player) return false;
  player.assets = [];
  player.deposit = 0;
  player.debts = [];
  return !!savePlayer(player);
}

// 一键清空所有玩家：直接清空整局数据，无需迁移
function clearAllPlayers() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('清空本地存储失败', err);
    return false;
  }
}

module.exports = {
  STORAGE_KEY,
  listPlayers,
  getPlayer,
  savePlayer,
  deletePlayer,
  countDebtsTo,
  removePlayerAndMigrate,
  clearPlayerAssets,
  clearAllPlayers
};
