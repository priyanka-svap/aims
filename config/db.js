const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aims';
  try {
    await mongoose.connect(uri, {
      // modern mongoose (8.x) no longer needs useNewUrlParser/useUnifiedTopology
    });
    console.log(`[MongoDB] Connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
    await _fixCashAccountIndex();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
  });
}

// CashAccount used to be unique by `date` alone (one row per day, system-wide), which meant
// Warehouse/Nokha/any other shop's daily summary collided on the same date. It's now unique by
// {date, shop} so every shop can save its own row. Mongoose won't drop an old index just because
// the schema changed, so this removes the stale single-field unique index once (harmless no-op
// once it's already gone, and harmless on a fresh DB where the collection doesn't exist yet) so
// the new compound index actually takes effect.
async function _fixCashAccountIndex() {
  try {
    const coll = mongoose.connection.db.collection('cashaccounts');
    const indexes = await coll.indexes();
    const stale = indexes.find(
      (ix) => ix.key && Object.keys(ix.key).length === 1 && ix.key.date === 1 && ix.unique
    );
    if (stale) {
      await coll.dropIndex(stale.name);
      console.log(`[MongoDB] Dropped stale unique index '${stale.name}' on cashaccounts (date-only) so per-shop accounts can coexist`);
    }
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.warn('[MongoDB] CashAccount index check skipped:', err.message);
    }
  }
}

module.exports = connectDB;
