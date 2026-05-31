var API_BASE = window.API_BASE || '/api';
var COLLAPSE_THRESHOLD = 80;

const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  activeTab: 'story',
  storyPage: 1,
  quotePage: 1,
  albumPage: 1,
  albumEntryPage: 1,
  currentAlbumId: null,
  currentAlbum: null,
  currentCommentPostId: null,
  commentPage: 1,
  postsPerPage: 5,
  filter: {
    theme: '',
    dateFrom: '',
    dateTo: '',
    username: '',
    search: ''
  }
};

const elements = {
  userInfo: document.getElementById('userInfo'),
  username: document.getElementById('username'),
  authButtons: document.getElementById('authButtons'),
  publishSection: document.getElementById('publishSection'),
  storySection: document.getElementById('storySection'),
  storyList: document.getElementById('storyList'),
  storyPagination: document.getElementById('storyPagination'),
  quoteSection: document.getElementById('quoteSection'),
  quoteList: document.getElementById('quoteList'),
  quotePagination: document.getElementById('quotePagination'),
  profileSection: document.getElementById('profileSection'),
  usersSection: document.getElementById('usersSection'),
  userManageContent: document.getElementById('userManageContent'),
  loginModal: document.getElementById('loginModal'),
  registerModal: document.getElementById('registerModal'),
  publishForm: document.getElementById('publishForm'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  changePasswordForm: document.getElementById('changePasswordForm'),
  changeNicknameForm: document.getElementById('changeNicknameForm'),
  exportStoryBtn: document.getElementById('exportStoryBtn'),
  exportQuoteBtn: document.getElementById('exportQuoteBtn'),
  announcementList: document.getElementById('announcementList'),
  newThemeInput: document.getElementById('newThemeInput'),
  addThemeBtn: document.getElementById('addThemeBtn'),
  postTheme: document.getElementById('postTheme'),
  editPostTheme: document.getElementById('editPostTheme'),
  filterTheme: document.getElementById('filterTheme'),
  filterDateFrom: document.getElementById('filterDateFrom'),
  filterDateTo: document.getElementById('filterDateTo'),
  filterUsername: document.getElementById('filterUsername'),
  filterSearch: document.getElementById('filterSearch'),
  applyFilterBtn: document.getElementById('applyFilterBtn'),
  resetFilterBtn: document.getElementById('resetFilterBtn'),
  // Album elements
  albumSection: document.getElementById('albumSection'),
  albumListView: document.getElementById('albumListView'),
  albumDetailView: document.getElementById('albumDetailView'),
  albumList: document.getElementById('albumList'),
  albumPagination: document.getElementById('albumPagination'),
  albumEntryList: document.getElementById('albumEntryList'),
  albumEntryPagination: document.getElementById('albumEntryPagination'),
  albumDetailInfo: document.getElementById('albumDetailInfo'),
  albumDetailActions: document.getElementById('albumDetailActions'),
  showCreateAlbumBtn: document.getElementById('showCreateAlbumBtn'),
  createAlbumForm: document.getElementById('createAlbumForm'),
  albumName: document.getElementById('albumName'),
  albumDesc: document.getElementById('albumDesc'),
  albumIsPublic: document.getElementById('albumIsPublic'),
  submitAlbumBtn: document.getElementById('submitAlbumBtn'),
  cancelAlbumBtn: document.getElementById('cancelAlbumBtn'),
  albumEntryForm: document.getElementById('albumEntryForm'),
  albumEntryTitle: document.getElementById('albumEntryTitle'),
  albumEntryContent: document.getElementById('albumEntryContent'),
  submitAlbumEntryBtn: document.getElementById('submitAlbumEntryBtn'),
  backToAlbumListBtn: document.getElementById('backToAlbumListBtn'),
  adminAlbumsSection: document.getElementById('adminAlbumsSection'),
  adminAlbumList: document.getElementById('adminAlbumList'),
  // Comment elements
  commentOverlay: document.getElementById('commentOverlay'),
  commentPanel: document.getElementById('commentPanel'),
  commentList: document.getElementById('commentList'),
  commentPagination: document.getElementById('commentPagination'),
  commentForm: document.getElementById('commentForm'),
  commentContent: document.getElementById('commentContent'),
  closeCommentPanelBtn: document.getElementById('closeCommentPanelBtn'),
  floatingCollapseBtn: document.getElementById('floatingCollapseBtn')
};

function init() {
  updateAuthUI();
  switchTab(state.activeTab, true);
  bindEvents();
  loadAnnouncements();
}

function updateAuthUI() {
  if (state.token && state.user) {
    elements.userInfo.style.display = 'flex';
    elements.authButtons.style.display = 'none';
    elements.showCreateAlbumBtn.style.display = '';
    elements.username.textContent = state.user.nickname || state.user.username;

    if (state.user.role === 'admin') {
      document.querySelectorAll('.nav-tab-admin').forEach(el => el.style.display = '');
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    } else {
      document.querySelectorAll('.nav-tab-admin').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
  } else {
    elements.userInfo.style.display = 'none';
    elements.authButtons.style.display = 'flex';
    elements.showCreateAlbumBtn.style.display = 'none';
    document.querySelectorAll('.nav-tab-admin').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

function loadAnnouncements() {
  fetch(API_BASE + '/announcements')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      renderAnnouncements(data.announcements);
      updateThemeSelects(data.announcements);
    })
    .catch(function(error) {
      console.error('加载公告失败:', error);
    });
}

function renderAnnouncements(announcements) {
  if (!announcements || announcements.length === 0) {
    elements.announcementList.innerHTML = '<p class="empty-message">暂无公告</p>';
    return;
  }

  var isAdmin = state.user && state.user.role === 'admin';

  elements.announcementList.innerHTML = announcements.map(function(a) {
    return '<div class="announcement-item">' +
      '<span class="announcement-theme">' + escapeHtml(a.theme) + '</span>' +
      '<span class="announcement-date">' + formatDate(a.created_at) + '</span>' +
      (isAdmin ? '<button class="announcement-delete-btn" onclick="deleteAnnouncement(' + a.id + ')">&times;</button>' : '') +
    '</div>';
  }).join('');
}

function updateThemeSelects(announcements) {
  var themeNames = [];
  if (announcements) {
    var seen = {};
    announcements.forEach(function(a) {
      if (!seen[a.theme]) {
        seen[a.theme] = true;
        themeNames.push(a.theme);
      }
    });
  }

  var optionsHtml = '<option value="">选择主题（可选）</option>' +
    themeNames.map(function(t) { return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>'; }).join('');

  elements.postTheme.innerHTML = optionsHtml;
  elements.editPostTheme.innerHTML = optionsHtml;
  // 同步更新筛选栏的主题下拉
  var filterOptions = '<option value="">全部主题</option>' +
    themeNames.map(function(t) { return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>'; }).join('');
  // 保留当前选中值
  var currentFilter = elements.filterTheme.value;
  elements.filterTheme.innerHTML = filterOptions;
  elements.filterTheme.value = currentFilter;
}

function createAnnouncement() {
  var theme = elements.newThemeInput.value.trim();
  if (!theme) { alert('请输入主题'); return; }

  fetch(API_BASE + '/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({ theme: theme })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        elements.newThemeInput.value = '';
        loadAnnouncements();
        alert('公告发布成功！');
      } else {
        alert(data.error || '发布失败');
      }
    })
    .catch(function(error) {
      console.error('发布公告失败:', error);
      alert('发布失败，请重试');
    });
}

function deleteAnnouncement(id) {
  if (!confirm('确定要删除这条公告吗？')) return;

  fetch(API_BASE + '/announcements/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        loadAnnouncements();
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除公告失败:', error);
      alert('删除失败，请重试');
    });
}

function switchTab(tab, forceReload) {
  state.activeTab = tab;

  // 更新导航标签高亮
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // 显示/隐藏各区块
  const isStoryOrQuote = (tab === 'story' || tab === 'quote');
  elements.publishSection.style.display = (state.token && isStoryOrQuote) ? 'block' : 'none';
  elements.storySection.style.display = tab === 'story' ? 'block' : 'none';
  elements.quoteSection.style.display = tab === 'quote' ? 'block' : 'none';
  elements.albumSection.style.display = tab === 'album' ? 'block' : 'none';
  elements.profileSection.style.display = tab === 'profile' ? 'block' : 'none';
  elements.usersSection.style.display = tab === 'users' ? 'block' : 'none';
  elements.adminAlbumsSection.style.display = tab === 'adminAlbums' ? 'block' : 'none';

  if (tab === 'album') {
    elements.albumListView.style.display = 'block';
    elements.albumDetailView.style.display = 'none';
    state.currentAlbumId = null;
    if (forceReload) {
      loadAlbums();
    }
  }

  if (tab === 'story' || tab === 'quote') {
    document.getElementById('postCategory').value = tab;
    if (forceReload || tab === 'story' && !elements.storyList.children.length || tab === 'quote' && !elements.quoteList.children.length) {
      loadPosts();
    }
  } else if (tab === 'profile') {
    // 预填昵称
    var nicknameInput = document.getElementById('newNickname');
    if (nicknameInput && state.user) {
      nicknameInput.value = state.user.nickname || state.user.username;
    }
  } else if (tab === 'users') {
    loadUserList();
  } else if (tab === 'adminAlbums') {
    loadAdminAlbums();
  }
}

function loadPosts() {
  var tab = state.activeTab;
  var category = tab === 'story' ? 'story' : 'quote';
  var page = tab === 'story' ? state.storyPage : state.quotePage;
  var listEl = tab === 'story' ? elements.storyList : elements.quoteList;
  var pagEl = tab === 'story' ? elements.storyPagination : elements.quotePagination;

  var params = 'category=' + category + '&page=' + page + '&limit=' + state.postsPerPage;

  // 附加筛选参数
  var f = state.filter;
  if (f.theme) params += '&theme=' + encodeURIComponent(f.theme);
  if (f.dateFrom) params += '&dateFrom=' + encodeURIComponent(f.dateFrom);
  if (f.dateTo) params += '&dateTo=' + encodeURIComponent(f.dateTo);
  if (f.username) params += '&username=' + encodeURIComponent(f.username);
  if (f.search) params += '&search=' + encodeURIComponent(f.search);

  fetch(API_BASE + '/posts?' + params)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      renderPosts(data.posts, listEl, category);
      renderPagination(data.pagination, pagEl);
    })
    .catch(function(error) {
      console.error('加载文章失败:', error);
    });
}

function renderPosts(posts, container, category) {
  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-message">暂无内容，快来发布第一条吧！</p>';
    return;
  }

  container.innerHTML = posts.map(function(post) {
    var isOwner = state.user && state.user.id === post.user_id;
    var isLong = post.content.length > COLLAPSE_THRESHOLD;
    var themeTag = post.theme ? '<span class="post-theme-tag">' + escapeHtml(post.theme) + '</span>' : '';
    return '<div class="post-item" data-id="' + post.id + '">' +
      '<p class="post-content' + (isLong ? ' collapsed expandable' : '') + '">' + escapeHtml(post.content) + '</p>' +
      (isLong ? '<button class="post-expand-btn">展开</button>' : '') +
      '<div class="post-meta">' +
        '<span>' +
          '<span class="post-author">' + escapeHtml(post.username) + '</span> ' +
          themeTag + ' ' +
          '<span class="post-date">' + formatDate(post.created_at) + '</span>' +
        '</span>' +
        '<span class="post-actions">' +
          '<button class="post-comment-indicator" onclick="event.stopPropagation();openCommentPanel(' + post.id + ')">&#x1F4AC; 评论</button>' +
          (isOwner ? '<button class="post-action-btn post-action-btn-edit" onclick="editPost(' + post.id + ')">编辑</button>' : '') +
          (canDelete(post) ? '<button class="post-action-btn post-action-btn-delete" onclick="deletePost(' + post.id + ')">删除</button>' : '') +
        '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderPagination(pagination, container) {
  var page = pagination.page;
  var totalPages = pagination.totalPages;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<button ' + (page <= 1 ? 'disabled' : '') + ' onclick="goToPage(' + (page - 1) + ')">上一页</button>' +
    '<span class="page-info">第 ' + page + ' / ' + totalPages + ' 页</span>' +
    '<button ' + (page >= totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (page + 1) + ')">下一页</button>';
}

function goToPage(page) {
  if (state.activeTab === 'story') {
    state.storyPage = page;
  } else {
    state.quotePage = page;
  }
  loadPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function canDelete(post) {
  if (!state.user) return false;
  return state.user.role === 'admin' || state.user.id === post.user_id;
}

function deletePost(id) {
  if (!confirm('确定要删除这条内容吗？')) return;

  fetch(API_BASE + '/posts/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        alert('删除成功');
        loadPosts();
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    });
}

function editPost(id) {
  var postItem = document.querySelector('.post-item[data-id="' + id + '"]');
  if (!postItem) return;

  var content = postItem.querySelector('.post-content').textContent;
  var container = postItem.closest('.post-list');
  var category = (container && container.id === 'quoteList') ? 'quote' : 'story';

  // 读取当前主题标签
  var themeTag = postItem.querySelector('.post-theme-tag');
  var currentTheme = themeTag ? themeTag.textContent : '';

  document.getElementById('editPostContent').value = content;
  document.getElementById('editPostCategory').value = category;
  document.getElementById('editPostModal').dataset.postId = id;

  // 设置编辑模态框中的主题下拉
  var editThemeSelect = document.getElementById('editPostTheme');
  if (currentTheme) {
    // 确保该主题在下拉选项中
    var found = false;
    for (var i = 0; i < editThemeSelect.options.length; i++) {
      if (editThemeSelect.options[i].value === currentTheme) {
        editThemeSelect.value = currentTheme;
        found = true;
        break;
      }
    }
    if (!found) {
      editThemeSelect.innerHTML += '<option value="' + escapeHtml(currentTheme) + '" selected>' + escapeHtml(currentTheme) + '</option>';
    }
  } else {
    editThemeSelect.value = '';
  }

  document.getElementById('editPostModal').classList.add('show');
}

function downloadCategoryExcel(category) {
  var label = category === 'story' ? '故事' : '短句';

  fetch(API_BASE + '/posts?category=' + category + '&limit=99999')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var posts = data.posts;
      if (posts.length === 0) {
        alert('没有' + label + '数据可下载');
        return;
      }

      // 构建 Excel 数据，格式化时间为 yyyy-mm-dd hh:mm:ss
      var rows = posts.map(function(post) {
        var d = new Date(post.created_at);
        var timeStr = d.getFullYear() + '-' +
          pad2(d.getMonth() + 1) + '-' +
          pad2(d.getDate()) + ' ' +
          pad2(d.getHours()) + ':' +
          pad2(d.getMinutes()) + ':' +
          pad2(d.getSeconds());
        return {
          'ID': post.id,
          '作者': post.username,
          '内容': post.content,
          '类型': label,
          '发布时间': timeStr
        };
      });

      var ws = XLSX.utils.json_to_sheet(rows);

      // 设置列宽
      ws['!cols'] = [
        { wch: 6 },   // ID
        { wch: 12 },  // 作者
        { wch: 50 },  // 内容
        { wch: 6 },   // 类型
        { wch: 20 }   // 发布时间
      ];

      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, 'storyshare_' + label + '_' + Date.now() + '.xlsx');
    })
    .catch(function(error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    });
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function bindEvents() {
  // 导航标签切换
  document.querySelectorAll('.nav-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = this.dataset.tab;
      if (state.token || (tab !== 'profile' && tab !== 'users')) {
        switchTab(tab);
      } else {
        alert('请先登录');
        elements.loginModal.classList.add('show');
      }
    });
  });

  // 公告 - 发布主题
  elements.addThemeBtn.addEventListener('click', createAnnouncement);

  // 公告 - 回车发布
  elements.newThemeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      createAnnouncement();
    }
  });

  // 筛选
  elements.applyFilterBtn.addEventListener('click', function() {
    state.filter.theme = elements.filterTheme.value;
    state.filter.dateFrom = elements.filterDateFrom.value;
    state.filter.dateTo = elements.filterDateTo.value;
    state.filter.username = elements.filterUsername.value.trim();
    state.filter.search = elements.filterSearch.value.trim();
    state.storyPage = 1;
    state.quotePage = 1;
    loadPosts();
  });

  // 搜索框回车触发筛选
  elements.filterSearch.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.filter.theme = elements.filterTheme.value;
      state.filter.dateFrom = elements.filterDateFrom.value;
      state.filter.dateTo = elements.filterDateTo.value;
      state.filter.username = elements.filterUsername.value.trim();
      state.filter.search = elements.filterSearch.value.trim();
      state.storyPage = 1;
      state.quotePage = 1;
      loadPosts();
    }
  });

  elements.resetFilterBtn.addEventListener('click', function() {
    state.filter.theme = '';
    state.filter.dateFrom = '';
    state.filter.dateTo = '';
    state.filter.username = '';
    state.filter.search = '';
    elements.filterTheme.value = '';
    elements.filterDateFrom.value = '';
    elements.filterDateTo.value = '';
    elements.filterUsername.value = '';
    elements.filterSearch.value = '';
    state.storyPage = 1;
    state.quotePage = 1;
    loadPosts();
  });

  // Excel 下载按钮
  elements.exportStoryBtn.addEventListener('click', function() {
    downloadCategoryExcel('story');
  });
  elements.exportQuoteBtn.addEventListener('click', function() {
    downloadCategoryExcel('quote');
  });

  // 编辑文章表单
  var editForm = document.getElementById('editPostForm');
  if (editForm) {
    editForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var postId = parseInt(document.getElementById('editPostModal').dataset.postId);
      var content = document.getElementById('editPostContent').value;
      var category = document.getElementById('editPostCategory').value;

      if (!content.trim()) { alert('内容不能为空'); return; }

      fetch(API_BASE + '/posts/' + postId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.token
        },
        body: JSON.stringify({ content: content, category: category, theme: document.getElementById('editPostTheme').value })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.message) {
            document.getElementById('editPostModal').classList.remove('show');
            editForm.reset();
            loadPosts();
            alert('编辑成功！');
          } else {
            alert(data.error || '编辑失败');
          }
        })
        .catch(function(error) {
          console.error('编辑失败:', error);
          alert('编辑失败，请重试');
        });
    });
  }

  // 关闭编辑模态框
  var editModal = document.getElementById('editPostModal');
  if (editModal) {
    editModal.addEventListener('click', function(e) {
      if (e.target === editModal) editModal.classList.remove('show');
    });
  }

  // 编辑专辑文章模态框提交
  var editAlbumEntryForm = document.getElementById('editAlbumEntryForm');
  if (editAlbumEntryForm) {
    editAlbumEntryForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var modal = document.getElementById('editAlbumEntryModal');
      var entryId = parseInt(modal.dataset.entryId);
      var title = document.getElementById('editAlbumEntryTitle').value.trim();
      var content = document.getElementById('editAlbumEntryContent').value.trim();

      if (!title) { alert('标题不能为空'); return; }
      if (!content) { alert('内容不能为空'); return; }

      fetch(API_BASE + '/albums/entries/' + entryId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.token
        },
        body: JSON.stringify({ title: title, content: content })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.message) {
            modal.classList.remove('show');
            editAlbumEntryForm.reset();
            loadAlbumEntries(state.currentAlbumId, state.albumEntryPage);
          } else {
            alert(data.error || '编辑失败');
          }
        })
        .catch(function(error) {
          console.error('编辑文章失败:', error);
          alert('编辑失败，请重试');
        });
    });
  }

  // 关闭编辑专辑文章模态框
  var editAlbumEntryModal = document.getElementById('editAlbumEntryModal');
  if (editAlbumEntryModal) {
    editAlbumEntryModal.addEventListener('click', function(e) {
      if (e.target === editAlbumEntryModal) editAlbumEntryModal.classList.remove('show');
    });
  }

  // 显示登录模态框
  document.getElementById('showLoginBtn').addEventListener('click', function() {
    elements.loginModal.classList.add('show');
  });

  // 显示注册模态框
  document.getElementById('showRegisterBtn').addEventListener('click', function() {
    elements.registerModal.classList.add('show');
  });

  // 关闭模态框（close 按钮）
  document.querySelectorAll('.modal .close').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.target.closest('.modal').classList.remove('show');
    });
  });

  // 点击模态框外部关闭
  [elements.loginModal, elements.registerModal].forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('show');
    });
  });

  // 切换到注册
  document.getElementById('switchToRegister').addEventListener('click', function(e) {
    e.preventDefault();
    elements.loginModal.classList.remove('show');
    elements.registerModal.classList.add('show');
  });

  // 切换到登录
  document.getElementById('switchToLogin').addEventListener('click', function(e) {
    e.preventDefault();
    elements.registerModal.classList.remove('show');
    elements.loginModal.classList.add('show');
  });

  // 登录表单
  elements.loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value;
    var password = document.getElementById('loginPassword').value;

    fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.token) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          elements.loginModal.classList.remove('show');
          elements.loginForm.reset();
          updateAuthUI();
          switchTab('story', true);
          loadAnnouncements();
          alert('登录成功！');
        } else {
          alert(data.error || '登录失败');
        }
      })
      .catch(function(error) {
        console.error('登录失败:', error);
        alert('登录失败，请重试');
      });
  });

  // 注册表单
  elements.registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('registerUsername').value;
    var password = document.getElementById('registerPassword').value;

    fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.message) {
          elements.registerModal.classList.remove('show');
          elements.registerForm.reset();
          alert('注册成功！请登录');
          elements.loginModal.classList.add('show');
        } else {
          alert(data.error || '注册失败');
        }
      })
      .catch(function(error) {
        console.error('注册失败:', error);
        alert('注册失败，请重试');
      });
  });

  // 发布表单
  elements.publishForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var content = document.getElementById('postContent').value;
    var category = document.getElementById('postCategory').value;

    if (!content.trim()) { alert('内容不能为空'); return; }

    fetch(API_BASE + '/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({ content: content, category: category, theme: document.getElementById('postTheme').value })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.message) {
          elements.publishForm.reset();
          if (state.activeTab === 'story') state.storyPage = 1;
          else state.quotePage = 1;
          loadPosts();
          alert('发布成功！');
        } else {
          alert(data.error || '发布失败');
        }
      })
      .catch(function(error) {
        console.error('发布失败:', error);
        alert('发布失败，请重试');
      });
  });

  // 修改密码表单（个人中心内联）
  elements.changePasswordForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var oldPassword = document.getElementById('oldPassword').value;
    var newPassword = document.getElementById('newPassword').value;

    if (!oldPassword || !newPassword) { alert('请填写所有字段'); return; }
    if (newPassword.length < 6) { alert('新密码至少6个字符'); return; }

    fetch(API_BASE + '/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({ oldPassword: oldPassword, newPassword: newPassword })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.message) {
          alert('密码修改成功！请重新登录。');
          elements.changePasswordForm.reset();
          // 强制重新登录
          state.token = null;
          state.user = null;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          updateAuthUI();
          switchTab('story', true);
        } else {
          alert(data.error || '修改失败');
        }
      })
      .catch(function(error) {
        console.error('修改密码失败:', error);
        alert('修改失败，请重试');
      });
  });

  // 修改昵称表单（个人中心内联）
  elements.changeNicknameForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var nickname = document.getElementById('newNickname').value;

    if (!nickname) { alert('请输入新昵称'); return; }
    if (nickname.length < 1 || nickname.length > 20) { alert('昵称长度需在1-20个字符之间'); return; }

    fetch(API_BASE + '/auth/nickname', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({ nickname: nickname })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.token) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          elements.changeNicknameForm.reset();
          document.getElementById('newNickname').value = state.user.nickname || state.user.username;
          updateAuthUI();
          alert('昵称修改成功！');
          if (state.activeTab === 'story' || state.activeTab === 'quote') {
            loadPosts();
          }
        } else {
          alert(data.error || '修改失败');
        }
      })
      .catch(function(error) {
        console.error('修改昵称失败:', error);
        alert('修改失败，请重试');
      });
  });

  // 退出登录（导航栏）
  document.getElementById('logoutNavBtn').addEventListener('click', function() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    switchTab('story', true);
  });

  // 汉堡菜单
  var hamburger = document.getElementById('hamburgerBtn');
  var navTabs = document.querySelector('.nav-tabs');

  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    navTabs.classList.toggle('open');
  });

  // 点击菜单项后关闭
  navTabs.addEventListener('click', function(e) {
    if (e.target.classList.contains('nav-tab')) {
      hamburger.classList.remove('active');
      navTabs.classList.remove('open');
    }
  });

  // 展开/收起长内容
  document.addEventListener('click', function(e) {
    var btn;
    if (e.target.classList.contains('post-expand-btn')) {
      btn = e.target;
    } else if (e.target.classList.contains('post-content') && e.target.classList.contains('expandable')) {
      btn = e.target.parentElement.querySelector('.post-expand-btn');
      if (!btn) return;
    } else {
      return;
    }
    var postContent = btn.parentElement.querySelector('.post-content');
    if (!postContent) return;
    var isCollapsed = postContent.classList.contains('collapsed');
    if (isCollapsed) {
      postContent.classList.remove('collapsed');
      btn.textContent = '收起';
    } else {
      postContent.classList.add('collapsed');
      btn.textContent = '展开';
    }
  });

  // === 专辑事件 ===
  elements.showCreateAlbumBtn.addEventListener('click', function() {
    var form = elements.createAlbumForm;
    if (form.style.display === 'none') {
      form.style.display = 'block';
      elements.albumName.focus();
    } else {
      form.style.display = 'none';
    }
  });

  elements.cancelAlbumBtn.addEventListener('click', function() {
    elements.createAlbumForm.style.display = 'none';
    elements.albumName.value = '';
    elements.albumDesc.value = '';
    elements.albumIsPublic.checked = true;
  });

  elements.submitAlbumBtn.addEventListener('click', submitAlbum);

  elements.albumName.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); submitAlbum(); }
  });

  elements.submitAlbumEntryBtn.addEventListener('click', addAlbumEntry);

  elements.albumEntryTitle.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); elements.albumEntryContent.focus(); }
  });

  elements.albumEntryContent.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addAlbumEntry(); }
  });

  elements.backToAlbumListBtn.addEventListener('click', backToAlbumList);

  // === 评论事件 ===
  elements.closeCommentPanelBtn.addEventListener('click', closeCommentPanel);
  elements.commentOverlay.addEventListener('click', closeCommentPanel);
  elements.floatingCollapseBtn.addEventListener('click', closeCommentPanel);

  elements.commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitComment();
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  var date = new Date(dateStr);
  var now = new Date();
  var diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// 用户管理
function loadUserList() {
  fetch(API_BASE + '/admin/users', {
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) {
      if (!res.ok) {
        return res.json().then(function(err) { throw new Error(err.error || '获取用户列表失败'); });
      }
      return res.json();
    })
    .then(function(data) {
      renderUserList(data.users);
    })
    .catch(function(error) {
      console.error('加载用户列表失败:', error);
      elements.userManageContent.innerHTML = '<p class="loading-text" style="color:var(--danger-color)">加载失败: ' + error.message + '</p>';
    });
}

function renderUserList(users) {
  if (users.length === 0) {
    elements.userManageContent.innerHTML = '<p class="loading-text">暂无用户</p>';
    return;
  }

  var currentUserId = state.user && state.user.id;
  var html = '<div style="margin-bottom:12px;color:var(--text-light);font-size:13px;">共 ' + users.length + ' 位用户（不能删除自己和其他管理员）</div>' +
    '<table class="user-table"><thead><tr>' +
    '<th>ID</th><th>用户名</th><th>角色</th><th>文章数</th><th>注册时间</th><th>操作</th>' +
    '</tr></thead><tbody>';

  users.forEach(function(user) {
    var isSelf = user.id === currentUserId;
    var isAdmin = user.role === 'admin';
    var canDel = !isSelf && !isAdmin;
    html += '<tr>' +
      '<td data-label="ID">' + user.id + '</td>' +
      '<td data-label="用户名">' + escapeHtml(user.username) + '</td>' +
      '<td data-label="角色"><span class="user-badge ' + (isAdmin ? 'user-badge-admin' : 'user-badge-user') + '">' + (isAdmin ? '管理员' : '用户') + '</span></td>' +
      '<td data-label="文章数">' + user.post_count + '</td>' +
      '<td data-label="注册时间">' + formatDate(user.created_at) + '</td>' +
      '<td data-label="操作">' + (canDel
        ? '<button class="delete-user-btn" onclick="deleteUser(' + user.id + ', \'' + escapeHtml(user.username) + '\')">删除用户</button>'
        : '<span style="color:var(--text-light);font-size:12px;">' + (isSelf ? '当前账号' : '不可删除') + '</span>') +
      '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  elements.userManageContent.innerHTML = html;
}

function deleteUser(id, username) {
  if (!confirm('确定要删除用户「' + username + '」及其所有内容吗？此操作不可撤销！')) return;

  fetch(API_BASE + '/admin/users/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        alert(data.message);
        loadUserList();
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除用户失败:', error);
      alert('删除失败，请重试');
    });
}

// ============================================================
//  专辑功能
// ============================================================

function loadAlbums(userId) {
  var params = 'page=' + state.albumPage + '&limit=12';
  if (userId) params += '&user_id=' + userId;

  var headers = {};
  if (state.token) {
    headers['Authorization'] = 'Bearer ' + state.token;
  }

  fetch(API_BASE + '/albums?' + params, { headers: headers })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!data.albums || !data.pagination) throw new Error('响应数据格式错误');
      renderAlbums(data.albums);
      renderPagination(data.pagination, elements.albumPagination);
      // Override pagination click behavior for albums
      elements.albumPagination.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var page = parseInt(this.textContent);
          if (isNaN(page)) {
            if (this.textContent.indexOf('上一页') !== -1) page = state.albumPage - 1;
            else if (this.textContent.indexOf('下一页') !== -1) page = state.albumPage + 1;
          }
          if (page && page > 0) {
            state.albumPage = page;
            loadAlbums();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    })
    .catch(function(error) {
      console.error('加载专辑失败:', error);
      elements.albumList.innerHTML = '<p class="empty-message">加载专辑失败，请刷新重试</p>';
    });
}

function renderAlbums(albums) {
  if (!albums || albums.length === 0) {
    elements.albumList.innerHTML = '<p class="empty-message">暂无专辑，快来创建一个吧！</p>';
    return;
  }

  elements.albumList.innerHTML = albums.map(function(a) {
    var isOwner = state.user && state.user.id === a.user_id;
    var isAdmin = state.user && state.user.role === 'admin';
    var badge = a.is_public
      ? '<span class="album-badge album-badge-public">公开</span>'
      : '<span class="album-badge album-badge-private">私密</span>';
    var desc = a.description ? '<p class="album-card-desc">' + escapeHtml(a.description) + '</p>' : '';
    var actions = '';
    if (isOwner || isAdmin) {
      actions = '<div class="album-card-actions">' +
        (isOwner ? '<button class="btn btn-sm" onclick="event.stopPropagation();editAlbumDialog(' + a.id + ')">编辑</button>' : '') +
        '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteAlbum(' + a.id + ')">删除</button>' +
        '</div>';
    }
    return '<div class="album-card" onclick="viewAlbum(' + a.id + ')">' +
      '<div class="album-card-name">' + escapeHtml(a.name) + badge + '</div>' +
      desc +
      '<div class="album-card-meta">' +
        '<span class="album-card-author">' + escapeHtml(a.username) + '</span>' +
        '<span class="album-card-count">' + a.entry_count + ' 篇</span>' +
      '</div>' +
      actions +
    '</div>';
  }).join('');
}

function submitAlbum() {
  var name = elements.albumName.value.trim();
  if (!name) { alert('请输入专辑名称'); return; }

  fetch(API_BASE + '/albums', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({
      name: name,
      description: elements.albumDesc.value.trim(),
      is_public: elements.albumIsPublic.checked
    })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        elements.createAlbumForm.style.display = 'none';
        elements.albumName.value = '';
        elements.albumDesc.value = '';
        elements.albumIsPublic.checked = true;
        state.albumPage = 1;
        loadAlbums();
        alert('专辑创建成功！');
      } else {
        alert(data.error || '创建失败');
      }
    })
    .catch(function(error) {
      console.error('创建专辑失败:', error);
      alert('创建失败，请重试');
    });
}

function editAlbumDialog(albumId) {
  fetch(API_BASE + '/albums/' + albumId, { headers: { 'Authorization': 'Bearer ' + state.token } })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var album = data.album;
      var newName = prompt('专辑名称:', album.name);
      if (!newName || !newName.trim()) return;
      var newDesc = prompt('专辑描述:', album.description || '');
      var pubChoice = confirm('是否公开此专辑？（确定=公开，取消=私密）');

      fetch(API_BASE + '/albums/' + albumId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.token
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: (newDesc || '').trim(),
          is_public: pubChoice
        })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.message) {
            loadAlbums();
            if (state.currentAlbumId === albumId) {
              viewAlbum(albumId);
            }
            alert('专辑更新成功！');
          } else {
            alert(data.error || '更新失败');
          }
        });
    })
    .catch(function(error) {
      console.error('编辑专辑失败:', error);
    });
}

function deleteAlbum(albumId) {
  if (!confirm('确定要删除这个专辑及其所有内容吗？此操作不可撤销！')) return;

  fetch(API_BASE + '/albums/' + albumId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        if (state.currentAlbumId === albumId) {
          backToAlbumList();
        }
        loadAlbums();
        alert('专辑已删除');
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除专辑失败:', error);
      alert('删除失败，请重试');
    });
}

function viewAlbum(albumId) {
  state.currentAlbumId = albumId;
  state.albumEntryPage = 1;

  var headers = {};
  if (state.token) {
    headers['Authorization'] = 'Bearer ' + state.token;
  }

  fetch(API_BASE + '/albums/' + albumId + '?page=1&limit=20', { headers: headers })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      state.currentAlbum = data.album;
      elements.albumListView.style.display = 'none';
      elements.albumDetailView.style.display = 'block';

      var isOwner = state.user && state.user.id === data.album.user_id;
      var pubBadge = data.album.is_public
        ? '<span class="album-badge album-badge-public">公开</span>'
        : '<span class="album-badge album-badge-private">私密</span>';

      elements.albumDetailInfo.innerHTML =
        '<div class="album-detail-name">' + escapeHtml(data.album.name) + pubBadge + '</div>' +
        (data.album.description ? '<div class="album-detail-desc">' + escapeHtml(data.album.description) + '</div>' : '') +
        '<div class="album-detail-meta">作者: ' + escapeHtml(data.album.username) + ' | ' + data.pagination.total + ' 篇内容</div>';

      elements.albumDetailActions.innerHTML = isOwner
        ? '<button class="btn btn-sm" onclick="editAlbumDialog(' + albumId + ')">编辑专辑</button>' +
          '<button class="btn btn-sm btn-danger" onclick="deleteAlbum(' + albumId + ')">删除专辑</button>'
        : '';

      elements.albumEntryForm.style.display = isOwner ? 'block' : 'none';

      renderAlbumEntries(data.entries);
      renderPagination(data.pagination, elements.albumEntryPagination);

      elements.albumEntryPagination.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var page = parseInt(this.textContent);
          if (isNaN(page)) {
            if (this.textContent.indexOf('上一页') !== -1) page = state.albumEntryPage - 1;
            else if (this.textContent.indexOf('下一页') !== -1) page = state.albumEntryPage + 1;
          }
          if (page && page > 0) {
            state.albumEntryPage = page;
            loadAlbumEntries(albumId, page);
          }
        });
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(function(error) {
      console.error('加载专辑详情失败:', error);
    });
}

function loadAlbumEntries(albumId, page) {
  var headers = {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

  fetch(API_BASE + '/albums/' + albumId + '?page=' + page + '&limit=20', { headers: headers })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      renderAlbumEntries(data.entries);
      renderPagination(data.pagination, elements.albumEntryPagination);
      state.albumEntryPage = page;
    });
}

function renderAlbumEntries(entries) {
  if (!entries || entries.length === 0) {
    elements.albumEntryList.innerHTML = '<p class="empty-message">暂无文章，开始写第一篇吧！</p>';
    return;
  }

  var isOwner = state.currentAlbum && state.user && state.user.id === state.currentAlbum.user_id;
  var isAdmin = state.user && state.user.role === 'admin';

  elements.albumEntryList.innerHTML = entries.map(function(entry) {
    var titleHtml = entry.title
      ? '<div class="album-entry-title">' + escapeHtml(entry.title) + '</div>'
      : '';
    var actions = '';
    if (isOwner || isAdmin) {
      actions = '<div class="album-entry-actions">' +
        (isOwner ? '<button class="album-entry-edit-btn" onclick="editAlbumEntry(' + entry.id + ')">编辑</button>' : '') +
        '<button class="album-entry-delete-btn" onclick="deleteAlbumEntry(' + entry.id + ')">删除</button>' +
        '</div>';
    }
    return '<div class="album-entry-item">' +
      titleHtml +
      '<div class="album-entry-content">' + escapeHtml(entry.content) + '</div>' +
      '<div class="album-entry-meta">' +
        '<span class="post-date">' + formatDate(entry.created_at) + '</span>' +
        actions +
      '</div>' +
    '</div>';
  }).join('');
}

function addAlbumEntry() {
  var title = elements.albumEntryTitle.value.trim();
  var content = elements.albumEntryContent.value.trim();
  if (!title) { alert('请输入文章标题'); return; }
  if (!content) { alert('内容不能为空'); return; }

  fetch(API_BASE + '/albums/' + state.currentAlbumId + '/entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({ title: title, content: content })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        elements.albumEntryTitle.value = '';
        elements.albumEntryContent.value = '';
        state.albumEntryPage = 1;
        loadAlbumEntries(state.currentAlbumId, 1);
      } else {
        alert(data.error || '添加失败');
      }
    })
    .catch(function(error) {
      console.error('添加文章失败:', error);
      alert('添加失败，请重试');
    });
}

function editAlbumEntry(entryId) {
  fetch(API_BASE + '/albums/' + state.currentAlbumId + '?limit=100', {
    headers: state.token ? { 'Authorization': 'Bearer ' + state.token } : {}
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var entry = data.entries.find(function(e) { return e.id === entryId; });
      if (!entry) return;

      document.getElementById('editAlbumEntryTitle').value = entry.title || '';
      document.getElementById('editAlbumEntryContent').value = entry.content;
      document.getElementById('editAlbumEntryModal').dataset.entryId = entryId;
      document.getElementById('editAlbumEntryModal').classList.add('show');
    });
}

function deleteAlbumEntry(entryId) {
  if (!confirm('确定要删除这条内容吗？')) return;

  fetch(API_BASE + '/albums/entries/' + entryId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        loadAlbumEntries(state.currentAlbumId, state.albumEntryPage);
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除内容失败:', error);
      alert('删除失败，请重试');
    });
}

function backToAlbumList() {
  state.currentAlbumId = null;
  state.currentAlbum = null;
  elements.albumListView.style.display = 'block';
  elements.albumDetailView.style.display = 'none';
  loadAlbums();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
//  管理员专辑管理
// ============================================================

function loadAdminAlbums() {
  fetch(API_BASE + '/admin/albums', {
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      renderAdminAlbums(data.albums);
    })
    .catch(function(error) {
      console.error('加载所有专辑失败:', error);
      elements.adminAlbumList.innerHTML = '<p class="loading-text" style="color:var(--danger-color)">加载失败</p>';
    });
}

function renderAdminAlbums(albums) {
  if (!albums || albums.length === 0) {
    elements.adminAlbumList.innerHTML = '<p class="empty-message">暂无专辑</p>';
    return;
  }

  elements.adminAlbumList.innerHTML = albums.map(function(a) {
    var pubBadge = a.is_public
      ? '<span class="album-badge album-badge-public">公开</span>'
      : '<span class="album-badge album-badge-private">私密</span>';
    return '<div class="admin-album-item" data-album-id="' + a.id + '">' +
      '<div class="admin-album-header" onclick="toggleAdminAlbumEntries(' + a.id + ')">' +
        '<span class="admin-album-name">' + escapeHtml(a.name) + pubBadge + '</span>' +
        '<span class="admin-album-author">' + escapeHtml(a.username) + '</span>' +
      '</div>' +
      '<div class="admin-album-meta">' + a.entry_count + ' 篇 | 更新于 ' + formatDate(a.updated_at) + '</div>' +
      '<div class="admin-album-entries" id="adminAlbumEntries-' + a.id + '" style="display:none;"></div>' +
    '</div>';
  }).join('');
}

function toggleAdminAlbumEntries(albumId) {
  var container = document.getElementById('adminAlbumEntries-' + albumId);
  if (!container) return;

  if (container.style.display === 'none') {
    container.style.display = 'block';
    container.innerHTML = '<p class="loading-text">加载中...</p>';

    fetch(API_BASE + '/admin/albums/' + albumId + '/entries', {
      headers: { 'Authorization': 'Bearer ' + state.token }
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.entries.length === 0) {
          container.innerHTML = '<p class="loading-text">暂无内容</p>';
        } else {
          container.innerHTML = data.entries.map(function(e) {
            var titleHtml = e.title ? '<div class="admin-album-entry-title">' + escapeHtml(e.title) + '</div>' : '';
            return '<div class="admin-album-entry">' +
              titleHtml +
              '<div>' + escapeHtml(e.content) + '</div>' +
              '<div class="admin-album-entry-date">' + formatDate(e.created_at) + '</div>' +
              '</div>';
          }).join('');
        }
      })
      .catch(function(error) {
        container.innerHTML = '<p class="loading-text" style="color:var(--danger-color)">加载失败</p>';
      });
  } else {
    container.style.display = 'none';
  }
}

// ============================================================
//  评论功能
// ============================================================

function openCommentPanel(postId) {
  if (!state.token) {
    alert('请先登录');
    elements.loginModal.classList.add('show');
    return;
  }

  state.currentCommentPostId = postId;
  state.commentPage = 1;

  elements.commentOverlay.classList.add('show');
  elements.commentPanel.classList.add('show');
  elements.floatingCollapseBtn.style.display = 'block';
  document.body.style.overflow = 'hidden';

  loadComments(postId, 1);
}

function closeCommentPanel() {
  elements.commentOverlay.classList.remove('show');
  elements.commentPanel.classList.remove('show');
  elements.floatingCollapseBtn.style.display = 'none';
  document.body.style.overflow = '';
  state.currentCommentPostId = null;
}

function loadComments(postId, page) {
  fetch(API_BASE + '/comments/post/' + postId + '?page=' + page + '&limit=20')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      renderComments(data.comments);
      renderPagination(data.pagination, elements.commentPagination);

      elements.commentPagination.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var p = parseInt(this.textContent);
          if (isNaN(p)) {
            if (this.textContent.indexOf('上一页') !== -1) p = state.commentPage - 1;
            else if (this.textContent.indexOf('下一页') !== -1) p = state.commentPage + 1;
          }
          if (p && p > 0) {
            state.commentPage = p;
            loadComments(postId, p);
          }
        });
      });
    })
    .catch(function(error) {
      console.error('加载评论失败:', error);
    });
}

function renderComments(comments) {
  if (!comments || comments.length === 0) {
    elements.commentList.innerHTML = '<p class="empty-message">暂无评论，快来发表第一条吧！</p>';
    return;
  }

  var isAdmin = state.user && state.user.role === 'admin';

  elements.commentList.innerHTML = comments.map(function(c) {
    var canDel = (state.user && state.user.id === c.user_id) || isAdmin;
    return '<div class="comment-item">' +
      '<div class="comment-item-header">' +
        '<span class="comment-author">' + escapeHtml(c.username) + '</span>' +
        '<span class="comment-date">' + formatDate(c.created_at) + '</span>' +
      '</div>' +
      '<div class="comment-content">' + escapeHtml(c.content) + '</div>' +
      (canDel ? '<button class="comment-delete-btn" onclick="deleteComment(' + c.id + ')" title="删除">&times;</button>' : '') +
    '</div>';
  }).join('');

  elements.commentList.scrollTop = elements.commentList.scrollHeight;
}

function submitComment() {
  var content = elements.commentContent.value.trim();
  if (!content) { alert('评论内容不能为空'); return; }

  fetch(API_BASE + '/comments/post/' + state.currentCommentPostId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({ content: content })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        elements.commentContent.value = '';
        state.commentPage = 1;
        loadComments(state.currentCommentPostId, 1);
      } else {
        alert(data.error || '评论失败');
      }
    })
    .catch(function(error) {
      console.error('评论失败:', error);
      alert('评论失败，请重试');
    });
}

function deleteComment(commentId) {
  if (!confirm('确定要删除这条评论吗？')) return;

  fetch(API_BASE + '/comments/' + commentId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + state.token }
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        loadComments(state.currentCommentPostId, state.commentPage);
      } else {
        alert(data.error || '删除失败');
      }
    })
    .catch(function(error) {
      console.error('删除评论失败:', error);
      alert('删除失败，请重试');
    });
}

document.addEventListener('DOMContentLoaded', init);
