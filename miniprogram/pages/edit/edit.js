const api = require('../../utils/api');

Page({
  data: {
    postId: 0,
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
    const postId = parseInt(options.id) || 0;
    const content = decodeURIComponent(options.content || '');
    const category = options.category || 'story';
    const theme = decodeURIComponent(options.theme || '');
    const categoryIndex = category === 'quote' ? 1 : 0;

    this.setData({
      postId,
      content,
      category,
      categoryIndex,
      theme
    });

    this.loadThemes(theme);
  },

  loadThemes(currentTheme) {
    api.getAnnouncements().then(data => {
      const themes = [];
      const seen = {};
      (data.announcements || []).forEach(a => {
        if (!seen[a.theme]) {
          seen[a.theme] = true;
          themes.push(a.theme);
        }
      });
      // Ensure current theme is in the list
      if (currentTheme && themes.indexOf(currentTheme) === -1) {
        themes.push(currentTheme);
      }

      const themeList = ['选择主题（可选）', ...themes];
      let themeIndex = 0;
      if (currentTheme) {
        themeIndex = themeList.indexOf(currentTheme);
        if (themeIndex === -1) themeIndex = 0;
      }

      this.setData({ themeList, themeIndex });
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

    this.setData({ submitting: true });

    api.updatePost(this.data.postId, content, this.data.category, this.data.theme).then(data => {
      if (data.message) {
        getApp().globalData.needsRefresh = true;
        wx.showToast({ title: '编辑成功！', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      } else {
        wx.showToast({ title: data.error || '编辑失败', icon: 'none' });
        this.setData({ submitting: false });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '编辑失败', icon: 'none' });
      this.setData({ submitting: false });
    });
  }
});
