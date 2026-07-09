require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const ensureAdmin = require('./seed/ensureAdmin');

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const movementRoutes = require('./routes/movements');
const shopRoutes = require('./routes/shops');
const locationRoutes = require('./routes/locations');
const accountRoutes = require('./routes/accounts');
const sheetRoutes = require('./routes/sheets');
const ledgerRoutes = require('./routes/ledger');
const circleRoutes = require('./routes/circle');
const bootstrapRoutes = require('./routes/bootstrap');
const brandsRoutes = require('./routes/brands');
const ocrRoutes = require('./routes/ocr');

const app = express();

// Render (aur zyadatar free hosts) ek reverse proxy ke peeche app chalate hain, isliye
// Express ko batana zaroori hai ki proxy ka 'X-Forwarded-For' header trust karo — warna
// express-rate-limit har request par ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error deta rehta hai
// aur real client IP sahi se pehchaan nahi paata.
app.set('trust proxy', 1);

// ── Security & utility middleware ──
app.use(helmet());
// Gzips every JSON response before it goes over the wire — the /api/bootstrap endpoint alone
// can return several MB of JSON once a shop has months of history, and that used to go out
// uncompressed. This is the single biggest lever for "the app feels slow to load" over a normal
// (non-fibre) internet connection, with zero behavior change on the server or frontend.
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
  })
);

// Basic rate limiting on auth endpoints to slow down brute force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

// ── Routes ──
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AIMS API is running', time: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/circle', circleRoutes);
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/ocr', ocrRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(PORT, () => {
    console.log(`[Server] AIMS API listening on http://localhost:${PORT}`);
  });
})();

module.exports = app;
