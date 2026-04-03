const ESPSession = require('../models/ESPSession');
const DeviceTelemetry = require('../models/DeviceTelemetry');
const DeviceCommand = require('../models/DeviceCommand');
const { enqueueCommand } = require('../services/deviceQueue');

const SLUGS_DUAL = ['phone', 'powerbank'];
const CONTROL_SLUGS = ['phone', 'powerbank', 'station'];
const WEB_CONTROL_ACTIONS = ['door_open', 'door_close', 'relay_on', 'relay_off'];

async function ensureTelemetryDocs() {
  for (const slug of SLUGS_DUAL) {
    await DeviceTelemetry.updateOne(
      { slug },
      { $setOnInsert: { slug, lastSeen: new Date(0) } },
      { upsert: true }
    );
  }
  await DeviceTelemetry.updateOne(
    { slug: 'station' },
    { $setOnInsert: { slug: 'station', lastSeen: new Date(0) } },
    { upsert: true }
  );
}

function isOnline(doc, staleMs = 35000) {
  return doc && Date.now() - new Date(doc.lastSeen).getTime() < staleMs;
}

exports.createSession = async (req, res) => {
  try {
    const { type, minutes } = req.body;
    const amount = minutes * 1;
    const session = await ESPSession.create({
      type,
      userId: req.user?._id,
      minutes,
      amount,
      status: 'pending'
    });
    res.json({ success: true, sessionId: session._id, session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStatus = async (_req, res) => {
  try {
    await ensureTelemetryDocs();
    const station = await DeviceTelemetry.findOne({ slug: 'station' }).lean();

    if (isOnline(station)) {
      return res.json({
        phoneActive: !!station.phoneActive,
        phoneTimeLeft: station.phoneTimeLeftSec ?? 0,
        powerbankActive: !!station.powerbankActive,
        powerbankTimeLeft: station.powerbankTimeLeftSec ?? 0,
        phoneDoorOpen: !!station.phoneDoorOpen,
        powerbankDoorOpen: !!station.powerbankDoorOpen,
        relayActive: !!station.relayActive,
        phoneOnline: true,
        powerbankOnline: true,
        stationMode: true
      });
    }

    const phone = await DeviceTelemetry.findOne({ slug: 'phone' }).lean();
    const powerbank = await DeviceTelemetry.findOne({ slug: 'powerbank' }).lean();

    res.json({
      phoneActive: !!phone?.active,
      phoneTimeLeft: phone?.timeLeftSec ?? 0,
      powerbankActive: !!powerbank?.active,
      powerbankTimeLeft: powerbank?.timeLeftSec ?? 0,
      phoneDoorOpen: !!phone?.doorOpen,
      powerbankDoorOpen: !!powerbank?.doorOpen,
      relayActive: !!phone?.relayActive,
      phoneOnline: isOnline(phone),
      powerbankOnline: isOnline(powerbank),
      stationMode: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.nodeSync = async (req, res) => {
  try {
    const { slug } = req.params;

    if (slug === 'station') {
      const b = req.body;
      await DeviceTelemetry.findOneAndUpdate(
        { slug: 'station' },
        {
          $set: {
            phoneDoorOpen: !!b.phoneDoorOpen,
            powerbankDoorOpen: !!b.powerbankDoorOpen,
            relayActive: !!b.relayActive,
            phoneTimeLeftSec: Number(b.phoneTimeLeftSec) || 0,
            powerbankTimeLeftSec: Number(b.powerbankTimeLeftSec) || 0,
            phoneActive: !!b.phoneActive,
            powerbankActive: !!b.powerbankActive,
            lastSeen: new Date()
          }
        },
        { upsert: true, new: true }
      );
    } else {
      const { doorOpen, relayActive, timeLeftSec, active } = req.body;
      await DeviceTelemetry.findOneAndUpdate(
        { slug },
        {
          $set: {
            doorOpen: !!doorOpen,
            relayActive: !!relayActive,
            timeLeftSec: Number(timeLeftSec) || 0,
            active: !!active,
            lastSeen: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

    const pending = await DeviceCommand.find({ slug, status: 'pending' }).sort({ createdAt: 1 }).limit(8).lean();
    if (pending.length) {
      await DeviceCommand.updateMany(
        { _id: { $in: pending.map((p) => p._id) } },
        { $set: { status: 'delivered', deliveredAt: new Date() } }
      );
    }

    res.json({
      ok: true,
      serverTime: Date.now(),
      commands: pending.map((c) => ({ id: c._id, action: c.action, payload: c.payload || {} }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.nodeAck = async (req, res) => {
  try {
    const { slug } = req.params;
    const ids = Array.isArray(req.body.commandIds) ? req.body.commandIds : [];
    if (!ids.length) return res.json({ ok: true });
    await DeviceCommand.updateMany(
      { _id: { $in: ids }, slug, status: 'delivered' },
      { $set: { status: 'completed' } }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.controlDevice = async (req, res) => {
  try {
    const { slug } = req.params;
    const { action, payload } = req.body;
    if (!CONTROL_SLUGS.includes(slug)) return res.status(400).json({ message: 'Invalid device' });
    if (!WEB_CONTROL_ACTIONS.includes(action)) {
      return res.status(400).json({ message: `action must be one of: ${WEB_CONTROL_ACTIONS.join(', ')}` });
    }
    const pl = { ...(payload || {}) };
    if (slug === 'station' && (action === 'door_open' || action === 'door_close')) {
      if (!['phone', 'powerbank'].includes(pl.target)) {
        return res.status(400).json({ message: 'For station doors, payload.target must be "phone" or "powerbank"' });
      }
    }
    const cmd = await enqueueCommand(slug, action, { ...pl, requestedBy: String(req.user._id) });
    res.json({ success: true, command: cmd });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.closePowerbank = async (_req, res) => {
  try {
    await enqueueCommand('station', 'door_close', { target: 'powerbank', source: 'admin' });
    res.json({ success: true, message: 'Powerbank close queued' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
