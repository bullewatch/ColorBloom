/**
 * _middleware.js
 * Middleware global Cloudflare Pages Functions pour sécuriser toutes les routes /api/* :
 * - En-têtes de sécurité stricts (anti-clickjacking, MIME sniffing, referrer)
 * - Gestion automatique de CORS pour production, previews pages.dev et développement local
 * - Protection anti-abus et détection des robots malveillants
 */

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(www\.)?colorblop\.com$/,
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/,
  /^http:\/\/localhost:(5173|3000|8788|4173)$/,
];

function isOriginAllowed(origin) {
  if (!origin) return true; // Requêtes directes du même domaine (même origine)
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin');
  const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();

  // 1. Filtrage anti-robots basique / scanners malveillants
  const maliciousAgents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'petalbot'];
  if (maliciousAgents.some(agent => userAgent.includes(agent))) {
    return new Response(JSON.stringify({ error: 'Accès refusé.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Traitement des requêtes pré-vol CORS OPTIONS
  if (request.method === 'OPTIONS') {
    if (origin && isOriginAllowed(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    return new Response(null, { status: 204 });
  }

  // 3. Exécution de la route API cible
  const response = await context.next();

  // 4. Injection des en-têtes de sécurité sur la réponse
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (origin && isOriginAllowed(origin)) {
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
