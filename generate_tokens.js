// generate_tokens.js
// Usage: node generate_tokens.js recipients.csv
// Reads a CSV with header 'email' and writes mailmerge.csv with 'email' and 'link' columns (and inserts tokens into DB)


const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const Database = require('better-sqlite3');


const db = new Database(path.join(__dirname, 'phish.db'));


const IN = process.argv[2] || 'recipients.csv';
const OUT = 'mailmerge.csv';
const BASE = process.env.BASE_URL || 'http://localhost:3000';


if (!fs.existsSync(IN)) {
console.error('Input file not found:', IN);
process.exit(2);
}


// read CSV (very small, simple parser)
const text = fs.readFileSync(IN, 'utf8').trim();
const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
const emailIdx = header.indexOf('email');
if (emailIdx === -1) {
console.error('recipients.csv must have header: email');
process.exit(2);
}


const rows = lines.map(line => {
const cols = line.split(',');
return { email: cols[emailIdx].trim() };
});


const writer = csvWriter({
path: OUT,
header: [
{id: 'email', title: 'email'},
{id: 'link', title: 'link'},
{id: 'token', title: 'token'}
]
});


(async () => {
const out = [];
const insert = db.prepare('INSERT OR REPLACE INTO tokens (token, email, issued_at) VALUES (?, ?, ?)');
for (const r of rows) {
const token = uuidv4();
const link = `${BASE.replace(/\/$/, '')}/r?tok=${encodeURIComponent(token)}`;
out.push({ email: r.email, link, token });
insert.run(token, r.email, new Date().toISOString());
}
await writer.writeRecords(out);
console.log('Wrote', OUT);
})();
