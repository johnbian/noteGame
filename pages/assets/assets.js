const { CITY_GROUPS, CITIES, BUILDINGS, getCard } = require('../../data/gameData.js');
const model = require('../../utils/model.js');
const store = require('../../utils/store.js');

Page({
  data: {
    tab: 'city',
    keyword: '',
    cityGroups: [],
    buildings: [],
    selectedCount: 0,
    selectedValueText: '0',
    cityCount: CITIES.length,
    buildingCount: BUILDINGS.length
  },

  onLoad() {
    this.selected = [];
    this.ownerId = '';
    this.ownerMap = {};
    this.rebuildOwnerMap();
    this.rebuild();

    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (channel && channel.on) {
      channel.on('initAssets', (payload) => {
        const selected = payload && Array.isArray(payload.selected) ? payload.selected : [];
        this.ownerId = (payload && payload.ownerId) || '';
        // 保留资产原有的建筑/抵押状态
        this.selected = selected.map((asset) => Object.assign({}, asset));
        this.rebuildOwnerMap();
        this.rebuild();
      });
    }
  },

  // 记录“其他玩家”已占用的卡牌，这些卡不能再被当前玩家选择
  rebuildOwnerMap() {
    const map = {};
    store.listPlayers().forEach((player) => {
      if (player.id === this.ownerId) return;
      (player.assets || []).forEach((asset) => {
        const key = model.assetKey(asset);
        if (!map[key]) map[key] = [];
        map[key].push(player.nickname);
      });
    });
    this.ownerMap = map;
  },

  // 根据当前 Tab、搜索词、已选状态重建列表
  rebuild(keywordArg) {
    const keyword = (typeof keywordArg === 'string' ? keywordArg : this.data.keyword || '')
      .trim()
      .toLowerCase();
    const selectedMap = {};
    this.selected.forEach((asset) => {
      selectedMap[model.assetKey(asset)] = asset;
    });

    const match = (name) => !keyword || name.toLowerCase().indexOf(keyword) >= 0;

    const cityGroups = CITY_GROUPS.map((group) => {
      const cards = CITIES
        .filter((city) => city.group === group.key && match(city.name))
        .map((city) => this.buildCardView('city', city, selectedMap));
      return {
        key: group.key,
        name: group.name,
        color: group.color,
        soft: group.soft,
        cards
      };
    }).filter((group) => group.cards.length > 0);

    const buildings = BUILDINGS
      .filter((building) => match(building.name))
      .map((building) => this.buildCardView('building', building, selectedMap));

    let value = 0;
    this.selected.forEach((asset) => {
      const card = getCard(asset.type, asset.refId);
      if (card) value += card.price;
    });

    this.setData({
      cityGroups,
      buildings,
      selectedCount: this.selected.length,
      selectedValueText: model.formatMoney(value)
    });
  },

  buildCardView(type, card, selectedMap) {
    const key = `${type}:${card.id}`;
    const asset = selectedMap[key];
    const owners = this.ownerMap[key] || [];
    // 已属于其他玩家的卡牌不可再选；如果本玩家早就持有（历史数据），仍按已选展示以便取消
    const isLocked = owners.length > 0 && !asset;
    let levelLabel = '';
    if (asset) {
      levelLabel = model.getLevelInfo(asset).label;
    } else if (type === 'building') {
      levelLabel = card.category;
    }
    return {
      key,
      type,
      refId: card.id,
      name: card.name,
      price: card.price,
      priceText: model.formatMoney(card.price),
      color: card.color,
      soft: card.soft,
      tone: card.tone || '#3e3554',
      isSelected: !!asset,
      isLocked,
      ownerText: owners.slice(0, 2).join('、') + (owners.length > 2 ? ' 等' : ''),
      levelLabel
    };
  },

  onSwitchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    this.rebuild(keyword);
  },

  onClearSearch() {
    this.setData({ keyword: '' });
    this.rebuild('');
  },

  onToggleSelect(e) {
    const key = e.currentTarget.dataset.key;
    const type = e.currentTarget.dataset.type;
    const refId = e.currentTarget.dataset.refid;
    const index = this.selected.findIndex((asset) => model.assetKey(asset) === key);
    if (index >= 0) {
      this.selected.splice(index, 1);
      this.rebuild();
      return;
    }
    const owners = this.ownerMap[key];
    if (owners && owners.length) {
      wx.showToast({ title: `已被${owners[0]}占用`, icon: 'none' });
      return;
    }
    this.selected.push(model.createAsset(type, refId));
    this.rebuild();
  },

  onConfirm() {
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (channel && channel.emit) {
      channel.emit('assetsSelected', { assets: this.selected });
    }
    wx.navigateBack({ delta: 1 });
  }
});
