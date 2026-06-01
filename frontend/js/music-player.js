/**
 * StoryShare — 网易云音乐播放器
 * 通过网易云官方外链 iframe 嵌入歌单或单曲
 */

(function () {
  'use strict';

  var DEFAULT_TYPE = '0';  // 0=歌单, 2=单曲
  var DEFAULT_ID = '14118396881';  // 默认歌单 ID

  var els = {};

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    els.toggleBtn = $('musicToggleBtn');
    els.panel = $('musicPanel');
    els.closeBtn = $('musicPanelCloseBtn');
    els.typeSelect = $('musicType');
    els.idInput = $('musicIdInput');
    els.loadBtn = $('musicLoadBtn');
    els.iframeWrapper = $('musicIframeWrapper');
  }

  function loadPlayer(type, id) {
    if (!els.iframeWrapper) return;

    if (!id) {
      els.iframeWrapper.innerHTML = '<p class="empty-message">请输入歌单或歌曲 ID 后点击"加载"</p>';
      return;
    }

    var height = type === '0' ? 430 : 66;
    var auto = type === '0' ? 0 : 0;

    els.iframeWrapper.innerHTML =
      '<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" ' +
      'width="100%" height="' + height + '" ' +
      'src="https://music.163.com/outchain/player?type=' + type +
      '&id=' + id + '&auto=' + auto + '&height=' + height + '">' +
      '</iframe>';

    // Save last used config
    try {
      localStorage.setItem('musicType', type);
      localStorage.setItem('musicId', id);
    } catch (e) {}
  }

  function openPanel() {
    els.panel.classList.add('show');
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

    // Restore last config
    var savedType = localStorage.getItem('musicType') || DEFAULT_TYPE;
    var savedId = localStorage.getItem('musicId') || DEFAULT_ID;

    if (els.typeSelect) els.typeSelect.value = savedType;
    if (els.idInput) els.idInput.value = savedId;

    // Auto-load default playlist on init
    loadPlayer(savedType, savedId);

    // Events
    els.toggleBtn.addEventListener('click', togglePanel);
    els.closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel();
    });

    els.loadBtn.addEventListener('click', function () {
      var type = els.typeSelect.value;
      var id = els.idInput.value.trim();
      loadPlayer(type, id);
    });

    els.idInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var type = els.typeSelect.value;
        var id = els.idInput.value.trim();
        loadPlayer(type, id);
      }
    });

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
