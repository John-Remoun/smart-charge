const DeviceCommand = require('../models/DeviceCommand');

const VALID_SLUGS = ['phone', 'powerbank', 'station'];

async function enqueueCommand(slug, action, payload = {}) {
  if (!VALID_SLUGS.includes(slug)) throw new Error('Invalid device slug');
  return DeviceCommand.create({ slug, action, payload });
}

module.exports = { enqueueCommand, VALID_SLUGS };
