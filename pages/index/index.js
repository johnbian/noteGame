const store = require('../../utils/store.js');
const model = require('../../utils/model.js');

Page({
  data: {
    maxPlayers: model.MAX_PLAYERS,
    players: [],
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    modalConfirmText: '确认',
    modalCancelText: '取消',
    modalShowCancel: true,
    modalDanger: false,
    modalIcon: '🐣',
    modalAction: '',
    pendingPlayerId: '',
    pendingPlayerName: ''
  },

  onShow() {
    this.refreshPlayers();
  },

  // 从本地存储重新读取并组装玩家卡片展示数据
  refreshPlayers() {
    const allPlayers = store.listPlayers();
    const players = allPlayers.map((player) => {
      const totals = model.calcPlayerTotals(player);
      const assets = player.assets || [];
      const buildingCount = assets.filter((asset) => asset.type === 'building').length;
      const debtsView = model.buildDebtViews(player, allPlayers);
      return {
        id: player.id,
        nickname: player.nickname,
        avatar: model.resolveAvatar(player.avatar),
        cityGroups: model.buildCityGroups(assets),
        buildingCount,
        hasBuildings: buildingCount > 0,
        depositText: totals.depositText,
        debtsView,
        hasDebt: debtsView.length > 0,
        debtTotalText: totals.debtTotalText,
        debtChipText: debtsView.length > 0 ? `欠 ¥${totals.debtTotalText}` : '无负债'
      };
    });
    this.setData({ players });
  },

  onAddPlayer() {
    if (this.data.players.length >= this.data.maxPlayers) {
      this.openModal({
        title: '玩家已满',
        content: `最多可添加 ${this.data.maxPlayers} 位玩家，先删除一位再添加吧～`,
        confirmText: '知道啦',
        showCancel: false,
        icon: '🧸',
        action: 'none'
      });
      return;
    }
    wx.navigateTo({ url: '/pages/edit/edit' });
  },

  onOpenPlayer(e) {
    const playerId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?playerId=${playerId}` });
  },

  // 单个删除：先确认，再检查是否需要迁移负债
  onDeletePlayer(e) {
    const playerId = e.currentTarget.dataset.id;
    const player = this.data.players.find((item) => item.id === playerId);
    if (!player) return;
    this.setData({
      pendingPlayerId: playerId,
      pendingPlayerName: player.nickname
    });
    this.openModal({
      title: '删除玩家？',
      content: `确定要删除「${player.nickname}」吗？该玩家的资产与负债记录将一并删除，不可恢复。`,
      confirmText: '确认删除',
      danger: true,
      icon: '🗑️',
      action: 'delete-player'
    });
  },

  handleDeleteConfirmed() {
    const playerId = this.data.pendingPlayerId;
    if (!playerId) return;
    const count = store.countDebtsTo(playerId);
    if (count > 0) {
      this.openModal({
        title: '发现关联欠款',
        content: `存在${count}笔负债，这些欠款会自动变更为欠管理员。`,
        confirmText: '确认迁移并删除',
        danger: true,
        icon: '🔁',
        action: 'migrate-delete'
      });
      return;
    }
    const ok = store.deletePlayer(playerId);
    this.setData({ pendingPlayerId: '', pendingPlayerName: '' });
    this.refreshPlayers();
    wx.showToast({ title: ok ? '已删除玩家' : '删除失败，请重试', icon: ok ? 'success' : 'none' });
  },

  handleMigrateAndDelete() {
    const playerId = this.data.pendingPlayerId;
    if (!playerId) return;
    const migrated = store.removePlayerAndMigrate(playerId);
    if (migrated === null) {
      wx.showToast({ title: '删除失败，请重试', icon: 'none' });
      return;
    }
    this.setData({ pendingPlayerId: '', pendingPlayerName: '' });
    this.refreshPlayers();
    wx.showToast({ title: `已迁移 ${migrated} 笔欠款并删除`, icon: 'none' });
  },

  onClearAll() {
    this.openModal({
      title: '清空所有玩家？',
      content: '将删除全部玩家及其资产、存款、负债记录，操作不可恢复。',
      confirmText: '确认清空',
      danger: true,
      icon: '🧹',
      action: 'clear-all'
    });
  },

  handleClearAll() {
    const ok = store.clearAllPlayers();
    this.refreshPlayers();
    wx.showToast({ title: ok ? '已清空所有数据' : '清空失败，请重试', icon: ok ? 'success' : 'none' });
  },

  /* ---------- 通用卡通弹窗 ---------- */
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
    if (action === 'delete-player') {
      this.handleDeleteConfirmed();
    } else if (action === 'migrate-delete') {
      this.handleMigrateAndDelete();
    } else if (action === 'clear-all') {
      this.handleClearAll();
    }
  }
});
