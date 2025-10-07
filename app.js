// app.js
// Simple Express app that logs token hits to SQLite and redirects to a static landing page.


const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');


const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'changeme';


const app = express();


// Ensure public directory exists
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });


// DB setup (file: phish.db)
const db = new Database(path.join(__dirname, 'phish.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS tokens (
token TEXT PRIMARY KEY,
email TEXT,
issued_at TEXT
);
CREATE TABLE IF NOT EXISTS hits (
id INTEGER PRIMARY KEY AUTOINCREMENT,
token TEXT,
ts TEXT,
ip TEXT,
user_agent TEXT,
referrer TEXT
);
`);


// serve static landing page and assets from public/
app.use(express.static(PUBLIC_DIR));


// Tracking endpoint - logs then redirects to the landing page
app.get('/r', (req, res) => {
const token = (req.query.tok || '').toString();
const ts = new Date().toISOString();
const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const ua = (req.get('User-Agent') || '').replace(/[\r\n]/g, ' ');
const ref = (req.get('Referer') || '').replace(/[\r\n]/g, ' ');


// Insert hit record
const insert = db.prepare('INSERT INTO hits (token, ts, ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?)');
try {
insert.run(token, ts, ip, ua, ref);
} catch (err) {
console.error('DB insert error', err);
}


// Optionally: mark token as used or look up email
try {
const row = db.prepare('SELECT email FROM tokens WHERE token = ?').get(token);
if (row) {
// you can use row.email for mapping but avoid exposing it here
console.log(`Token ${token} used by ${row.email} at ${ts}`);
}
} catch (e) {
// ignore
}


// Redirect to the safe landing page in public/
res.redirect('/phish_landing.html');
});


// Admin export (protected by simple secret). In production, restrict by IP / auth.
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
