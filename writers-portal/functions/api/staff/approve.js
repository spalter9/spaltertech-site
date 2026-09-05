import { json, requireStaff } from '../_lib.js';

const TRACK_STATUSES = new Set(['submitted', 'in_review', 'approved', 'registered', 'rejected']);
const SPLIT_STATUSES = new Set(['proposed', 'confirmed', 'approved', 'rejected']);

// Approves/rejects a track or a split. This updates the portal's own record of
// truth immediately. Writing the approved split/registration into Mogul itself
// (set_publishing_composition_splits / create_registration) is done by staff as
// a follow-up step until automatic sync ships — see the status labels in the UI.
export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env);
  if (!staff) return json({ error: 'Staff access required.' }, 403);

  const { kind, id, status, staffNote, mogulAssetId } = await request.json().catch(() => ({}));
  if (kind === 'track') {
    if (!TRACK_STATUSES.has(status)) return json({ error: 'Invalid track status.' }, 400);
    await env.DB.prepare(
      "UPDATE tracks SET status = ?, staff_note = ?, mogul_asset_id = COALESCE(?, mogul_asset_id), updated_at = datetime('now') WHERE id = ?",
    )
      .bind(status, staffNote || null, mogulAssetId || null, id)
      .run();
    const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(id).first();
    return json({ track });
  }
  if (kind === 'split') {
    if (!SPLIT_STATUSES.has(status)) return json({ error: 'Invalid split status.' }, 400);
    await env.DB.prepare("UPDATE splits SET status = ?, staff_note = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, staffNote || null, id)
      .run();
    const split = await env.DB.prepare('SELECT * FROM splits WHERE id = ?').bind(id).first();
    return json({ split });
  }
  return json({ error: 'kind must be "track" or "split".' }, 400);
}
