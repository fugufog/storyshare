App({
  globalData: {
    API_BASE: 'https://api.fugufog.top/api',
    token: '',
    user: null,
    needsRefresh: false
  },

  onLaunch() {
    try {
      const token = wx.getStorageSync('token');
      if (token && typeof token === 'string') {
        this.globalData.token = token;
      }
      const user = wx.getStorageSync('user');
      if (user && typeof user === 'object') {
        this.globalData.user = user;
      }
    } catch (e) {
      console.error('读取缓存失败:', e);
    }
  },

  setAuth(token, user) {
    this.globalData.token = token;
    this.globalData.user = user;
    try {
      wx.setStorageSync('token', token);
      wx.setStorageSync('user', user);
    } catch (e) {
      console.error('写入缓存失败:', e);
    }
  },

  clearAuth() {
    this.globalData.token = '';
    this.globalData.user = null;
    try {
      wx.removeStorageSync('token');
      wx.removeStorageSync('user');
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  },

  isLoggedIn() {
    return !!this.globalData.token;
  },

  isAdmin() {
    return this.globalData.user && this.globalData.user.role === 'admin';
  }
});
