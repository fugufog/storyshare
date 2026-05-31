const api = require('../../utils/api');
const util = require('../../utils/util');

const COLLAPSE_THRESHOLD = 80;
const POSTS_PER_PAGE = 5;

Page({
  data: {
    posts: [],
    page: 1,
    totalPages: 0,
    announcements: [],
    newTheme: '',

    // Publish form
    publishCategory: 'story',
    publishTheme: '',
    publishContent: '',
    themeList: [],
    publishThemeIndex: 0,

    // Filter
    filterOpen: false,
    filter: {
      theme: '',
      dateFrom: '',
      dateTo: '',
      username: '',
      search: ''
    },
    filterThemeList: [],
    filterThemeIndex: 0,

    isAdmin: false,
    isLoggedIn: false,
    currentUserId: null,
    loading: false,
    COLLAPSE_THRESHOLD: COLLAPSE_THRESHOLD
  },

  onLoad() {
    this.refreshAuth();
    // Lazy load: only fetch data after page is fully initialized
    setTimeout(() => {
      this.loadAnnouncements();
      this.loadPosts();
    }, 300);
  },

  onShow() {
    this.refreshAuth();
    if (getApp().globalData.needsRefresh) {
      getApp().globalData.needsRefresh = false;
      setTimeout(() => {
        this.loadAnnouncements();
        this.loadPosts();
      }, 100);
    }
  },

  onPullDownRefresh() {
    Promise.all([this.loadAnnouncements(), this.loadPosts()]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshAuth() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.isLoggedIn(),
      isAdmin: app.isAdmin(),
      currentUserId: app.globalData.user ? app.globalData.user.id : null
    });
  },

  // Announcements
  loadAnnouncements() {
    return api.getAnnouncements().then(data => {
      const announcements = (data.announcements || []).map(a => ({
        ...a,
        dateText: util.formatDate(a.created_at)
      }));
      const themes = [];
      const seen = {};
      announcements.forEach(a => {
        if (!seen[a.theme]) {
          seen[a.theme] = true;
          themes.push(a.theme);
        }
      });

      const publishThemes = ['选择主题（可选）', ...themes];
      const filterThemes = ['全部主题', ...themes];

      this.setData({
        announcements,
        themeList: publishThemes,
        filterThemeList: filterThemes
      });
    }).catch(err => {
      console.error('加载公告失败:', err);
    });
  },

  onCreateAnnouncement() {
    const theme = this.data.newTheme.trim();
    if (!theme) {
      wx.showToast({ title: '请输入主题', icon: 'none' });
      return;
    }
    api.createAnnouncement(theme).then(data => {
      if (data.message) {
        this.setData({ newTheme: '' });
        this.loadAnnouncements();
        wx.showToast({ title: '发布成功', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '发布失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
    });
  },

  onDeleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      success: res => {
        if (res.confirm) {
          api.deleteAnnouncement(id).then(data => {
            if (data.message) {
              this.loadAnnouncements();
              wx.showToast({ title: '删除成功', icon: 'success' });
            } else {
              wx.showToast({ title: data.error || '删除失败', icon: 'none' });
            }
          }).catch(err => {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // Posts
  loadPosts() {
    this.setData({ loading: true });
    const params = {
      category: 'story',
      page: this.data.page,
      limit: POSTS_PER_PAGE,
      theme: this.data.filter.theme,
      dateFrom: this.data.filter.dateFrom,
      dateTo: this.data.filter.dateTo,
      username: this.data.filter.username,
      search: this.data.filter.search
    };

    return api.getPosts(params).then(data => {
      const posts = (data.posts || []).map(p => ({
        ...p,
        dateText: util.formatDate(p.created_at),
        isLong: p.content.length > COLLAPSE_THRESHOLD,
        collapsed: true
      }));
      this.setData({
        posts,
        totalPages: data.pagination ? data.pagination.totalPages : 0,
        loading: false
      });
    }).catch(err => {
      console.error('加载文章失败:', err);
      this.setData({ loading: false });
    });
  },

  onToggleExpand(e) {
    const idx = e.currentTarget.dataset.index;
    const key = 'posts[' + idx + '].collapsed';
    this.setData({
      [key]: !this.data.posts[idx].collapsed
    });
  },

  // Publish
  onPublishCategoryChange(e) {
    this.setData({ publishCategory: e.detail.value });
  },

  onPublishThemeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      publishThemeIndex: idx,
      publishTheme: idx === 0 ? '' : this.data.themeList[idx]
    });
  },

  onPublish() {
    const content = this.data.publishContent.trim();
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }
    if (!getApp().isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }

    api.createPost(content, this.data.publishCategory, this.data.publishTheme).then(data => {
      if (data.message) {
        this.setData({
          publishContent: '',
          publishTheme: '',
          publishThemeIndex: 0,
          page: 1
        });
        this.loadPosts();
        wx.showToast({ title: '发布成功！', icon: 'success' });
      } else {
        wx.showToast({ title: data.error || '发布失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
    });
  },

  // Delete post
  onDeletePost(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条内容吗？',
      success: res => {
        if (res.confirm) {
          api.deletePost(id).then(data => {
            if (data.message) {
              this.loadPosts();
              wx.showToast({ title: '删除成功', icon: 'success' });
            } else {
              wx.showToast({ title: data.error || '删除失败', icon: 'none' });
            }
          }).catch(err => {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // Edit post
  onEditPost(e) {
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p.id === id);
    if (!post) return;
    wx.navigateTo({
      url: '/pages/edit/edit?id=' + id + '&content=' + encodeURIComponent(post.content) + '&category=' + post.category + '&theme=' + encodeURIComponent(post.theme || '')
    });
  },

  // Filter
  onToggleFilter() {
    this.setData({ filterOpen: !this.data.filterOpen });
  },

  onFilterThemeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      filterThemeIndex: idx,
      'filter.theme': idx === 0 ? '' : this.data.filterThemeList[idx]
    });
  },

  onApplyFilter() {
    this.setData({ page: 1 }, () => {
      this.loadPosts();
    });
  },

  onResetFilter() {
    this.setData({
      filterThemeIndex: 0,
      filter: {
        theme: '',
        dateFrom: '',
        dateTo: '',
        username: '',
        search: ''
      }
    }, () => {
      this.loadPosts();
    });
  },

  // Pagination
  onPrevPage() {
    if (this.data.page > 1) {
      this.setData({ page: this.data.page - 1 }, () => {
        this.loadPosts();
      });
    }
  },

  onNextPage() {
    if (this.data.page < this.data.totalPages) {
      this.setData({ page: this.data.page + 1 }, () => {
        this.loadPosts();
      });
    }
  },

  // Input handlers
  onNewThemeInput(e) {
    this.setData({ newTheme: e.detail.value });
  },

  onPublishInput(e) {
    this.setData({ publishContent: e.detail.value });
  },

  onFilterDateFrom(e) {
    this.setData({ 'filter.dateFrom': e.detail.value });
    // Auto-close filter after selection
    // this.setData({ filterOpen: false });
  },

  onFilterDateTo(e) {
    this.setData({ 'filter.dateTo': e.detail.value });
  },

  onFilterUsername(e) {
    this.setData({ 'filter.username': e.detail.value });
  },

  onFilterSearch(e) {
    this.setData({ 'filter.search': e.detail.value });
  },

  // Navigate to create page
  onGoCreate() {
    if (!getApp().isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }
    wx.navigateTo({ url: '/pages/create/create?category=story' });
  }
});
