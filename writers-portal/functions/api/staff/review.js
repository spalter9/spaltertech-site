import { json, requireStaff } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env);
  if (!staff) return json({ error: 'Staff access required.' }, 403);

  const tracks = await env.DB.prepare(
    `SELECT t.*, w.name as writer_name, w.email as writer_email FROM tracks t
     JOIN writers w ON w.id = t.writer_id ORDER BY t.created_at DESC LIMIT 200`,
  ).all();

  const splits = await env.DB.prepare(
    `SELECT s.*, t.title as track_title, w.name as writer_name, w.email as writer_email FROM splits s
     JOIN tracks t ON t.id = s.track_id JOIN writers w ON w.id = s.writer_id
     ORDER BY s.created_at DESC LIMIT 200`,
  ).all();

  return json({ tracks: tracks.results || [], splits: splits.results || [] });
}
