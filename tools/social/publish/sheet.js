// Reads and writes the Instagram approval queue (a Google Sheet) with a Google service account.
// No extra packages: the sign-in token is made with Node's own crypto.
//
// Needs two settings:
//   QUEUE_SHEET_ID  the long id in the sheet's link (docs.google.com/spreadsheets/d/<this part>/edit)
//   GOOGLE_SA_KEY   the service account's JSON key file, pasted in whole (a GitHub secret)
// The sheet must be shared with the service account's email address as an Editor.
import crypto from 'node:crypto';

export const TAB = 'Queue';
// Columns on the Queue tab, in order. Row 1 is the header row.
export const COLS = ['post', 'what', 'type', 'post_at', 'status', 'approved_by', 'approved_on', 'instagram_id', 'published_at', 'notes', 'last_error'];
const LAST_COL = String.fromCharCode('A'.charCodeAt(0) + COLS.length - 1); // K
const SHEETS = process.env.SHEETS_API_URL || 'https://sheets.googleapis.com/v4/spreadsheets'; // swappable for tests

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
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

/** Read every queue row. Returns [{ row, post, type, status, ... }] where row is the sheet row number. */
export async function readQueue(sheetId, token) {
  const range = encodeURIComponent(`${TAB}!A1:${LAST_COL}500`);
  const res = await fetch(`${SHEETS}/${sheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Could not read the queue sheet: ${json.error?.message ?? res.status}. Is it shared with the service account?`);
  const rows = json.values ?? [];
  return rows.slice(1).map((cells, i) => {
    const r = { row: i + 2 };
    COLS.forEach((c, j) => { r[c] = String(cells[j] ?? '').trim(); });
    return r;
  }).filter((r) => r.post);
}

/** Write status and result columns (E..K) for one row. Only those columns: Post, What, Type, Post at are never touched. */
export async function writeResult(sheetId, token, row, fields) {
  const values = COLS.slice(4).map((c) => (fields[c] !== undefined ? fields[c] : null));
  const range = encodeURIComponent(`${TAB}!E${row}:${LAST_COL}${row}`);
  // null means "leave this cell as it is" for the Sheets API.
  const res = await fetch(`${SHEETS}/${sheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ range: `${TAB}!E${row}:${LAST_COL}${row}`, majorDimension: 'ROWS', values: [values] }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(`Could not write row ${row} of the queue sheet: ${json.error?.message ?? res.status}`);
  }
}
