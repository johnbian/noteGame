const store = require('../../utils/store.js');
const model = require('../../utils/model.js');

Page({
  data: {
    playerId: '',
    player: null,
    avatar: {},
    stats: {},
    assetViews: [],
    debtsView: [],
    editingId: '',
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    modalConfirmText: '确认',
    modalCancelText: '取消',
    modalShowCancel: true,
    modalDanger: false,
    modalIcon: '🐣',
    modalAction: '',
    pendingAssetId: ''
  },

  onLoad(options) {
    this.setData({ playerId: options.playerId || '' });
  },

  onShow() {
    this.loadPlayer();
  },

  // 平板旋转 / 分屏后画布尺寸变化，需要重绘以保证清晰度
  onResize() {
    this.drawChart();
  },

  // 每次操作后都从本地存储重新读取，保证视图与落盘数据一致
  loadPlayer() {
    const playerId = this.data.playerId;
    const player = store.getPlayer(playerId);
    if (!player) {
      wx.showToast({ title: '玩家不存在或已被删除', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
      return;
    }

    this.player = player;
    const allPlayers = store.listPlayers();
    const stats = model.calcPlayerTotals(player);
    const assetViews = model.sortAssetViews(
      player.assets.map((asset) => model.buildAssetView(asset)).filter(Boolean)
    );
    const debtsView = model.buildDebtViews(player, allPlayers);

    let editingId = this.data.editingId;
    const editingAsset = assetViews.find((asset) => asset.id === editingId);
    if (!editingAsset || editingAsset.mortgaged) editingId = '';

    this.setData(
      {
        player: {
          id: player.id,
          nickname: player.nickname,
          avatar: player.avatar
        },
        avatar: model.resolveAvatar(player.avatar),
        stats,
        assetViews,
        debtsView,
        editingId
      },
      () => this.drawChart()
    );
  },

  /* ---------- 环形资产图（Canvas 2D 自绘） ---------- */
  drawChart() {
    const stats = this.data.stats || {};
    const fixed = Math.max(0, stats.assetValue || 0);
    const deposit = Math.max(0, stats.deposit || 0);
    const debt = Math.max(0, stats.debtTotal || 0);

    wx.createSelectorQuery()
      .select('#assetChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const width = res[0].width;
        const height = res[0].height;
        if (!width || !height) return;

        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = windowInfo.pixelRatio || 2;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const lineWidth = Math.max(18, width * 0.1);
        const radius = Math.min(width, height) / 2 - lineWidth / 2 - 4;

        // 底环
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#f3ece2';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        const total = fixed + deposit + debt;
        if (total <= 0) return;

        const segments = [
          { value: fixed, color: '#6ba8ff' },
          { value: deposit, color: '#59c3a6' },
          { value: debt, color: '#ff7a6b' }
        ].filter((segment) => segment.value > 0);

        const gap = segments.length > 1 ? 0.05 : 0;
        let start = -Math.PI / 2;
        segments.forEach((segment) => {
          const sweep = (segment.value / total) * Math.PI * 2;
          if (sweep <= gap * 2) {
            start += sweep;
            return;
          }
          ctx.beginPath();
          ctx.arc(cx, cy, radius, start + gap / 2, start + sweep - gap / 2);
          ctx.strokeStyle = segment.color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
          start += sweep;
        });
      });
  },

  /* ---------- 抵押 / 赎回 ---------- */
  onToggleMortgage(e) {
    const assetId = e.currentTarget.dataset.id;
    const asset = (this.player.assets || []).find((item) => item.id === assetId);
    if (!asset) return;
    asset.mortgaged = !asset.mortgaged;
    if (!this.persistPlayer()) {
      asset.mortgaged = !asset.mortgaged;
      return;
    }
    if (asset.mortgaged) {
      this.setData({ editingId: '' });
    }
    this.loadPlayer();
    wx.showToast({ title: asset.mortgaged ? '已抵押，建筑编辑已锁定' : '已赎回', icon: 'none' });
  },

  /* ---------- 建筑编辑 ---------- */
  onOpenBuilder(e) {
    const assetId = e.currentTarget.dataset.id;
    const asset = (this.player.assets || []).find((item) => item.id === assetId);
    if (!asset || asset.type !== 'city') return;
    if (asset.mortgaged) {
      wx.showToast({ title: '抵押中不可建造', icon: 'none' });
      return;
    }
    this.setData({ editingId: this.data.editingId === assetId ? '' : assetId });
  },

  onCloseBuilder() {
    this.setData({ editingId: '' });
  },

  onStepHomestay(e) {
    const assetId = e.currentTarget.dataset.id;
    const delta = Number(e.currentTarget.dataset.delta);
    const asset = (this.player.assets || []).find((item) => item.id === assetId);
    if (!asset || asset.type !== 'city') return;
    if (asset.mortgaged) {
      wx.showToast({ title: '抵押中不可建造', icon: 'none' });
      return;
    }
    if (asset.resort) {
      wx.showToast({ title: '度假村状态不可增减民宿', icon: 'none' });
      return;
    }
    const next = Math.max(0, Math.min(3, (Number(asset.homestayCount) || 0) + delta));
    if (next === asset.homestayCount) return;
    asset.homestayCount = next;
    if (this.persistPlayer()) this.loadPlayer();
  },

  onBuildResort(e) {
    const assetId = e.currentTarget.dataset.id;
    const asset = (this.player.assets || []).find((item) => item.id === assetId);
    if (!asset || asset.type !== 'city') return;
    if (asset.mortgaged) {
      wx.showToast({ title: '抵押中不可建造', icon: 'none' });
      return;
    }
    if (Number(asset.homestayCount) !== 3) {
      this.openModal({
        title: '还没盖满民宿',
        content: '度假村需要 3 间民宿作为前置，先盖满 3 间民宿再来吧～',
        confirmText: '继续盖民宿',
        showCancel: false,
        icon: '🏡',
        action: 'none'
      });
      return;
    }
    // 度假村与 3 间民宿互斥：升级后民宿数归零
    asset.resort = true;
    asset.homestayCount = 0;
    if (this.persistPlayer()) {
      this.loadPlayer();
      wx.showToast({ title: '度假村建造完成', icon: 'success' });
    }
  },

  onDemolishResort(e) {
    const assetId = e.currentTarget.dataset.id;
    const asset = (this.player.assets || []).find((item) => item.id === assetId);
    if (!asset || asset.type !== 'city') return;
    if (asset.mortgaged) {
      wx.showToast({ title: '抵押中不可建造', icon: 'none' });
      return;
    }
    asset.resort = false;
    asset.homestayCount = 3;
    if (this.persistPlayer()) {
      this.loadPlayer();
      wx.showToast({ title: '已拆回 3 间民宿', icon: 'none' });
    }
  },

  /* ---------- 删除资产 / 清空资产 ---------- */
  onDeleteAsset(e) {
    const assetId = e.currentTarget.dataset.id;
    const asset = this.data.assetViews.find((item) => item.id === assetId);
    if (!asset) return;
    this.setData({ pendingAssetId: assetId });
    this.openModal({
      title: '移除这张卡牌？',
      content: `「${asset.name}」将从固定资产中移除，此操作不可恢复。`,
      confirmText: '确认移除',
      danger: true,
      icon: '🗑️',
      action: 'delete-asset'
    });
  },

  deleteAsset() {
    const assetId = this.data.pendingAssetId;
    this.player.assets = (this.player.assets || []).filter((item) => item.id !== assetId);
    const ok = this.persistPlayer();
    this.setData({ pendingAssetId: '', editingId: '' });
    if (ok) {
      this.loadPlayer();
      wx.showToast({ title: '已移除资产', icon: 'success' });
    }
  },

  onClearAssets() {
    this.openModal({
      title: '清空全部资产？',
      content: '固定资产、存款与负债将全部清零，昵称与头像会保留。此操作不可恢复。',
      confirmText: '确认清空',
      danger: true,
      icon: '🧹',
      action: 'clear-assets'
    });
  },

  clearAssets() {
    const ok = store.clearPlayerAssets(this.data.playerId);
    if (!ok) {
      wx.showToast({ title: '清空失败，请重试', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已清空资产', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 1 }), 500);
  },

  onEditPlayer() {
    wx.navigateTo({ url: `/pages/edit/edit?playerId=${this.data.playerId}` });
  },

  persistPlayer() {
    const ok = store.savePlayer(this.player);
    if (!ok) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      this.loadPlayer();
    }
    return ok;
  },

  /* ---------- 通用弹窗 ---------- */
  openModal(config) {
    this.setData({
      modalVisible: true,
      modalTitle: config.title || '提示',
      modalContent: config.content || '',
      modalConfirmText: config.confirmText || '确认',
      modalCancelText: config.cancelText || '取消',
      modalShowCancel: config.showCancel !== false,
      modalDanger: !!config.danger,
      modalIcon: config.icon || '🐣',
      modalAction: config.action || ''
    });
  },

  closeModal() {
    this.setData({ modalVisible: false });
  },

  onModalCancel() {
    this.closeModal();
  },

  onModalConfirm() {
    const action = this.data.modalAction;
    this.closeModal();
    if (action === 'delete-asset') {
      this.deleteAsset();
    } else if (action === 'clear-assets') {
      this.clearAssets();
    }
  }
});
