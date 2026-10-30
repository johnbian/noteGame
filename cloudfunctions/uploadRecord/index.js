/**
 * 上传记录：用本机玩家数据整体覆盖云端唯一记录。
 * 云端只有一份记录（sync_records/main），后上传的覆盖先前的。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const RECORD_ID = 'main';
const MAX_PLAYERS = 8;
const MAX_BYTES = 256 * 1024;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// 功能卡：只保留 id + 描述，限制张数与文本长度
function sanitizeFunctionCards(input) {
  if (!Array.isArray(input)) return [];
  const cards = [];
  for (let i = 0; i < input.length && cards.length < 12; i += 1) {
    const raw = input[i];
    if (!isObject(raw) || typeof raw.text !== 'string') continue;
    const text = raw.text.trim().slice(0, 100);
    if (!text) continue;
    cards.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : `func_${cards.length}`,
      text
    });
  }
  return cards;
}

// 只保留白名单字段，避免任意 JSON 把云端记录撑大或污染结构
function sanitizePlayers(input) {
  if (!Array.isArray(input) || input.length > MAX_PLAYERS) return null;

  const players = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    if (!isObject(raw) || typeof raw.id !== 'string' || !raw.id) return null;

    const deposit = Number(raw.deposit);
    players.push({
      id: raw.id.slice(0, 64),
      nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 20) : '未命名玩家',
      avatar: typeof raw.avatar === 'string' ? raw.avatar.slice(0, 1000) : 'emoji:🎩',
      deposit: Number.isFinite(deposit) ? Math.max(0, Math.round(deposit * 100) / 100) : 0,
      assets: Array.isArray(raw.assets) ? raw.assets.slice(0, 30) : [],
      functionCards: sanitizeFunctionCards(raw.functionCards),
      debts: Array.isArray(raw.debts) ? raw.debts.slice(0, 30) : [],
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now()
    });
  }
  return players;
}

exports.main = async (event) => {
  const players = sanitizePlayers(event && event.players);
  if (!players) {
    return { ok: false, error: 'INVALID_PLAYERS' };
  }

  const bytes = Buffer.byteLength(JSON.stringify(players), 'utf8');
  if (bytes > MAX_BYTES) {
    return { ok: false, error: 'PAYLOAD_TOO_LARGE' };
  }

  const now = Date.now();
  try {
    await db.collection('sync_records').doc(RECORD_ID).set({
      data: {
        schemaVersion: 1,
        players,
        updatedAt: now,
        savedAt: now
      }
    });
    return { ok: true, count: players.length, updatedAt: now, savedAt: now };
  } catch (err) {
    console.error('uploadRecord failed', err);
    const message = (err && (err.errMsg || err.message)) || 'unknown error';
    return {
      ok: false,
      error: 'UPLOAD_FAILED',
      message,
      hint: /collection|not exist/i.test(message) ? '请先在云开发控制台创建 sync_records 集合' : ''
    };
  }
};
