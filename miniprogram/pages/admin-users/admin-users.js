const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    users: [],
    loading: false,
    currentUserId: null
  },

  onLoad() {
    const app = getApp();
    this.setData({
      currentUserId: app.globalData.user ? app.globalData.user.id : null
    });
  },

  onShow() {
    if (!getApp().isAdmin()) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this.loadUsers();
  },

  loadUsers() {
    this.setData({ loading: true });
    api.getUsers().then(data => {
      const users = (data.users || []).map(u => ({
        ...u,
        dateText: util.formatDate(u.created_at),
        canDelete: u.id !== this.data.currentUserId && u.role !== 'admin'
      }));
      this.setData({ users, loading: false });
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  onDeleteUser(e) {
    const id = e.currentTarget.dataset.id;
    const username = e.currentTarget.dataset.username;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除用户「' + username + '」及其所有内容吗？此操作不可撤销！',
      success: res => {
        if (res.confirm) {
          api.deleteUser(id).then(data => {
            if (data.message) {
              this.loadUsers();
              wx.showToast({ title: data.message, icon: 'success' });
            } else {
              wx.showToast({ title: data.error || '删除失败', icon: 'none' });
            }
          }).catch(err => {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
