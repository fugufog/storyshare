const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const versionData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8')
    );
    res.json(versionData);
  } catch (error) {
    res.status(500).json({ error: '获取版本信息失败' });
  }
});

module.exports = router;
