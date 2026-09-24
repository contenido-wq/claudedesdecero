// Ruta de Cloudflare Pages Functions: POST /api/leads/:slug
import { handleLead } from '../../_lib/leads.js';
import landings from '../../_data/landings.json';

export function onRequestPost({ request, params, env }) {
  return handleLead({ request, slug: params.slug, env, landings });
}
