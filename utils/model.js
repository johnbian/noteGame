/**
 * 数据模型与业务计算
 * 只处理纯数据，不直接读写 Storage；页面通过 utils/store.js 落盘。
 */
const { AVATARS, CITIES, CITY_GROUPS, getCard, getGroupById } = require('../data/gameData.js');

const MAX_PLAYERS = 8;
const MAX_NICKNAME_LENGTH = 10;
const MAX_AMOUNT = 99999999;
const MAX_FUNCTION_CARDS = 12;
const MAX_FUNCTION_CARD_LENGTH = 100;

let idSeed = 0;

function createId(prefix) {
  idSeed = (idSeed + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}_${idSeed}_${Math.random().toString(36).slice(2, 6)}`;
}

function roundMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

// 千位分隔展示：12750 -> 12,750
function formatMoney(value) {
  const num = roundMoney(value);
  const negative = num < 0;
  const abs = Math.abs(num);
  const fixed = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  const parts = fixed.split('.');
  const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${integer}${parts[1] ? `.${parts[1]}` : ''}`;
}

// 金额输入校验：非负、最多两位小数、上限 99,999,999
function parseAmount(raw) {
  const text = String(raw === undefined || raw === null ? '' : raw).trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(text)) {
    return { ok: false, value: 0 };
  }
  const value = roundMoney(Number(text));
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) {
    return { ok: false, value: 0 };
  }
  return { ok: true, value };
}

function validateNickname(raw) {
  const value = String(raw === undefined || raw === null ? '' : raw).trim();
  if (!value) return { ok: false, value: '', message: '请输入昵称' };
  if (Array.from(value).length > MAX_NICKNAME_LENGTH) {
    return { ok: false, value, message: `昵称最多 ${MAX_NICKNAME_LENGTH} 个字` };
  }
  return { ok: true, value, message: '' };
}

// 头像：内置 emoji 存为 emoji:🦊，微信头像存为 image:<本地文件路径>
function resolveAvatar(avatar) {
  const raw = typeof avatar === 'string' ? avatar : '';
  if (raw.indexOf('image:') === 0) {
    return { kind: 'image', src: raw.slice(6), value: '', bg: '#F3EDFA' };
  }
  let emoji = raw;
  if (emoji.indexOf('emoji:') === 0) emoji = emoji.slice(6);
  const meta = AVATARS.find((item) => item.emoji === emoji);
  return {
    kind: 'emoji',
    src: '',
    value: emoji || AVATARS[0].emoji,
    bg: meta ? meta.bg : AVATARS[0].bg
  };
}

function createAsset(type, refId) {
  return {
    id: createId('asset'),
    type: type === 'building' ? 'building' : 'city',
    refId,
    homestayCount: 0,
    resort: false,
    mortgaged: false
  };
}

function normalizeAsset(raw) {
  if (!raw) return null;
  const type = raw.type === 'building' ? 'building' : 'city';
  const card = getCard(type, raw.refId);
  if (!card) return null;
  const resort = type === 'city' ? !!raw.resort : false;
  const count = Math.max(0, Math.min(3, Number(raw.homestayCount) || 0));
  return {
    id: raw.id || createId('asset'),
    type,
    refId: raw.refId,
    homestayCount: resort ? 0 : count,
    resort,
    mortgaged: !!raw.mortgaged
  };
}

function normalizeDebt(raw) {
  if (!raw) return null;
  const amount = roundMoney(raw.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const toType = raw.toType === 'player' && raw.toPlayerId ? 'player' : 'admin';
  return {
    id: raw.id || createId('debt'),
    amount,
    toType,
    toPlayerId: toType === 'player' ? raw.toPlayerId : ''
  };
}

// 功能卡：每张只有一段手写描述，空描述直接丢弃
function normalizeFunctionCards(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const source = typeof item === 'string' ? { text: item } : item || {};
      const text = String(source.text === undefined || source.text === null ? '' : source.text)
        .trim()
        .slice(0, MAX_FUNCTION_CARD_LENGTH);
      if (!text) return null;
      return { id: source.id || createId('func'), text };
    })
    .filter(Boolean)
    .slice(0, MAX_FUNCTION_CARDS);
}

function normalizePlayer(raw) {
  const source = raw || {};
  const assets = Array.isArray(source.assets)
    ? source.assets.map(normalizeAsset).filter(Boolean)
    : [];
  const debts = Array.isArray(source.debts)
    ? source.debts.map(normalizeDebt).filter(Boolean)
    : [];
  return {
    id: source.id || createId('player'),
    nickname: String(source.nickname || '未命名玩家'),
    avatar: typeof source.avatar === 'string' && source.avatar ? source.avatar : AVATARS[0].value,
    assets,
    functionCards: normalizeFunctionCards(source.functionCards),
    deposit: Math.max(0, roundMoney(source.deposit || 0)),
    debts,
    createdAt: source.createdAt || Date.now(),
    updatedAt: source.updatedAt || Date.now()
  };
}

function createPlayer(data) {
  const source = data || {};
  return normalizePlayer({
    id: createId('player'),
    nickname: source.nickname,
    avatar: source.avatar,
    assets: source.assets || [],
    functionCards: source.functionCards || [],
    deposit: source.deposit || 0,
    debts: source.debts || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

function assetKey(asset) {
  return `${asset.type}:${asset.refId}`;
}

// 重新选择资产时：同一张卡保留原有建筑/抵押状态，未选中的卡会被移除
function mergeAssets(existing, incoming) {
  const existingMap = {};
  (existing || []).forEach((asset) => {
    existingMap[assetKey(asset)] = asset;
  });
  const result = [];
  const used = {};
  (incoming || []).forEach((asset) => {
    const key = assetKey(asset);
    if (used[key]) return;
    used[key] = true;
    result.push(existingMap[key] ? Object.assign({}, existingMap[key]) : createAsset(asset.type, asset.refId));
  });
  return result;
}

function getLevelInfo(asset) {
  const card = getCard(asset.type, asset.refId);
  if (!card) return { index: 0, label: '未知卡牌', toll: 0 };
  if (asset.type === 'building') {
    return { index: 0, label: card.category, toll: null };
  }
  if (asset.resort) {
    return { index: 4, label: '度假村', toll: card.tolls[4] };
  }
  const count = Math.max(0, Math.min(3, Number(asset.homestayCount) || 0));
  return {
    index: count,
    label: count === 0 ? '空地' : `${count} 间民宿`,
    toll: card.tolls[count]
  };
}

// 详情页/编辑页展示用的资产视图模型
function buildAssetView(asset) {
  const card = getCard(asset.type, asset.refId);
  if (!card) return null;
  const isCity = asset.type === 'city';
  const group = isCity ? getGroupById(card.group) : null;
  const level = getLevelInfo(asset);
  return Object.assign({}, asset, {
    key: assetKey(asset),
    isCity,
    name: card.name,
    price: card.price,
    priceText: formatMoney(card.price),
    mortgageText: formatMoney(card.mortgage),
    redeemText: formatMoney(card.redeem),
    intro: card.intro,
    // 城市本身不带颜色字段，必须从所属同色系取色，否则所有城市会回退成同一个颜色
    color: isCity ? (group ? group.color : '#B9B0A6') : card.color,
    soft: isCity ? (group ? group.soft : '#F4EFE8') : card.soft,
    tone: (isCity ? (group ? group.tone : '') : card.tone) || '#3e3554',
    groupKey: group ? group.key : 'building',
    groupOrder: group ? CITY_GROUPS.findIndex((item) => item.key === group.key) : 99,
    cardOrder: isCity ? CITIES.findIndex((city) => city.id === card.id) : 0,
    groupName: group ? group.name : card.category,
    groupLabel: group ? `${group.name} · 同色系` : card.category,
    category: card.category || '',
    levelIndex: level.index,
    levelLabel: level.label,
    currentTollText: level.toll === null ? '按规则' : formatMoney(level.toll),
    tollsText: isCity ? card.tolls.map(formatMoney) : [],
    homestayCostText: isCity ? formatMoney(card.homestayCost) : '',
    resortCostText: isCity ? formatMoney(card.resortCost) : '',
    ruleLines: card.ruleLines || []
  });
}

// 详情页/编辑页展示顺序：同色系城市排在一起，公共建筑放最后
function sortAssetViews(views) {
  return (views || []).slice().sort((a, b) => {
    if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
    return a.cardOrder - b.cardOrder;
  });
}

function calcPlayerTotals(player) {
  const assets = player.assets || [];
  let assetValue = 0;
  assets.forEach((asset) => {
    const card = getCard(asset.type, asset.refId);
    if (card) assetValue += card.price;
  });
  const deposit = Math.max(0, roundMoney(player.deposit));
  let debtTotal = 0;
  (player.debts || []).forEach((debt) => {
    debtTotal += roundMoney(debt.amount);
  });
  debtTotal = roundMoney(debtTotal);
  assetValue = roundMoney(assetValue);
  const net = roundMoney(assetValue + deposit - debtTotal);
  return {
    assetCount: assets.length,
    assetValue,
    deposit,
    debtTotal,
    net,
    netNegative: net < 0,
    assetValueText: formatMoney(assetValue),
    depositText: formatMoney(deposit),
    debtTotalText: formatMoney(debtTotal),
    netText: formatMoney(net),
    netDisplay: `${net < 0 ? '-¥' : '¥'}${formatMoney(Math.abs(net))}`
  };
}

function getCreditorName(debt, players) {
  if (debt.toType !== 'player') return '管理员';
  const target = (players || []).find((player) => player.id === debt.toPlayerId);
  return target ? target.nickname : '管理员';
}

// 首页玩家卡片：按同色系分组展示城市，并带出民宿/度假村状态
function buildCityGroups(assets) {
  const ownedMap = {};
  (assets || []).forEach((asset) => {
    if (asset.type === 'city') ownedMap[asset.refId] = asset;
  });

  return CITY_GROUPS.map((group) => {
    const cities = CITIES
      .filter((city) => city.group === group.key && ownedMap[city.id])
      .map((city) => {
        const asset = ownedMap[city.id];
        const level = getLevelInfo(asset);
        const homestayCount = asset.resort ? 0 : asset.homestayCount || 0;
        return {
          key: asset.id,
          name: city.name,
          levelLabel: level.label,
          levelShort: asset.resort ? '度假村' : homestayCount > 0 ? `${homestayCount}民宿` : '空地',
          isResort: !!asset.resort,
          homestayCount
        };
      });
    return {
      key: group.key,
      name: group.name,
      color: group.color,
      soft: group.soft,
      tone: group.tone,
      cities
    };
  }).filter((group) => group.cities.length > 0);
}

function buildDebtViews(player, players) {
  return (player.debts || []).map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    amountText: formatMoney(debt.amount),
    creditorName: getCreditorName(debt, players),
    isAdmin: debt.toType !== 'player'
  }));
}

module.exports = {
  MAX_PLAYERS,
  MAX_NICKNAME_LENGTH,
  MAX_AMOUNT,
  MAX_FUNCTION_CARDS,
  MAX_FUNCTION_CARD_LENGTH,
  createId,
  roundMoney,
  formatMoney,
  parseAmount,
  validateNickname,
  resolveAvatar,
  createAsset,
  normalizeAsset,
  normalizeDebt,
  normalizeFunctionCards,
  normalizePlayer,
  createPlayer,
  assetKey,
  mergeAssets,
  getLevelInfo,
  buildAssetView,
  sortAssetViews,
  calcPlayerTotals,
  buildCityGroups,
  getCreditorName,
  buildDebtViews
};
