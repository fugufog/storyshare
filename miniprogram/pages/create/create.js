const api = require('../../utils/api');

Page({
  data: {
    category: 'story',
    categoryIndex: 0,
    categories: ['故事', '短句'],
    theme: '',
    themeList: [],
    themeIndex: 0,
    content: '',
    submitting: false
  },

  onLoad(options) {
    if (options.category) {
      const idx = options.category === 'quote' ? 1 : 0;
      this.setData({
        category: options.category,
        categoryIndex: idx
      });
    }
    this.loadThemes();
  },

  loadThemes() {
    api.getAnnouncements().then(data => {
      const themes = [];
      const seen = {};
      (data.announcements || []).forEach(a => {
        if (!seen[a.theme]) {
          seen[a.theme] = true;
          themes.push(a.theme);
        }
      });
      this.setData({
        themeList: ['选择主题（可选）', ...themes]
      });
    }).catch(() => {});
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      categoryIndex: idx,
      category: idx === 0 ? 'story' : 'quote'
    });
  },

  onThemeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      themeIndex: idx,
      theme: idx === 0 ? '' : this.data.themeList[idx]
    });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onSubmit() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }
    if (!getApp().isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }

    this.setData({ submitting: true });

    api.createPost(content, this.data.category, this.data.theme).then(data => {
      if (data.message) {
        getApp().globalData.needsRefresh = true;
        wx.showToast({ title: '发布成功！', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      } else {
        wx.showToast({ title: data.error || '发布失败', icon: 'none' });
        this.setData({ submitting: false });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
      this.setData({ submitting: false });
    });
  }
});
