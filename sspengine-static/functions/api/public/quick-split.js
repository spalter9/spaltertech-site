import { json, uid, hashPassword, randomTempPassword } from '../_lib.js';

// A collaborator's own entry point into a split sheet — not the person who
// registered the song, necessarily. No login: whoever holds the link (sent
// by the registrant, or handed to them at the session) submits their own
// name, email, and percentage. Same writer-record reuse-by-email pattern as
// quick-register.js, so the same person only ever gets one writer row no
// matter how many songs or splits they touch.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Registry is not set up yet — ask staff to finish the one-time setup.' }, 503);

  const { trackId, name, email, percentage, role } = await request.json().catch(() => ({}));
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const pct = Number(percentage);

  if (!trackId) return json({ error: 'Missing song reference.' }, 400);
  if (!cleanName) return json({ error: 'Your name is required.' }, 400);
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: 'A valid email is required.' }, 400);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return json({ error: 'Your percentage must be between 0 and 100.' }, 400);

  const track = await env.DB.prepare('SELECT id FROM tracks WHERE id = ?').bind(trackId).first();
  if (!track) return json({ error: 'No song found for that link.' }, 404);

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

  const splitId = uid();
  await env.DB.prepare('INSERT INTO splits (id, track_id, writer_id, role, percentage, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(splitId, trackId, writer.id, role === 'publisher' ? 'publisher' : 'writer', pct, 'proposed')
    .run();

  return json({ ok: true });
}
