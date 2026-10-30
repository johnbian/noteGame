const store = require('../../utils/store.js');
const model = require('../../utils/model.js');
const { AVATARS } = require('../../data/gameData.js');

const ADMIN_OPTION = { label: '管理员', toType: 'admin', playerId: '' };

Page({
  data: {
    isEdit: false,
    playerId: '',
    avatars: AVATARS,
    avatarPreview: { kind: 'emoji', value: AVATARS[0].emoji, bg: AVATARS[0].bg, src: '' },
    form: {
      nickname: '',
      avatar: AVATARS[0].value,
      deposit: '0'
    },
    errors: {
      nickname: '',
      deposit: ''
    },
    selectedAssets: [],
    assetViews: [],
    assetValueText: '0',
    creditorOptions: [ADMIN_OPTION],
    creditorLabels: ['管理员'],
    debtRows: [],
    debtTotalText: '0',
    saving: false
  },

  onLoad(options) {
    const playerId = options.playerId || '';
    const isEdit = !!playerId;
    const allPlayers = store.listPlayers();
    const player = isEdit ? store.getPlayer(playerId) : null;

    if (isEdit && !player) {
      wx.showToast({ title: '玩家不存在或已被删除', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
      return;
    }

    // 欠款对象：管理员 + 其他玩家（编辑时排除自己）
    const others = allPlayers.filter((item) => item.id !== playerId);
    const creditorOptions = [ADMIN_OPTION].concat(
      others.map((item) => ({ label: item.nickname, toType: 'player', playerId: item.id }))
    );

    this.playerSnapshot = player;
    this.setData({
      isEdit,
      playerId,
      creditorOptions,
      creditorLabels: creditorOptions.map((item) => item.label)
    });

    wx.setNavigationBarTitle({ title: isEdit ? '编辑玩家' : '添加玩家' });

    if (player) {
      this.prefillForm(player, creditorOptions);
    } else {
      this.refreshAssets([]);
      this.refreshDebtTotal();
    }
  },

  // 编辑模式预填
  prefillForm(player, creditorOptions) {
    const debtRows = (player.debts || []).map((debt) => {
      let index = creditorOptions.findIndex((option) => {
        if (debt.toType === 'admin') return option.toType === 'admin';
        return option.toType === 'player' && option.playerId === debt.toPlayerId;
      });
      if (index < 0) index = 0;
      return {
        id: debt.id,
        amountRaw: String(debt.amount),
        pickerIndex: index,
        creditorLabel: creditorOptions[index].label,
        error: ''
      };
    });

    this.setData({
      avatarPreview: model.resolveAvatar(player.avatar),
      form: {
        nickname: player.nickname,
        avatar: player.avatar,
        deposit: String(player.deposit)
      },
      debtRows
    });
    this.refreshAssets(player.assets || []);
    this.refreshDebtTotal(debtRows);
  },

  /* ---------- 头像 ---------- */
  onPickAvatar(e) {
    const avatar = e.currentTarget.dataset.value;
    this.setData({
      'form.avatar': avatar,
      avatarPreview: model.resolveAvatar(avatar)
    });
  },

  onChooseAvatar(e) {
    const tempFilePath = e.detail.avatarUrl;
    if (!tempFilePath) return;
    // 微信头像先保存到小程序本地文件，再把路径写入本地存储，避免临时路径失效
    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: (res) => this.applyCustomAvatar(res.savedFilePath),
      fail: () => this.applyCustomAvatar(tempFilePath)
    });
  },

  applyCustomAvatar(savedPath) {
    const avatar = `image:${savedPath}`;
    this.setData({
      'form.avatar': avatar,
      avatarPreview: model.resolveAvatar(avatar)
    });
  },

  /* ---------- 基础字段 ---------- */
  onNicknameInput(e) {
    this.setData({
      'form.nickname': e.detail.value,
      'errors.nickname': ''
    });
  },

  onDepositInput(e) {
    this.setData({
      'form.deposit': e.detail.value,
      'errors.deposit': ''
    });
  },

  /* ---------- 固定资产 ---------- */
  onPickAssets() {
    wx.navigateTo({
      url: '/pages/assets/assets',
      // 监听「编辑页 → 资产页」这条通道的回传；不能用 getOpenerEventChannel（那是首页→编辑页的通道）
      events: {
        assetsSelected: (payload) => {
          if (payload && Array.isArray(payload.assets)) {
            this.onAssetsSelected(payload.assets);
          }
        }
      },
      success: (res) => {
        res.eventChannel.emit('initAssets', { selected: this.data.selectedAssets });
      }
    });
  },

  onAssetsSelected(assets) {
    const merged = model.mergeAssets(this.data.selectedAssets, assets);
    this.refreshAssets(merged);
  },

  refreshAssets(assets) {
    const views = assets.map((asset) => model.buildAssetView(asset)).filter(Boolean);
    let value = 0;
    views.forEach((view) => {
      value += view.price;
    });
    this.setData({
      selectedAssets: assets,
      assetViews: views,
      assetValueText: model.formatMoney(value)
    });
  },

  /* ---------- 负债 ---------- */
  onAddDebt() {
    const rows = this.data.debtRows.concat([
      {
        id: model.createId('debt'),
        amountRaw: '',
        pickerIndex: 0,
        creditorLabel: this.data.creditorOptions[0].label,
        error: ''
      }
    ]);
    this.setData({ debtRows: rows });
  },

  onDebtAmountInput(e) {
    const id = e.currentTarget.dataset.id;
    const rows = this.data.debtRows.map((row) =>
      row.id === id ? Object.assign({}, row, { amountRaw: e.detail.value, error: '' }) : row
    );
    this.setData({ debtRows: rows });
    this.refreshDebtTotal(rows);
  },

  onCreditorChange(e) {
    const id = e.currentTarget.dataset.id;
    const index = Number(e.detail.value);
    const option = this.data.creditorOptions[index] || this.data.creditorOptions[0];
    const rows = this.data.debtRows.map((row) =>
      row.id === id
        ? Object.assign({}, row, { pickerIndex: index, creditorLabel: option.label, error: '' })
        : row
    );
    this.setData({ debtRows: rows });
  },

  onRemoveDebt(e) {
    const id = e.currentTarget.dataset.id;
    const rows = this.data.debtRows.filter((row) => row.id !== id);
    this.setData({ debtRows: rows });
    this.refreshDebtTotal(rows);
  },

  refreshDebtTotal(rowList) {
    const rows = Array.isArray(rowList) ? rowList : this.data.debtRows;
    let total = 0;
    rows.forEach((row) => {
      const parsed = model.parseAmount(row.amountRaw);
      if (parsed.ok) total += parsed.value;
    });
    this.setData({ debtTotalText: model.formatMoney(total) });
  },

  /* ---------- 保存 ---------- */
  onSave() {
    if (this.data.saving) return;

    if (!this.data.isEdit && store.listPlayers().length >= model.MAX_PLAYERS) {
      wx.showToast({ title: `最多 ${model.MAX_PLAYERS} 位玩家`, icon: 'none' });
      return;
    }

    const nickname = model.validateNickname(this.data.form.nickname);
    const deposit = model.parseAmount(this.data.form.deposit);
    const errors = {
      nickname: nickname.message,
      deposit: deposit.ok ? '' : '请输入有效金额（≥0）'
    };

    let hasDebtError = false;
    const rows = this.data.debtRows.map((row) => {
      const parsed = model.parseAmount(row.amountRaw);
      let message = '';
      if (!parsed.ok) {
        message = '请输入有效金额';
      } else {
        const option = this.data.creditorOptions[row.pickerIndex];
        if (!option || (option.toType === 'player' && !option.playerId)) {
          message = '请选择欠款对象';
        }
      }
      if (message) hasDebtError = true;
      return Object.assign({}, row, { error: message });
    });

    this.setData({ errors, debtRows: rows });
    if (errors.nickname || errors.deposit || hasDebtError) {
      wx.showToast({ title: '请检查表单填写', icon: 'none' });
      return;
    }

    const debts = rows.map((row) => {
      const option = this.data.creditorOptions[row.pickerIndex];
      return {
        id: row.id,
        amount: model.parseAmount(row.amountRaw).value,
        toType: option.toType,
        toPlayerId: option.playerId
      };
    });

    const payload = {
      nickname: nickname.value,
      avatar: this.data.form.avatar,
      assets: this.data.selectedAssets,
      deposit: deposit.value,
      debts
    };

    this.setData({ saving: true });

    let saved = null;
    if (this.data.isEdit) {
      const base = Object.assign({}, this.playerSnapshot || {}, payload, { id: this.data.playerId });
      saved = store.savePlayer(base);
    } else {
      saved = store.savePlayer(model.createPlayer(payload));
    }

    if (!saved) {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      return;
    }

    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 450);
  }
});
