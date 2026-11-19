// Page privée « Inscrits à la lettre d'Alexandra » : /admin/newsletter?cle=<ADMIN_KEY>
// Lecture seule. Lien à usage d'Alexandra et d'Antoine uniquement (clé secrète du worker).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const day = (ms) => (ms ? new Date(ms).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

function sameKey(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function newsletterAdmin(req, env, url) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' };
  if (!sameKey(url.searchParams.get('cle') || '', env.ADMIN_KEY || '')) return new Response('Accès refusé', { status: 403, headers });

  const site = (await env.DB.prepare(
    "SELECT name, email, MAX(newsletter_at) AS at, MAX(newsletter_synced) AS synced FROM bookings WHERE newsletter = 1 AND status IN ('confirmed','cancelled') GROUP BY lower(email)",
  ).all()).results;
  const list = (await env.DB.prepare('SELECT name, email, source, consent_at AS at, synced FROM newsletter_contacts').all()).results;

  const byEmail = new Map();
  for (const r of list) byEmail.set(r.email.toLowerCase(), { ...r, origine: r.source === 'alexandra' ? 'Alexandra' : 'Fichier clients Wix' });
  for (const r of site) {
    const k = r.email.toLowerCase();
    const prev = byEmail.get(k);
    byEmail.set(k, { name: r.name || prev?.name, email: r.email, at: r.at, synced: r.synced || prev?.synced, origine: prev ? `Site (déjà dans ${prev.origine === 'Alexandra' ? 'la liste' : 'le fichier Wix'})` : 'Réservation sur le site' });
  }
  const rows = [...byEmail.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
  const fromSite = rows.filter((r) => r.origine.startsWith('Site') || r.origine === 'Réservation sur le site').length;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Inscrits à la lettre · Alexandra Degans</title>
<style>
body{margin:0;background:#f3ede2;color:#3b4434;font:16px/1.5 Arial,sans-serif}main{max-width:900px;margin:0 auto;padding:32px 20px}
h1{font:400 2rem Georgia,serif;margin:0 0 6px}.sub{color:#5b6453;margin:0 0 24px}
.kpis{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px}.kpi{background:#fff;border-radius:14px;padding:14px 18px;min-width:150px}.kpi b{display:block;font:400 2rem Georgia,serif;color:#627056}
input{width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #cfd5c6;border-radius:999px;font:inherit;margin-bottom:14px;background:#fff}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #ece6da;font-size:.94rem}th{background:#e8e1d3;font-weight:600}
.tag{font-size:.8rem;color:#627056}.muted{color:#8a9180;font-size:.85rem}@media(max-width:640px){td:nth-child(2),th:nth-child(2){display:none}}
</style></head><body><main>
<h1>Inscrits à la lettre d’Alexandra</h1>
<p class="sub">Mis à jour en temps réel · ${esc(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))}</p>
<div class="kpis"><div class="kpi"><b>${rows.length}</b>inscrits au total</div><div class="kpi"><b>${fromSite}</b>via la case du site</div><div class="kpi"><b>${rows.filter((r) => r.synced).length}</b>déjà dans la liste d’envoi</div></div>
<input type="search" placeholder="Rechercher un nom ou une adresse…" oninput="for(const tr of document.querySelectorAll('tbody tr'))tr.hidden=!tr.textContent.toLowerCase().includes(this.value.toLowerCase())">
<table><thead><tr><th>Nom</th><th>E-mail</th><th>Origine</th><th>Date</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.name) || '<span class="muted">—</span>'}</td><td>${esc(r.email)}</td><td class="tag">${esc(r.origine)}</td><td>${day(r.at)}</td></tr>`).join('')}
</tbody></table>
<p class="muted">Les désinscriptions se font depuis le lien présent dans chaque lettre ; elles sont prises en compte automatiquement par le service d’envoi.</p>
</main></body></html>`;
  return new Response(html, { headers });
}
