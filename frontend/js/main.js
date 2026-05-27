

// 状态管理
const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  currentPage: 1,
  postsPerPage: 5
};

// DOM 元素
const elements = {
  userInfo: document.getElementById('userInfo'),
  username: document.getElementById('username'),
  authButtons: document.getElementById('authButtons'),
  publishSection: document.getElementById('publishSection'),
  adminSection: document.getElementById('adminSection'),
  storyList: document.getElementById('storyList'),
  quoteList: document.getElementById('quoteList'),
  pagination: document.getElementById('pagination'),
  loginModal: document.getElementById('loginModal'),
  registerModal: document.getElementById('registerModal'),
  userManageModal: document.getElementById('userManageModal'),
  userManageContent: document.getElementById('userManageContent'),
  changePasswordModal: document.getElementById('changePasswordModal'),
  changeNicknameModal: document.getElementById('changeNicknameModal'),
  profileMenu: document.getElementById('profileMenu'),
  publishForm: document.getElementById('publishForm'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  changePasswordForm: document.getElementById('changePasswordForm'),
  changeNicknameForm: document.getElementById('changeNicknameForm')
};

// 初始化
function init() {
  updateAuthUI();
  loadPosts();
  bindEvents();
}

// 更新认证 UI
function updateAuthUI() {
  if (state.token && state.user) {
    elements.userInfo.style.display = 'flex';
    elements.authButtons.style.display = 'none';
    elements.publishSection.style.display = 'block';
    // 显示昵称，如果没有昵称则显示用户名
    elements.username.textContent = state.user.nickname || state.user.username;

    // 管理员功能
    if (state.user.role === 'admin') {
      elements.adminSection.style.display = 'block';
    } else {
      elements.adminSection.style.display = 'none';
    }
  } else {
    elements.userInfo.style.display = 'none';
    elements.authButtons.style.display = 'flex';
    elements.publishSection.style.display = 'none';
    elements.adminSection.style.display = 'none';
  }
}

// 加载文章
async function loadPosts() {
  try {
    // 加载故事
    const storyRes = await fetch(`${API_BASE}/posts?category=story&page=${state.currentPage}&limit=${state.postsPerPage}`);
    const storyData = await storyRes.json();
    renderPosts(storyData.posts, elements.storyList, 'story');

    // 加载短句
    const quoteRes = await fetch(`${API_BASE}/posts?category=quote&page=${state.currentPage}&limit=${state.postsPerPage}`);
    const quoteData = await quoteRes.json();
    renderPosts(quoteData.posts, elements.quoteList, 'quote');

    // 渲染分页（使用故事的总数）
    renderPagination(storyData.pagination);
  } catch (error) {
    console.error('加载文章失败:', error);
  }
}

// 渲染文章列表
function renderPosts(posts, container, category) {
  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-message">暂无内容，快来发布第一条吧！</p>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const isOwner = state.user && state.user.id === post.user_id;
    return `
    <div class="post-item" data-id="${post.id}">
      <p class="post-content">${escapeHtml(post.content)}</p>
      <div class="post-meta">
        <span>
          <span class="post-author">${escapeHtml(post.username)}</span>
          <span class="post-date">${formatDate(post.created_at)}</span>
        </span>
        <span class="post-actions">
          ${isOwner ? `<button class="post-edit" onclick="editPost(${post.id})">编辑</button>` : ''}
          ${canDelete(post) ? `<button class="post-delete" onclick="deletePost(${post.id})">删除</button>` : ''}
        </span>
      </div>
    </div>
  `}).join('');
}

// 渲染分页
function renderPagination(pagination) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    elements.pagination.innerHTML = '';
    return;
  }

  let html = `
    <button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">上一页</button>
    <span class="page-info">第 ${page} / ${totalPages} 页</span>
    <button ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">下一页</button>
  `;

  elements.pagination.innerHTML = html;
}

// 翻页
function goToPage(page) {
  state.currentPage = page;
  loadPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 检查是否可以删除
function canDelete(post) {
  if (!state.user) return false;
  return state.user.role === 'admin' || state.user.id === post.user_id;
}

// 删除文章
async function deletePost(id) {
  if (!confirm('确定要删除这条内容吗？')) return;

  try {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    const data = await res.json();

    if (res.ok) {
      alert('删除成功');
      loadPosts();
    } else {
      alert(data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    alert('删除失败，请重试');
  }
}

// 编辑文章 - 打开编辑模态框
function editPost(id) {
  const postItem = document.querySelector(`.post-item[data-id="${id}"]`);
  if (!postItem) return;

  const content = postItem.querySelector('.post-content').textContent;

  // 获取文章分类（根据它所在的列表容器）
  const container = postItem.closest('.post-list');
  let category = 'story';
  if (container && container.id === 'quoteList') {
    category = 'quote';
  }

  document.getElementById('editPostContent').value = content;
  document.getElementById('editPostCategory').value = category;
  document.getElementById('editPostModal').dataset.postId = id;
  document.getElementById('editPostModal').classList.add('show');
}

// 绑定事件
function bindEvents() {
  // 编辑文章表单
  const editForm = document.getElementById('editPostForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const postId = parseInt(document.getElementById('editPostModal').dataset.postId);
      const content = document.getElementById('editPostContent').value;
      const category = document.getElementById('editPostCategory').value;

      if (!content.trim()) {
        alert('内容不能为空');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({ content, category })
        });

        const data = await res.json();

        if (res.ok) {
          document.getElementById('editPostModal').classList.remove('show');
          editForm.reset();
          loadPosts();
          alert('编辑成功！');
        } else {
          alert(data.error || '编辑失败');
        }
      } catch (error) {
        console.error('编辑失败:', error);
        alert('编辑失败，请重试');
      }
    });
  }

  // 关闭编辑模态框
  const editModal = document.getElementById('editPostModal');
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        editModal.classList.remove('show');
      }
    });
  }

  // 显示登录模态框
  document.getElementById('showLoginBtn').addEventListener('click', () => {
    elements.loginModal.classList.add('show');
  });

  // 显示注册模态框
  document.getElementById('showRegisterBtn').addEventListener('click', () => {
    elements.registerModal.classList.add('show');
  });

  // 关闭模态框
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('show');
    });
  });

  // 点击模态框外部关闭
  [elements.loginModal, elements.registerModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });

  // 切换到注册
  document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    elements.loginModal.classList.remove('show');
    elements.registerModal.classList.add('show');
  });

  // 切换到登录
  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    elements.registerModal.classList.remove('show');
    elements.loginModal.classList.add('show');
  });

  // 登录表单
  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        elements.loginModal.classList.remove('show');
        elements.loginForm.reset();
        updateAuthUI();
        alert('登录成功！');
      } else {
        alert(data.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请重试');
    }
  });

  // 注册表单
  elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        elements.registerModal.classList.remove('show');
        elements.registerForm.reset();
        alert('注册成功！请登录');
        elements.loginModal.classList.add('show');
      } else {
        alert(data.error || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      alert('注册失败，请重试');
    }
  });

  // 发布表单
  elements.publishForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;

    if (!content.trim()) {
      alert('内容不能为空');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ content, category })
      });

      const data = await res.json();

      if (res.ok) {
        elements.publishForm.reset();
        state.currentPage = 1;
        loadPosts();
        alert('发布成功！');
      } else {
        alert(data.error || '发布失败');
      }
    } catch (error) {
      console.error('发布失败:', error);
      alert('发布失败，请重试');
    }
  });
  // 个人设置下拉菜单
  document.getElementById('profileToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    elements.profileMenu.classList.toggle('show');
  });

  // 点击其他地方关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-dropdown')) {
      elements.profileMenu.classList.remove('show');
    }
  });

  // 显示修改密码模态框
  document.getElementById('showChangePasswordBtn').addEventListener('click', () => {
    elements.profileMenu.classList.remove('show');
    elements.changePasswordModal.classList.add('show');
  });

  // 显示修改昵称模态框
  document.getElementById('showChangeNicknameBtn').addEventListener('click', () => {
    elements.profileMenu.classList.remove('show');
    elements.changeNicknameModal.classList.add('show');
  });

  // 关闭修改密码模态框
  elements.changePasswordModal.addEventListener('click', (e) => {
    if (e.target === elements.changePasswordModal) {
      elements.changePasswordModal.classList.remove('show');
    }
  });

  // 关闭修改昵称模态框
  elements.changeNicknameModal.addEventListener('click', (e) => {
    if (e.target === elements.changeNicknameModal) {
      elements.changeNicknameModal.classList.remove('show');
    }
  });

  // 修改密码表单
  elements.changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!oldPassword || !newPassword) {
      alert('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      alert('新密码至少6个字符');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        alert('密码修改成功！请重新登录。');
        elements.changePasswordForm.reset();
        elements.changePasswordModal.classList.remove('show');
        // 强制重新登录
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        updateAuthUI();
        loadPosts();
      } else {
        alert(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      alert('修改失败，请重试');
    }
  });

  // 修改昵称表单
  elements.changeNicknameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nickname = document.getElementById('newNickname').value;

    if (!nickname) {
      alert('请输入新昵称');
      return;
    }

    if (nickname.length < 1 || nickname.length > 20) {
      alert('昵称长度需在1-20个字符之间');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/nickname`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ nickname })
      });

      const data = await res.json();

      if (res.ok) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        elements.changeNicknameForm.reset();
        elements.changeNicknameModal.classList.remove('show');
        updateAuthUI();
        alert('昵称修改成功！');
        loadPosts(); // 刷新文章列表以显示新昵称
      } else {
        alert(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改昵称失败:', error);
      alert('修改失败，请重试');
    }
  });

  // 退出登录
  document.getElementById('logoutBtn').addEventListener('click', () => {
    elements.profileMenu.classList.remove('show');
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    loadPosts();
  });

  // 显示用户管理
  document.getElementById('showUserManageBtn').addEventListener('click', () => {
    elements.userManageModal.classList.add('show');
    loadUserList();
  });

  // 关闭用户管理模态框
  elements.userManageModal.addEventListener('click', (e) => {
    if (e.target === elements.userManageModal) {
      elements.userManageModal.classList.remove('show');
    }
  });

  // 导出 Excel
  document.getElementById('exportBtn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/export`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyshare_export_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  });
}

// 工具函数：转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 工具函数：格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 用户管理功能
// 加载用户列表
async function loadUserList() {
  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '获取用户列表失败');
    }

    const data = await res.json();
    renderUserList(data.users);
  } catch (error) {
    console.error('加载用户列表失败:', error);
    elements.userManageContent.innerHTML = `<p class="loading-text" style="color:var(--danger-color)">加载失败: ${error.message}</p>`;
  }
}

// 渲染用户列表
function renderUserList(users) {
  if (users.length === 0) {
    elements.userManageContent.innerHTML = '<p class="loading-text">暂无用户</p>';
    return;
  }

  const currentUserId = state.user?.id;

  let html = `
    <div style="margin-bottom:12px;color:var(--text-light);font-size:13px;">
      共 ${users.length} 位用户（不能删除自己和其他管理员）
    </div>
    <table class="user-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>角色</th>
          <th>文章数</th>
          <th>注册时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  users.forEach(user => {
    const isSelf = user.id === currentUserId;
    const isAdmin = user.role === 'admin';
    const canDelete = !isSelf && !isAdmin;

    html += `
      <tr>
        <td>${user.id}</td>
        <td>${escapeHtml(user.username)}</td>
        <td><span class="user-badge ${isAdmin ? 'user-badge-admin' : 'user-badge-user'}">${isAdmin ? '管理员' : '用户'}</span></td>
        <td>${user.post_count}</td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          ${canDelete
        ? `<button class="delete-user-btn" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')">删除用户</button>`
        : `<span style="color:var(--text-light);font-size:12px;">${isSelf ? '当前账号' : '不可删除'}</span>`
      }
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  elements.userManageContent.innerHTML = html;
}

// 删除用户
async function deleteUser(id, username) {
  if (!confirm(`确定要删除用户「${username}」及其所有内容吗？此操作不可撤销！`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || `用户 ${username} 已删除`);
      loadUserList();
      loadPosts();
    } else {
      alert(data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    alert('删除失败，请重试');
  }
}

// 关闭用户管理模态框
function closeUserManageModal() {
  elements.userManageModal.classList.remove('show');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
