import { json, uid, hashPassword, randomTempPassword } from '../_lib.js';

// The QR-code entry point: no login, no account creation step the writer has
// to think about. One POST with name + email + song title. If this email
// hasn't submitted before, a writer account is created behind the scenes
// (unusable to log into until they ever set a real password — that's a
// later, optional step, not required for this to register their song) so
// the submission can reuse the exact same tracks table and staff review
// queue as the full portal.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Registry is not set up yet — ask staff to finish the one-time setup.' }, 503);

  const { name, email, title } = await request.json().catch(() => ({}));
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanTitle = String(title || '').trim();

  if (!cleanName) return json({ error: 'Your name is required.' }, 400);
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: 'A valid email is required.' }, 400);
  if (!cleanTitle) return json({ error: 'A song title is required.' }, 400);

  let writer = await env.DB.prepare('SELECT * FROM writers WHERE email = ?').bind(cleanEmail).first();
  if (!writer) {
    const writerId = uid();
    const passwordHash = await hashPassword(randomTempPassword());
    await env.DB.prepare(
      'INSERT INTO writers (id, email, password_hash, name, role, must_change_password) VALUES (?, ?, ?, ?, ?, 1)',
    )
      .bind(writerId, cleanEmail, passwordHash, cleanName, 'writer')
      .run();
    writer = await env.DB.prepare('SELECT * FROM writers WHERE id = ?').bind(writerId).first();
  }

  const trackId = uid();
  await env.DB.prepare('INSERT INTO tracks (id, writer_id, title, notes, status) VALUES (?, ?, ?, ?, ?)')
    .bind(trackId, writer.id, cleanTitle, 'Submitted via QR quick-register', 'submitted')
    .run();

  return json({ ok: true, trackId, title: cleanTitle });
}
