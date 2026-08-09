const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Trade = require('../models/Trade');

const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const STATE_FILE = path.join(BACKUP_DIR, 'state.json');

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { enabled: true, lastRunAt: null };
  }
}

function saveState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runBackup() {
  ensureDir();

  const users = await User.find().select('_id email name');
  const dateKey = new Date().toISOString().slice(0, 10);
  let backedUp = 0;

  for (const user of users) {
    const trades = await Trade.find({ user: user._id }).sort({ createdAt: 1 });
    const file = path.join(BACKUP_DIR, `${dateKey}-${user._id}.json`);
    const payload = {
      exportedAt: new Date().toISOString(),
      date: dateKey,
      user: { id: user._id.toString(), email: user.email, name: user.name },
      tradeCount: trades.length,
      trades,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    backedUp += 1;
  }

  const state = getState();
  state.lastRunAt = new Date().toISOString();
  state.lastRunTradeCount = backedUp;
  saveState(state);
  return state;
}

function startBackupScheduler() {
  if (process.env.BACKUP_ENABLED === 'false') {
    return;
  }

  const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS || 24);
  const run = async () => {
    try {
      const state = await runBackup();
      console.log(
        `[backup] completed at ${state.lastRunAt} for ${state.lastRunTradeCount} user(s)`
      );
    } catch (err) {
      console.error(`[backup] failed: ${err.message}`);
    }
  };

  run();

  const timer = setInterval(run, intervalHours * 60 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
  return timer;
}

module.exports = { runBackup, getState, startBackupScheduler };
