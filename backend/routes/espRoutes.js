const express = require('express');
const {
  createSession,
  getStatus,
  closePowerbank,
  nodeSync,
  nodeAck,
  controlDevice
} = require('../controllers/espController');
const { protect, superadmin } = require('../middleware/auth');
const { espNodeAuth } = require('../middleware/espAuth');
const router = express.Router();

router.post('/session', protect, createSession);
router.get('/status', getStatus);

/** Website -> queue command for ESP32 */
router.post('/control/:slug', protect, controlDevice);

router.post('/close-powerbank', protect, superadmin, closePowerbank);

/** ESP32 nodes: use X-Esp-Token header matching .env ESP_TOKEN_PHONE or ESP_TOKEN_POWERBANK */
router.post('/nodes/:slug/sync', espNodeAuth, nodeSync);
router.post('/nodes/:slug/ack', espNodeAuth, nodeAck);

module.exports = router;
