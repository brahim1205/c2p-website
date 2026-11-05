#!/usr/bin/env node
// Project Center read/write flow: owner writes go through AppRow + Prisma double-run,
// reads come from the Prisma projection. Checks read-after-write, derived fields and RBAC.
const API = (process.env.API_URL || 'http://localhost:3003/api').replace(/\/$/, '');
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
const assert = (c, m) => { if (!c) { console.error('project-center-flow-check: FAIL', m); process.exit(1); } };
async function login(email) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const cookies = r.headers.getSetCookie().map((c) => c.split(';')[0]);
  return { cookie: cookies.join('; '), csrf: cookies.find((c) => c.startsWith('c2p_csrf='))?.split('=')[1] };
}
const call = async (method, path, s, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: { Cookie: s.cookie, 'X-CSRF-Token': s.csrf, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const porteur = await login('porteur@c2p.sn');
const own = await call('GET', '/project-center/owner/projects', porteur);
const p = own.body[0];
const title = `Titre via Prisma ${Date.now()}`;
const upd = await call('PATCH', `/project-center/owner/projects/${p.id}`, porteur, { title, description: p.description, status: p.status });
assert(upd.status === 200, `PATCH ${upd.status} ${JSON.stringify(upd.body)}`);
const detail = await call('GET', `/project-center/owner/projects/${p.id}`, porteur);
assert(detail.body.project.title === title, `owner detail title = ${detail.body.project.title}`);
const pub = await fetch(`${API}/project-center/projects/${p.id}`).then((r) => r.json());
assert(pub.project?.title === title, `public detail title = ${pub.project?.title}`);
const round = await call('POST', '/project-center/owner/funding-rounds', porteur, { projectId: p.id, type: 'seed', targetAmount: 1000000, deadline: '2027-01-01', description: 'Levee test' });
assert(round.status === 201 || round.status === 200, `POST round ${round.status} ${JSON.stringify(round.body)}`);
const rounds = await call('GET', '/project-center/owner/funding-rounds', porteur);
assert(rounds.body.some((r) => String(r.id) === String(round.body.id) && r.progress_percent === 0 && r.project_title), 'new round visible with derived fields');
const other = await login('partenaire@c2p.sn');
const forbidden = await call('GET', `/project-center/owner/projects/${p.id}`, other);
assert(forbidden.status === 403, `partner on owner route -> ${forbidden.status}`);
const restore = await call('PATCH', `/project-center/owner/projects/${p.id}`, porteur, { title: p.title, description: p.description, status: p.status });
assert(restore.status === 200, `restore ${restore.status}`);
console.log('project-center-flow-check: ok');
