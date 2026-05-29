var API_BASE = window.API_BASE || '/api';

const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  activeTab: 'story',
  storyPage: 1,
  quotePage: 1,
  postsPerPage: 5,
  filter: {
    theme: '',
    dateFrom: '',
    dateTo: '',
    username: ''
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
  applyFilterBtn: document.getElementById('applyFilterBtn'),
  resetFilterBtn: document.getElementById('resetFilterBtn')
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
  elements.profileSection.style.display = tab === 'profile' ? 'block' : 'none';
  elements.usersSection.style.display = tab === 'users' ? 'block' : 'none';

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
    var themeTag = post.theme ? '<span class="post-theme-tag">' + escapeHtml(post.theme) + '</span>' : '';
    return '<div class="post-item" data-id="' + post.id + '">' +
      '<p class="post-content">' + escapeHtml(post.content) + '</p>' +
      '<div class="post-meta">' +
        '<span>' +
          '<span class="post-author">' + escapeHtml(post.username) + '</span> ' +
          themeTag + ' ' +
          '<span class="post-date">' + formatDate(post.created_at) + '</span>' +
        '</span>' +
        '<span class="post-actions">' +
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
    state.storyPage = 1;
    state.quotePage = 1;
    loadPosts();
  });

  elements.resetFilterBtn.addEventListener('click', function() {
    state.filter.theme = '';
    state.filter.dateFrom = '';
    state.filter.dateTo = '';
    state.filter.username = '';
    elements.filterTheme.value = '';
    elements.filterDateFrom.value = '';
    elements.filterDateTo.value = '';
    elements.filterUsername.value = '';
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

  // 退出登录（个人中心内联）
  document.getElementById('logoutBtn').addEventListener('click', function() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    switchTab('story', true);
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
      '<td>' + user.id + '</td>' +
      '<td>' + escapeHtml(user.username) + '</td>' +
      '<td><span class="user-badge ' + (isAdmin ? 'user-badge-admin' : 'user-badge-user') + '">' + (isAdmin ? '管理员' : '用户') + '</span></td>' +
      '<td>' + user.post_count + '</td>' +
      '<td>' + formatDate(user.created_at) + '</td>' +
      '<td>' + (canDel
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

document.addEventListener('DOMContentLoaded', init);
