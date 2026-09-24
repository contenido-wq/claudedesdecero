// Cliente mínimo de Google Sheets para Cloudflare Workers/Pages Functions.
// Firma el JWT de la cuenta de servicio con WebCrypto (no hay node:crypto en Workers).
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const enc = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));

// Acepta la clave como la pega el panel: con \n literales, con saltos reales o entre comillas.
function pemToDer(pem) {
  const limpio = String(pem)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  return Uint8Array.from(atob(limpio), (c) => c.charCodeAt(0));
}

export async function getAccessToken({ email, privateKey, fetchFn = fetch, now = Date.now() }) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const iat = Math.floor(now / 1000);
  const firmando = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 })}`;
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(firmando));

  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${firmando}.${base64url(new Uint8Array(firma))}`,
    }).toString(),
  });
  if (!res.ok) throw new Error('google_auth_failed');
  return (await res.json()).access_token;
}

// RAW: los valores se guardan como texto (un "+57 300…" o "=algo" no se interpreta como número/fórmula).
export async function appendRow({ email, privateKey, sheetId, values, fetchFn = fetch }) {
  const token = await getAccessToken({ email, privateKey, fetchFn });
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A1:append?valueInputOption=RAW`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error('sheets_append_failed');
}
