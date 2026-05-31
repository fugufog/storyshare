const api = require('../../utils/api');

Page({
  data: {
    isLoggedIn: false,
    isAdmin: false,
    user: null,

    // Auth forms
    authTab: 'login',
    loginUsername: '',
    loginPassword: '',
    registerUsername: '',
    registerPassword: '',

    // Profile forms
    newNickname: '',
    oldPassword: '',
    newPassword: ''
  },

  onLoad() {
    this.refreshAuth();
  },

  onShow() {
    this.refreshAuth();
  },

  refreshAuth() {
    const app = getApp();
    const loggedIn = app.isLoggedIn();
    const user = app.globalData.user;
    this.setData({
      isLoggedIn: loggedIn,
      isAdmin: app.isAdmin(),
      user: user,
      newNickname: user ? (user.nickname || user.username) : ''
    });
  },

  // Auth tab switch
  onSwitchAuthTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ authTab: tab });
  },

  // Login
  onLoginInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onLogin() {
    const { loginUsername, loginPassword } = this.data;
    if (!loginUsername.trim() || !loginPassword.trim()) {
      wx.showToast({ title: '请填写所有字段', icon: 'none' });
      return;
    }

    api.login(loginUsername.trim(), loginPassword).then(data => {
      if (data.token) {
        getApp().setAuth(data.token, data.user);
        this.refreshAuth();
        wx.showToast({ title: '登录成功！', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '登录失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    });
  },

  // Register
  onRegister() {
    const { registerUsername, registerPassword } = this.data;
    if (!registerUsername.trim() || !registerPassword.trim()) {
      wx.showToast({ title: '请填写所有字段', icon: 'none' });
      return;
    }
    if (registerUsername.trim().length < 2 || registerUsername.trim().length > 20) {
      wx.showToast({ title: '用户名需2-20个字符', icon: 'none' });
      return;
    }
    if (registerPassword.length < 6) {
      wx.showToast({ title: '密码至少6个字符', icon: 'none' });
      return;
    }

    api.register(registerUsername.trim(), registerPassword).then(data => {
      if (data.message) {
        // Switch to login
        this.setData({
          authTab: 'login',
          loginUsername: registerUsername.trim(),
          loginPassword: '',
          registerUsername: '',
          registerPassword: ''
        });
        wx.showToast({ title: '注册成功！请登录', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '注册失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
    });
  },

  // Change nickname
  onChangeNickname() {
    const nickname = this.data.newNickname.trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (nickname.length < 1 || nickname.length > 20) {
      wx.showToast({ title: '昵称长度需在1-20个字符之间', icon: 'none' });
      return;
    }

    api.changeNickname(nickname).then(data => {
      if (data.token) {
        getApp().setAuth(data.token, data.user);
        this.refreshAuth();
        wx.showToast({ title: '昵称修改成功！', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '修改失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '修改失败', icon: 'none' });
    });
  },

  // Change password
  onChangePassword() {
    const { oldPassword, newPassword } = this.data;
    if (!oldPassword || !newPassword) {
      wx.showToast({ title: '请填写所有字段', icon: 'none' });
      return;
    }
    if (newPassword.length < 6) {
      wx.showToast({ title: '新密码至少6个字符', icon: 'none' });
      return;
    }

    api.changePassword(oldPassword, newPassword).then(data => {
      if (data.message) {
        this.setData({ oldPassword: '', newPassword: '' });
        // Force re-login
        getApp().clearAuth();
        this.refreshAuth();
        wx.showToast({ title: '密码修改成功，请重新登录', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '修改失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '修改失败', icon: 'none' });
    });
  },

  // Logout
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          getApp().clearAuth();
          this.refreshAuth();
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  },

  // Input handlers
  onNewNicknameInput(e) {
    this.setData({ newNickname: e.detail.value });
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value });
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onRegInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // Navigate to admin
  onGoAdminUsers() {
    wx.navigateTo({ url: '/pages/admin-users/admin-users' });
  }
});
