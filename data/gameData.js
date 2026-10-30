/**
 * 静态游戏数据（只读常量，不写入本地存储）
 * 数据来源：需求文档第 5 章 + 4 张实物卡牌照片核对。
 * 已按要求修正：香港度假村观光费 = 4500，西安度假村观光费 = 8000。
 */

// 8 个同色系分组
const CITY_GROUPS = [
  { key: 'pink', name: '粉红', color: '#F7A8BC', soft: '#FDEBF0', tone: '#B4446A' },
  { key: 'blueviolet', name: '蓝紫', color: '#9AA0E8', soft: '#EFF0FD', tone: '#5257AD' },
  { key: 'blue', name: '蓝', color: '#79C3E8', soft: '#EAF7FD', tone: '#2C7FA6' },
  { key: 'gold', name: '金黄', color: '#F3C84B', soft: '#FEF6DB', tone: '#9A7211' },
  { key: 'lime', name: '黄绿', color: '#B5D96E', soft: '#F3F9E3', tone: '#5D7E1D' },
  { key: 'teal', name: '青蓝', color: '#3FA6A0', soft: '#E6F6F4', tone: '#266C68' },
  { key: 'purple', name: '紫', color: '#9673C4', soft: '#F3EDFA', tone: '#674797' },
  { key: 'red', name: '红', color: '#E4685D', soft: '#FDEDEB', tone: '#A83A31' }
];

/**
 * 22 座城市
 * tolls: [空地, 1间民宿, 2间民宿, 3间民宿, 度假村]
 * homestayCost: 每间民宿建造费；resortCost: 度假村建造费
 */
const CITIES = [
  {
    id: 'hongkong', name: '香港', group: 'pink',
    price: 600, mortgage: 360, redeem: 420,
    tolls: [20, 200, 600, 800, 4500], homestayCost: 500, resortCost: 500,
    intro: '维多利亚港的夜景与叮叮车，是这座不夜城最闪亮的财富名片。'
  },
  {
    id: 'macau', name: '澳门', group: 'pink',
    price: 600, mortgage: 360, redeem: 420,
    tolls: [20, 100, 300, 900, 2500], homestayCost: 500, resortCost: 500,
    intro: '葡式蛋挞与老城巷弄，小小半岛藏着大大的幸运。'
  },
  {
    id: 'shenzhen', name: '深圳', group: 'blueviolet',
    price: 1000, mortgage: 600, redeem: 700,
    tolls: [60, 300, 900, 2700, 5500], homestayCost: 500, resortCost: 500,
    intro: '从渔村到摩天楼，速度与梦想在这里一路狂飙。'
  },
  {
    id: 'guangzhou', name: '广州', group: 'blueviolet',
    price: 1000, mortgage: 600, redeem: 700,
    tolls: [60, 300, 900, 2700, 5500], homestayCost: 500, resortCost: 500,
    intro: '早茶香气飘满骑楼，千年商都的生意经代代相传。'
  },
  {
    id: 'sanya', name: '三亚', group: 'blueviolet',
    price: 1200, mortgage: 720, redeem: 840,
    tolls: [80, 400, 1000, 3000, 6000], homestayCost: 500, resortCost: 500,
    intro: '椰林海风与细软沙滩，随手一捡都是度假的金子。'
  },
  {
    id: 'kunming', name: '昆明', group: 'blue',
    price: 1400, mortgage: 840, redeem: 980,
    tolls: [100, 500, 1500, 4500, 7500], homestayCost: 1000, resortCost: 1000,
    intro: '四季如春的花都，鲜花与阳光从不缺席。'
  },
  {
    id: 'lhasa', name: '拉萨', group: 'blue',
    price: 1400, mortgage: 840, redeem: 980,
    tolls: [100, 500, 1500, 4500, 7500], homestayCost: 1000, resortCost: 1000,
    intro: '布达拉宫沐浴在高原阳光下，信仰与云朵一样纯净。'
  },
  {
    id: 'urumqi', name: '乌鲁木齐', group: 'blue',
    price: 1600, mortgage: 960, redeem: 1120,
    tolls: [120, 600, 1800, 5000, 9000], homestayCost: 1000, resortCost: 1000,
    intro: '天山脚下的瓜果之乡，热情得像正午的阳光。'
  },
  {
    id: 'chengdu', name: '成都', group: 'gold',
    price: 1800, mortgage: 1080, redeem: 1260,
    tolls: [140, 700, 2000, 5500, 9500], homestayCost: 1000, resortCost: 1000,
    intro: '盖碗茶、火锅与慢生活，巴适得板。'
  },
  {
    id: 'chongqing', name: '重庆', group: 'gold',
    price: 1800, mortgage: 1080, redeem: 1260,
    tolls: [140, 700, 2000, 5500, 9500], homestayCost: 1000, resortCost: 1000,
    intro: '轻轨穿楼、江雾绕山，8D 魔幻城市的财富迷宫。'
  },
  {
    id: 'xian', name: '西安', group: 'gold',
    price: 2000, mortgage: 1200, redeem: 1400,
    // 修正项：西安度假村观光费固定为 8000
    tolls: [160, 800, 2200, 6000, 8000], homestayCost: 1000, resortCost: 1000,
    intro: '城墙内外千年故事，一碗泡馍吃出盛世长安。'
  },
  {
    id: 'changsha', name: '长沙', group: 'lime',
    price: 2200, mortgage: 1320, redeem: 1540,
    tolls: [180, 900, 2500, 7000, 10500], homestayCost: 1500, resortCost: 1500,
    intro: '烟火气与茶颜香，越夜越热闹的快乐星球。'
  },
  {
    id: 'wuhan', name: '武汉', group: 'lime',
    price: 2200, mortgage: 1320, redeem: 1540,
    tolls: [180, 900, 2500, 7000, 10500], homestayCost: 1500, resortCost: 1500,
    intro: '长江与汉江在此相遇，过早的热干面唤醒整座城。'
  },
  {
    id: 'qingdao', name: '青岛', group: 'lime',
    price: 2400, mortgage: 1440, redeem: 1680,
    tolls: [200, 1000, 3000, 7500, 11000], homestayCost: 1500, resortCost: 1500,
    intro: '红瓦绿树、碧海蓝天，啤酒泡沫里冒着海风。'
  },
  {
    id: 'beijing', name: '北京', group: 'teal',
    price: 2600, mortgage: 1560, redeem: 1820,
    tolls: [220, 1100, 3300, 8000, 11500], homestayCost: 1500, resortCost: 1500,
    intro: '故宫与胡同串起古今，皇城根下气派十足。'
  },
  {
    id: 'tianjin', name: '天津', group: 'teal',
    price: 2600, mortgage: 1560, redeem: 1820,
    tolls: [220, 1100, 3300, 8000, 11500], homestayCost: 1500, resortCost: 1500,
    intro: '相声、煎饼果子与海河夜景，幽默是这座城的底色。'
  },
  {
    id: 'harbin', name: '哈尔滨', group: 'teal',
    price: 2800, mortgage: 1680, redeem: 1960,
    tolls: [240, 1200, 3600, 8500, 12000], homestayCost: 1500, resortCost: 1500,
    intro: '冰雪大世界与中央大街，冷得浪漫、热得痛快。'
  },
  {
    id: 'nanjing', name: '南京', group: 'purple',
    price: 3000, mortgage: 1800, redeem: 2100,
    tolls: [260, 1300, 3900, 9000, 12750], homestayCost: 2000, resortCost: 2000,
    intro: '六朝烟水与梧桐大道，历史在城墙上轻轻呼吸。'
  },
  {
    id: 'shanghai', name: '上海', group: 'purple',
    price: 3000, mortgage: 1800, redeem: 2100,
    tolls: [260, 1300, 3900, 9000, 12750], homestayCost: 2000, resortCost: 2000,
    intro: '外滩钟声与陆家嘴灯火，摩登与弄堂同框。'
  },
  {
    id: 'hangzhou', name: '杭州', group: 'purple',
    price: 3200, mortgage: 1920, redeem: 2240,
    tolls: [280, 1500, 4500, 10000, 14000], homestayCost: 2000, resortCost: 2000,
    intro: '西湖烟雨、龙井茶香，人间天堂名不虚传。'
  },
  {
    id: 'xiamen', name: '厦门', group: 'red',
    price: 3500, mortgage: 2100, redeem: 2450,
    tolls: [350, 1750, 5000, 11000, 15000], homestayCost: 2000, resortCost: 2000,
    intro: '鼓浪屿的琴声与海风，文艺得刚刚好。'
  },
  {
    id: 'taipei', name: '台北', group: 'red',
    price: 4000, mortgage: 2400, redeem: 2800,
    tolls: [500, 2500, 6000, 12000, 20000], homestayCost: 2000, resortCost: 2000,
    intro: '夜市小吃与 101 灯火，温柔又热闹的宝岛之心。'
  }
];

// 6 项公共建筑：仅可抵押，不可建造民宿/度假村
const BUILDINGS = [
  {
    id: 'satellite', name: '卫星发射中心', category: '航天工程',
    price: 1500, mortgage: 1200, redeem: 1400,
    color: '#9673C4', soft: '#F3EDFA', tone: '#674797',
    intro: '把卫星送向星海的航天基地，计费按掷出的点数结算。',
    ruleLines: ['拥有 1 处航天工程：观光费 = 掷出点数 × 40', '拥有 2 处航天工程：观光费 = 掷出点数 × 80']
  },
  {
    id: 'telescope', name: '射电望远镜', category: '航天工程',
    price: 1500, mortgage: 1200, redeem: 1400,
    color: '#5B8DEF', soft: '#EAF1FE', tone: '#335FB3',
    intro: '倾听宇宙心跳的大锅，与卫星发射中心同属航天工程。',
    ruleLines: ['拥有 1 处航天工程：观光费 = 掷出点数 × 40', '拥有 2 处航天工程：观光费 = 掷出点数 × 80']
  },
  {
    id: 'dam', name: '三峡大坝', category: '民生工程',
    price: 2000, mortgage: 1200, redeem: 1400,
    color: '#E8B93A', soft: '#FEF6DB', tone: '#8E6C0A',
    intro: '横跨长江的超级水利工程，观光费随民生工程数量递增。',
    ruleLines: ['观光费 250', '拥有 2 处民生工程：500', '拥有 3 处民生工程：1000', '拥有 4 处民生工程：2000']
  },
  {
    id: 'bridge', name: '港珠澳大桥', category: '民生工程',
    price: 2000, mortgage: 1200, redeem: 1400,
    color: '#E06A9B', soft: '#FCEBF3', tone: '#A33A65',
    intro: '连接三地的跨海长虹，民生工程观光费阶梯上涨。',
    ruleLines: ['观光费 250', '拥有 2 处民生工程：500', '拥有 3 处民生工程：1000', '拥有 4 处民生工程：2000']
  },
  {
    id: 'grid', name: '特高压输电网', category: '民生工程',
    price: 2000, mortgage: 1200, redeem: 1400,
    color: '#4FA3D9', soft: '#E9F5FC', tone: '#2C709F',
    intro: '把电流送往千里之外，民生工程计费与同组建筑叠加。',
    ruleLines: ['观光费 250', '拥有 2 处民生工程：500', '拥有 3 处民生工程：1000', '拥有 4 处民生工程：2000']
  },
  {
    id: 'nest', name: '鸟巢', category: '民生工程',
    price: 2000, mortgage: 1200, redeem: 1400,
    color: '#9BC24B', soft: '#F2F9E4', tone: '#5B7A1D',
    intro: '钢铁编织的体育馆，民生工程观光费与同组建筑累计。',
    ruleLines: ['观光费 250', '拥有 2 处民生工程：500', '拥有 3 处民生工程：1000', '拥有 4 处民生工程：2000']
  }
];

// 内置卡通头像库（emoji + 柔和底色），存库时格式为 emoji:🦊
const AVATARS = [
  { value: 'emoji:🦊', emoji: '🦊', bg: '#FFE2C4' },
  { value: 'emoji:🐼', emoji: '🐼', bg: '#E8F0F8' },
  { value: 'emoji:🐯', emoji: '🐯', bg: '#FFE7AE' },
  { value: 'emoji:🐸', emoji: '🐸', bg: '#DFF3D2' },
  { value: 'emoji:🐨', emoji: '🐨', bg: '#ECE6F8' },
  { value: 'emoji:🐵', emoji: '🐵', bg: '#FDE5D2' },
  { value: 'emoji:🐷', emoji: '🐷', bg: '#FFE1E8' },
  { value: 'emoji:🦁', emoji: '🦁', bg: '#FFEDBC' },
  { value: 'emoji:🐰', emoji: '🐰', bg: '#FCE6F0' },
  { value: 'emoji:🐻', emoji: '🐻', bg: '#F0E4D7' },
  { value: 'emoji:🐱', emoji: '🐱', bg: '#FFE4DB' },
  { value: 'emoji:🐶', emoji: '🐶', bg: '#F3E8D6' },
  { value: 'emoji:🐮', emoji: '🐮', bg: '#E5F2EC' },
  { value: 'emoji:🐹', emoji: '🐹', bg: '#FFF2CE' },
  { value: 'emoji:🦄', emoji: '🦄', bg: '#EDE0FB' },
  { value: 'emoji:🐙', emoji: '🐙', bg: '#FFE0EC' }
];

function getCityById(id) {
  return CITIES.find((city) => city.id === id) || null;
}

function getBuildingById(id) {
  return BUILDINGS.find((building) => building.id === id) || null;
}

function getGroupById(id) {
  return CITY_GROUPS.find((group) => group.key === id) || null;
}

function getCard(type, refId) {
  return type === 'building' ? getBuildingById(refId) : getCityById(refId);
}

module.exports = {
  CITY_GROUPS,
  CITIES,
  BUILDINGS,
  AVATARS,
  getCityById,
  getBuildingById,
  getGroupById,
  getCard
};
