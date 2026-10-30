/**
 * 同步记录：返回云端唯一的那份玩家记录。
 * 云端没有记录时返回 exists:false，由小程序决定如何提示。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const RECORD_ID = 'main';

function isNotFound(err) {
  const code = err && (err.errCode || err.code);
  const message = (err && (err.errMsg || err.message)) || '';
  return code === -1 || code === -502005 || /not exist|not found|does not exist/i.test(message);
}

exports.main = async () => {
  try {
    const res = await db.collection('sync_records').doc(RECORD_ID).get();
    const data = res && res.data;
    if (!data) return { ok: true, exists: false };

    return {
      ok: true,
      exists: true,
      players: Array.isArray(data.players) ? data.players : [],
      updatedAt: Number(data.updatedAt) || 0,
      savedAt: Number(data.savedAt) || 0
    };
  } catch (err) {
    if (isNotFound(err)) return { ok: true, exists: false };
    console.error('syncRecord failed', err);
    return {
      ok: false,
      error: 'SYNC_FAILED',
      message: (err && (err.errMsg || err.message)) || 'unknown error'
    };
  }
};
