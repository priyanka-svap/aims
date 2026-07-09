# AIMS Backend — Node.js + Express + MongoDB

Backend API for **AIMS (Advanced Inventory Management System)**. Replaces the
browser `localStorage` persistence in `aims_v14__3_.html` with a real
MongoDB-backed REST API, with **JWT authentication** and full **Inventory
CRUD**, plus supporting APIs for movements, shops, locations, accounts,
day-sheets, and ledger entries so the rest of the app can be migrated too.

## 1. Requirements

- Node.js 18+ (tested on Node 22)
- MongoDB 6+ running locally, or a free MongoDB Atlas cluster

## 2. Setup

```bash
cd aims-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/aims
PORT=5000
JWT_SECRET=replace_with_a_long_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> If you don't have MongoDB installed locally, the easiest option is a free
> [MongoDB Atlas](https://www.mongodb.com/atlas) cluster — copy its connection
> string into `MONGO_URI`.

## 3. Seed initial data (optional but recommended)

Loads the existing shops, locations, brand rates, and cash-account rows that
were hardcoded in the HTML file, so the app has real data on first run:

```bash
npm run seed
```

This also creates the default admin user (`admin` / `admin123` unless
changed in `.env`). **Change this password after first login** — use
`POST /api/auth/change-password`.

If you skip seeding, the server will still auto-create the admin user on
first boot (see `seed/ensureAdmin.js`), but shops/brands/accounts will be
empty until you add them via the API.

## 4. Run the server

```bash
npm start        # production
npm run dev       # auto-restart with nodemon
```

Server starts on `http://localhost:5000` (or your configured `PORT`).
Check it's alive:

```bash
curl http://localhost:5000/api/health
```

## 5. API Overview

All endpoints are prefixed with `/api`. Except `/api/auth/login` and
`/api/health`, every route requires an `Authorization: Bearer <token>`
header (token returned from login).

### 5.1 Auth API (requested API #1)

| Method | Endpoint                    | Auth         | Description                          |
|--------|------------------------------|--------------|---------------------------------------|
| POST   | `/api/auth/login`            | Public       | Login, returns `{ token, user }`      |
| POST   | `/api/auth/register`         | Admin only   | Create a new user                     |
| GET    | `/api/auth/me`                | Logged in    | Get current user profile              |
| POST   | `/api/auth/change-password`  | Logged in    | Change own password                   |

**Login example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Response:
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": { "id": "...", "username": "admin", "role": "admin" }
}
```

Use the token on subsequent requests:
```bash
curl http://localhost:5000/api/inventory \
  -H "Authorization: Bearer eyJhbGciOi..."
```

Roles: `admin`, `manager`, `staff` — used to restrict sensitive actions
(deleting inventory, creating users, etc.) via `requireRole(...)` middleware.

### 5.2 Inventory API (requested API #2)

The core inventory item is a **brand + shop + rates** record (mirrors
`DB.brandRates` from the original HTML), with an optional `stock` sub-object
for tracking quantities on hand.

| Method | Endpoint                          | Roles                  | Description                          |
|--------|------------------------------------|-------------------------|----------------------------------------|
| GET    | `/api/inventory`                   | any logged-in           | List, supports `?shop=&cat=&search=&page=&limit=` |
| GET    | `/api/inventory/low-stock`         | any logged-in           | Items below a stock threshold (`?threshold=10`) |
| GET    | `/api/inventory/:id`               | any logged-in           | Get one item                          |
| POST   | `/api/inventory`                   | admin, manager           | Create item                           |
| PUT    | `/api/inventory/:id`               | admin, manager           | Update name/shop/cat/rates            |
| PATCH  | `/api/inventory/:id/stock`         | admin, manager, staff    | Adjust stock (`mode: add/subtract/set`) |
| DELETE | `/api/inventory/:id`               | admin only                | Delete item                           |

**Create example:**
```bash
curl -X POST http://localhost:5000/api/inventory \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mc Dowells","shop":"rora","cat":"whisky","bot":620,"half":320,"nips":170}'
```

**Adjust stock example** (e.g. after an inward entry of 10 bottles):
```bash
curl -X PATCH http://localhost:5000/api/inventory/<id>/stock \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bot":10,"mode":"add"}'
```

### 5.3 Supporting APIs (for the rest of the app)

| Resource    | Base path             | Mirrors                       |
|-------------|------------------------|--------------------------------|
| Movements   | `/api/movements`       | `DB.inward` / `DB.outward`     |
| Shops       | `/api/shops`           | `DB.shops`                     |
| Locations   | `/api/locations`       | `DB.locations`                 |
| Accounts    | `/api/accounts`        | `cashData`                     |
| Day Sheets  | `/api/sheets/:type`    | `roraSheets` / `mainSheet1` / `nokhaSheet` (`type` = rora/main/nokha) |
| Ledger      | `/api/ledger/:store`   | `CDB` / `NDB` / `WDB` (`store` = circle/nokha/warehouse) |

All follow standard REST conventions (`GET` list, `POST` create, `PUT/PATCH`
update, `DELETE` remove) and return `{ success, data, ... }` JSON.

## 6. Connecting the existing HTML frontend

Three files are provided in `public-client/`:

1. **`api-client.js`** — drop-in script exposing `window.AimsAPI` with
   `login`, `inventory.*`, `movements.*`, etc. Include it before your other
   `<script>` tags in `aims_v14__3_.html`.

2. **`login-integration-snippet.html`** — paste right after `<body>` to add
   a login screen that gates access to the app until `AimsAPI.login()`
   succeeds, and verifies the saved token on reload.

3. **`inventory-integration-example.js`** — shows exactly how to rewrite the
   existing `renderRates()`, `saveBrandRate()`, `deleteBrandRate()`, and
   `commitRate()` functions (the brand/rate inventory screen) to call the
   new API instead of `DB.brandRates` + `localStorage`. Same function names,
   so no other code in the file needs to change — only their internals.

Set the backend URL once, before loading `api-client.js`:
```html
<script>window.AIMS_API_BASE_URL = 'https://your-deployed-api.com/api';</script>
<script src="api-client.js"></script>
```

The same pattern (cache from API → render → call API on save/delete) applies
to migrating `DB.inward`/`DB.outward` (use `AimsAPI.movements`), shops/locations,
accounts, and the day-sheets/ledger screens — each maps to one of the
supporting APIs above.

## 7. Project structure

```
aims-backend/
├── server.js                 # Express app entry point
├── config/db.js              # MongoDB connection
├── models/                   # Mongoose schemas
│   ├── User.js
│   ├── BrandRate.js          # core inventory item
│   ├── Shop.js
│   ├── Location.js
│   ├── Movement.js           # inward/outward
│   ├── CashAccount.js
│   ├── DaySheet.js           # rora/main/nokha listings
│   └── LedgerEntry.js        # circle/nokha/warehouse
├── controllers/               # Route handler logic
├── routes/                    # Express routers
├── middleware/auth.js         # JWT verify + role guard
├── seed/
│   ├── seed.js                # one-off: load static data + admin user
│   └── ensureAdmin.js          # auto-runs on boot if no users exist
├── public-client/             # Frontend integration helpers
└── .env.example
```

## 8. Security notes

- Passwords are hashed with bcrypt, never stored or returned in plain text.
- JWT tokens expire (`JWT_EXPIRES_IN`, default 7 days).
- `helmet` sets standard security headers; `express-rate-limit` throttles
  the `/api/auth/*` routes against brute force.
- Change `JWT_SECRET` and the default admin password before deploying.
- For production, set `CORS_ORIGIN` to your actual frontend domain instead
  of `*`.
