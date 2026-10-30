/**
 * 可翻转资产卡牌
 * asset 由 utils/model.js 的 buildAssetView() 生成，组件本身不读存储。
 */
Component({
  properties: {
    asset: {
      type: Object,
      value: {}
    }
  },

  data: {
    flipped: false
  },

  methods: {
    toggleFlip() {
      this.setData({ flipped: !this.data.flipped });
    }
  }
});
