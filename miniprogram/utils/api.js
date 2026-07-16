function request(options) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const token = app.globalData.token;
    const header = {
      'Content-Type': 'application/json'
    };
    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }

    wx.request({
      url: app.globalData.API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      timeout: 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const err = (res.data && res.data.error) ? res.data.error : '请求失败(' + res.statusCode + ')';
          reject(new Error(err));
        }
      },
      fail(err) {
        if (err.errMsg && err.errMsg.indexOf('timeout') > -1) {
          reject(new Error('请求超时，请检查网络连接'));
        } else {
          reject(new Error('网络错误：' + (err.errMsg || '请检查服务器域名是否已配置')));
        }
      }
    });
  });
}

// Auth
function login(username, password) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data: { username, password }
  });
}

function register(username, password) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data: { username, password }
  });
}

function changePassword(oldPassword, newPassword) {
  return request({
    url: '/auth/password',
    method: 'PUT',
    data: { oldPassword, newPassword }
  });
}

function changeNickname(nickname) {
  return request({
    url: '/auth/nickname',
    method: 'PUT',
    data: { nickname }
  });
}

// Posts
function getPosts(params) {
  const query = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .map(k => k + '=' + encodeURIComponent(params[k]))
    .join('&');
  return request({
    url: '/posts?' + query
  });
}

function createPost(content, category, theme) {
  return request({
    url: '/posts',
    method: 'POST',
    data: { content, category, theme }
  });
}

function updatePost(id, content, category, theme) {
  return request({
    url: '/posts/' + id,
    method: 'PUT',
    data: { content, category, theme }
  });
}

function deletePost(id) {
  return request({
    url: '/posts/' + id,
    method: 'DELETE'
  });
}

// Announcements
function getAnnouncements() {
  return request({
    url: '/announcements'
  });
}

function createAnnouncement(theme) {
  return request({
    url: '/announcements',
    method: 'POST',
    data: { theme }
  });
}

function deleteAnnouncement(id) {
  return request({
    url: '/announcements/' + id,
    method: 'DELETE'
  });
}

// Admin
function getUsers() {
  return request({
    url: '/admin/users'
  });
}

function deleteUser(id) {
  return request({
    url: '/admin/users/' + id,
    method: 'DELETE'
  });
}

function resetPassword(id, newPassword) {
  return request({
    url: '/admin/users/' + id + '/reset-password',
    method: 'PUT',
    data: { newPassword }
  });
}

module.exports = {
  login,
  register,
  changePassword,
  changeNickname,
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getUsers,
  resetPassword,
  deleteUser
};
