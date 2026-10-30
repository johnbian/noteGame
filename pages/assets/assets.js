const { CITY_GROUPS, CITIES, BUILDINGS, getCard } = require('../../data/gameData.js');
const model = require('../../utils/model.js');

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
    this.rebuild();

    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (channel && channel.on) {
      channel.on('initAssets', (payload) => {
        const selected = payload && Array.isArray(payload.selected) ? payload.selected : [];
        // 保留资产原有的建筑/抵押状态
        this.selected = selected.map((asset) => Object.assign({}, asset));
        this.rebuild();
      });
    }
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
    } else {
      this.selected.push(model.createAsset(type, refId));
    }
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
