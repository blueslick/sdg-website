// Reads and writes the Instagram approval queue (a Google Sheet) with a Google service account.
// No extra packages: the sign-in token is made with Node's own crypto.
//
// Needs two settings:
//   QUEUE_SHEET_ID  the long id in the sheet's link (docs.google.com/spreadsheets/d/<this part>/edit)
//   GOOGLE_SA_KEY   the service account's JSON key file, pasted in whole (a GitHub secret)
// The sheet must be shared with the service account's email address as an Editor.
import crypto from 'node:crypto';

export const TAB = 'Queue';
// Columns on the Queue tab, in order, with the exact header text row 1 must have.
// The publisher refuses to run if row 1 doesn't match, so an inserted or moved column
// can never make it read or write the wrong cells.
export const COLUMNS = [
  ['post', 'Post'], ['what', 'What it is'], ['type', 'Type'], ['post_at', 'Post at (MYT)'],
  ['status', 'Status'], ['approved_by', 'Approved by'], ['approved_on', 'Approved on'],
  ['instagram_id', 'Instagram ID'], ['published_at', 'Published at'], ['notes', 'Notes'],
  ['last_error', 'Last error'], ['attempts', 'Attempts'],
];
export const COLS = COLUMNS.map(([k]) => k);
const FIRST_WRITE = COLS.indexOf('status'); // the publisher writes Status and everything to its right, never A to D
const col = (i) => String.fromCharCode('A'.charCodeAt(0) + i);
const LAST_COL = col(COLS.length - 1);
const SHEETS = process.env.SHEETS_API_URL || 'https://sheets.googleapis.com/v4/spreadsheets'; // swappable for tests
const TIMEOUT = () => AbortSignal.timeout(30000);

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function getAccessToken(saJson) {
  let key;
  try { key = typeof saJson === 'string' ? JSON.parse(saJson) : saJson; } catch {
    throw new Error('GOOGLE_SA_KEY is not valid JSON. Paste the whole key file, including the { and }.');
  }
  if (!key.client_email || !key.private_key) throw new Error('GOOGLE_SA_KEY is missing client_email or private_key.');
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: key.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: tokenUri, iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${head}.${claims}`);
  const jwt = `${head}.${claims}.${b64url(signer.sign(key.private_key))}`;
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    signal: TIMEOUT(),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

/**
 * Read every queue row. Returns [{ row, post, type, post_at, status, ... }] where row is the sheet row number.
 * Values come back unformatted, so a "Post at" cell that Sheets turned into a date arrives as a serial
 * number (days since 30 Dec 1899) and text stays text. publish.js reads both.
 */
export async function readQueue(sheetId, token) {
  const range = encodeURIComponent(`${TAB}!A1:${LAST_COL}500`);
  const res = await fetch(`${SHEETS}/${sheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`, {
    headers: { authorization: `Bearer ${token}` },
    signal: TIMEOUT(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Could not read the queue sheet: ${json.error?.message ?? res.status}. Is it shared with the service account?`);
  const rows = json.values ?? [];
  const header = (rows[0] ?? []).map((h) => String(h ?? '').trim());
  const expected = COLUMNS.map(([, h]) => h);
  if (expected.some((h, i) => header[i] !== h)) {
    throw new Error(`The Queue tab's header row doesn't match. Expected: ${expected.join(' | ')}. Found: ${header.join(' | ')}. Nothing was posted. Put the columns back in this order.`);
  }
  return rows.slice(1).map((cells, i) => {
    const r = { row: i + 2 };
    COLS.forEach((c, j) => {
      const v = cells[j];
      r[c] = typeof v === 'number' && c === 'post_at' ? v : String(v ?? '').trim();
    });
    return r;
  }).filter((r) => r.post);
}

/** Write Status and the result columns (E onwards) for one row. Columns A to D are never touched. */
export async function writeResult(sheetId, token, row, fields) {
  // null means "leave this cell as it is" for the Sheets API.
  const values = COLS.slice(FIRST_WRITE).map((c) => (fields[c] !== undefined ? fields[c] : null));
  const a1 = `${TAB}!${col(FIRST_WRITE)}${row}:${LAST_COL}${row}`;
  const res = await fetch(`${SHEETS}/${sheetId}/values/${encodeURIComponent(a1)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ range: a1, majorDimension: 'ROWS', values: [values] }),
    signal: TIMEOUT(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(`Could not write row ${row} of the queue sheet: ${json.error?.message ?? res.status}`);
  }
}
