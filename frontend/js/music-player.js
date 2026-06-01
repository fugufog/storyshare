/**
 * StoryShare — 网易云音乐播放器（服务端同步）
 * 所有用户看到同一歌单，仅管理员可修改
 */

(function () {
  'use strict';

  var DEFAULT_TYPE = '0';
  var DEFAULT_ID = '2233842197';
  var API_BASE = window.API_BASE || '/api';

  var els = {};
  var currentType = DEFAULT_TYPE;
  var currentId = DEFAULT_ID;

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    els.toggleBtn = $('musicToggleBtn');
    els.panel = $('musicPanel');
    els.closeBtn = $('musicPanelCloseBtn');
    els.configEl = $('musicConfig');
    els.typeSelect = $('musicType');
    els.idInput = $('musicIdInput');
    els.loadBtn = $('musicLoadBtn');
    els.iframeWrapper = $('musicIframeWrapper');
  }

  function isAdmin() {
    try {
      var user = JSON.parse(localStorage.getItem('user') || 'null');
      return user && user.role === 'admin';
    } catch (e) {
      return false;
    }
  }

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function fetchConfig() {
    return fetch(API_BASE + '/music')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        currentType = data.music_type || DEFAULT_TYPE;
        currentId = data.music_id || DEFAULT_ID;
        if (els.typeSelect) els.typeSelect.value = currentType;
        if (els.idInput) els.idInput.value = currentId;
        loadPlayer(currentType, currentId);
      })
      .catch(function () {
        // 网络错误时使用默认值
        if (els.typeSelect) els.typeSelect.value = DEFAULT_TYPE;
        if (els.idInput) els.idInput.value = DEFAULT_ID;
        loadPlayer(DEFAULT_TYPE, DEFAULT_ID);
      });
  }

  function saveConfig(type, id) {
    if (!isAdmin()) return;
    fetch(API_BASE + '/music', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({ music_type: type, music_id: id })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.message) {
          currentType = type;
          currentId = id;
          loadPlayer(type, id);
        }
      })
      .catch(function (err) {
        console.error('保存音乐配置失败:', err);
      });
  }

  function loadPlayer(type, id) {
    if (!els.iframeWrapper) return;

    if (!id) {
      els.iframeWrapper.innerHTML = '<p class="empty-message">暂无音乐</p>';
      return;
    }

    var height = type === '0' ? 430 : 66;

    els.iframeWrapper.innerHTML =
      '<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" ' +
      'width="100%" height="' + height + '" ' +
      'src="https://music.163.com/outchain/player?type=' + type +
      '&id=' + id + '&auto=0&height=' + height + '">' +
      '</iframe>';
  }

  function openPanel() {
    els.panel.classList.add('show');
    if (els.configEl) {
      els.configEl.style.display = isAdmin() ? '' : 'none';
    }
  }

  function closePanel() {
    els.panel.classList.remove('show');
  }

  function togglePanel() {
    if (els.panel.classList.contains('show')) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function init() {
    cacheDom();
    if (!els.toggleBtn) return;

    // 从服务端拉取配置
    fetchConfig();

    // Events
    els.toggleBtn.addEventListener('click', togglePanel);
    els.closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel();
    });

    if (els.loadBtn) {
      els.loadBtn.addEventListener('click', function () {
        if (!isAdmin()) return;
        var t = els.typeSelect.value;
        var i = els.idInput.value.trim();
        saveConfig(t, i);
      });
    }

    if (els.idInput) {
      els.idInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!isAdmin()) return;
          var t = els.typeSelect.value;
          var i = els.idInput.value.trim();
          saveConfig(t, i);
        }
      });
    }

    // Click outside to close
    document.addEventListener('click', function (e) {
      if (els.panel.classList.contains('show') &&
          !els.panel.contains(e.target) &&
          e.target !== els.toggleBtn &&
          !els.toggleBtn.contains(e.target)) {
        closePanel();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
