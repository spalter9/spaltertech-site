import { json } from '../_lib.js';

// Public, read-only, deliberately minimal — just enough for the split-sheet
// page to show "you're adding your split for '<title>'" before anyone signs
// anything. No status, no notes, no internal ids beyond the one already in
// the URL, no email addresses.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Registry is not set up yet.' }, 503);

  const trackId = new URL(request.url).searchParams.get('id');
  if (!trackId) return json({ error: 'A track id is required.' }, 400);

  const track = await env.DB.prepare(
    `SELECT t.title as title, w.name as registeredBy FROM tracks t
     JOIN writers w ON w.id = t.writer_id WHERE t.id = ?`,
  )
    .bind(trackId)
    .first();

  if (!track) return json({ error: 'No song found for that link.' }, 404);
  return json({ title: track.title, registeredBy: track.registeredBy });
}
