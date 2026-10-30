Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '提示' },
    content: { type: String, value: '' },
    confirmText: { type: String, value: '确认' },
    cancelText: { type: String, value: '取消' },
    showCancel: { type: Boolean, value: true },
    danger: { type: Boolean, value: false },
    icon: { type: String, value: '🐣' }
  },

  methods: {
    noop() {},

    onMaskTap() {
      if (this.data.showCancel) this.triggerEvent('cancel');
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      this.triggerEvent('confirm');
    }
  }
});
