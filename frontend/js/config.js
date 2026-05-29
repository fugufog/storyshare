window.API_BASE_URL = (function () {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return '';
  }
  return 'https://api.fugufog.top';
})();

window.API_BASE = window.API_BASE_URL + '/api';