/**
 * StoryShare — 网易云音乐播放器
 * 通过网易云官方外链 iframe 嵌入歌单或单曲
 * 仅管理员可修改音乐配置
 */

(function () {
  'use strict';

  var DEFAULT_TYPE = '0';  // 0=歌单, 2=单曲
  var DEFAULT_ID = '2233842197';  // 默认歌单 ID

  var els = {};

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

  function saveConfig(type, id) {
    if (!isAdmin()) return;
    try {
      localStorage.setItem('musicType', type);
      localStorage.setItem('musicId', id);
    } catch (e) {}
  }

  function openPanel() {
    els.panel.classList.add('show');
    // 每次打开时检查权限
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

    // 始终显示播放器按钮（所有用户都能听）
    els.toggleBtn.style.display = '';

    // 仅管理员可修改配置
    var admin = isAdmin();
    if (els.configEl) {
      els.configEl.style.display = admin ? '' : 'none';
    }

    // 加载已保存的配置，否则用默认
    var savedType = admin ? localStorage.getItem('musicType') : null;
    var savedId = admin ? localStorage.getItem('musicId') : null;
    var type = savedType || DEFAULT_TYPE;
    var id = savedId || DEFAULT_ID;

    if (els.typeSelect) els.typeSelect.value = type;
    if (els.idInput) els.idInput.value = id;

    loadPlayer(type, id);

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
        loadPlayer(t, i);
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
          loadPlayer(t, i);
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
