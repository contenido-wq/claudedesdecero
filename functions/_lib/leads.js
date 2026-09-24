// Lógica de POST /api/leads/:slug para Cloudflare Pages (sin dependencias, testeable en Node).
import { appendRow } from './sheets.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 8 * 1024;

const json = (status, body) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

// Sin HTML, sin caracteres de control, con largo máximo.
function limpiar(valor, max) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

export async function handleLead({ request, slug, env, landings, fetchFn = fetch, now = () => new Date() }) {
  const landing = Object.hasOwn(landings, slug) ? landings[slug] : null;
  if (!landing) return json(404, { error: 'not_found' });

  if (!String(request.headers.get('content-type') || '').includes('application/json')) {
    return json(415, { error: 'unsupported_media_type' });
  }

  let body;
  try {
    const texto = await request.text();
    if (texto.length > MAX_BODY) return json(413, { error: 'too_large' });
    body = JSON.parse(texto);
  } catch {
    return json(400, { error: 'datos_invalidos' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'datos_invalidos' });

  // Honeypot: si el campo oculto viene lleno es un bot. Respuesta normal, sin guardar.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json(200, { ok: true });

  const nombre = limpiar(body.nombre, 120);
  const email = limpiar(body.email, 160);
  const numero = limpiar(body.numero, 40);
  if (!nombre || !EMAIL_RE.test(email) || numero.replace(/\D/g, '').length < 6) {
    return json(400, { error: 'datos_invalidos' });
  }

  const emailCuenta = env && env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clave = env && env.GOOGLE_PRIVATE_KEY;
  if (!emailCuenta || !clave || !landing.sheet_id) {
    console.error(JSON.stringify({ event: 'leads_not_configured', slug, email: !!emailCuenta, key: !!clave, sheet: !!landing.sheet_id }));
    return json(500, { error: 'no_configurado' });
  }

  const metodo = landing.metodos.includes(body.metodo) ? body.metodo : '';
  const fila = [
    nombre,
    limpiar(`${limpiar(body.indicativo, 8)} ${numero}`, 60),
    email,
    '',
    '',
    '',
    now().toISOString(),
    crypto.randomUUID(),
    metodo,
  ];

  try {
    await appendRow({ email: emailCuenta, privateKey: clave, sheetId: landing.sheet_id, values: fila, fetchFn });
  } catch (err) {
    // Sin PII en el log: solo el motivo técnico.
    console.error(JSON.stringify({ event: 'sheets_append_failed', slug, reason: err && err.message }));
    return json(502, { error: 'no_guardado' });
  }
  return json(200, { ok: true });
}
