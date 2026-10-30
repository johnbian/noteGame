const store = require('../../utils/store.js');
const cloudSync = require('../../utils/cloudSync.js');

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const pad = (num) => (num < 10 ? `0${num}` : `${num}`);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

Page({
  data: {
    localCount: 0,
    configured: false,
    uploading: false,
    syncing: false,
    lastUploadText: '—',
    lastSyncText: '—',
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    modalConfirmText: '确认',
    modalCancelText: '取消',
    modalShowCancel: true,
    modalDanger: false,
    modalIcon: '☁️',
    modalAction: ''
  },

  onShow() {
    this.refreshStatus();
  },

  refreshStatus() {
    const meta = cloudSync.getMeta();
    this.setData({
      localCount: store.listPlayers().length,
      configured: cloudSync.isConfigured(),
      lastUploadText: formatTime(meta.lastUploadAt),
      lastSyncText: formatTime(meta.lastSyncAt)
    });
  },

  toastConfigMissing() {
    wx.showToast({ title: '请先在 utils/cloudConfig.js 填写环境 ID', icon: 'none' });
  },

  onUpload() {
    if (this.data.uploading || this.data.syncing) return;
    if (!this.data.configured) {
      this.toastConfigMissing();
      return;
    }
    const count = this.data.localCount;
    this.openModal({
      title: '上传并覆盖云端？',
      content: count
        ? `将把本机 ${count} 位玩家的记录整体覆盖到云端，其他设备同步后会看到这份数据。`
        : '本机当前没有玩家，上传会清空云端的记录。',
      confirmText: '确认上传',
      icon: '⬆️',
      danger: !count,
      action: 'upload'
    });
  },

  doUpload() {
    this.setData({ uploading: true });
    cloudSync.uploadPlayers(store.listPlayers()).then((res) => {
      this.setData({ uploading: false });
      if (res && res.ok) {
        wx.showToast({ title: `已上传 ${res.count} 位玩家`, icon: 'none' });
        this.refreshStatus();
      } else {
        wx.showToast({ title: cloudSync.describeError(res), icon: 'none' });
      }
    });
  },

  onSync() {
    if (this.data.uploading || this.data.syncing) return;
    if (!this.data.configured) {
      this.toastConfigMissing();
      return;
    }

    this.setData({ syncing: true });
    cloudSync.fetchPlayers().then((res) => {
      this.setData({ syncing: false });
      if (!res || !res.ok) {
        wx.showToast({ title: cloudSync.describeError(res), icon: 'none' });
        return;
      }
      if (!res.exists) {
        wx.showToast({ title: '云端还没有记录，先上传一次吧', icon: 'none' });
        return;
      }

      this.pendingRemote = res;
      const remoteCount = (res.players || []).length;
      this.openModal({
        title: '同步并覆盖本机？',
        content: remoteCount
          ? `云端有 ${remoteCount} 位玩家，将覆盖本机 ${this.data.localCount} 位玩家的记录。覆盖前会自动备份本机数据。`
          : '云端记录为空，同步会清空本机的玩家数据。覆盖前会自动备份本机数据。',
        confirmText: '确认同步',
        icon: '⬇️',
        danger: true,
        action: 'apply-sync'
      });
    });
  },

  applySync() {
    const remote = this.pendingRemote;
    this.pendingRemote = null;
    if (!remote) return;

    const players = store.replacePlayers(remote.players);
    if (!players) {
      wx.showToast({ title: '写入本机失败，请重试', icon: 'none' });
      return;
    }
    wx.showToast({ title: `已同步 ${players.length} 位玩家`, icon: 'none' });
    this.refreshStatus();
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
      modalIcon: config.icon || '☁️',
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
    if (action === 'upload') {
      this.doUpload();
    } else if (action === 'apply-sync') {
      this.applySync();
    }
  }
});
