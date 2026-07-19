import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { auth } from "../auth";
import { db } from "../database";
import * as schema from "../database/schema";

/** True when `email` is on the Data Room allowlist (case-insensitive). */
export async function isAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const [row] = await db
    .select({ id: schema.allowlist.id })
    .from(schema.allowlist)
    .where(eq(schema.allowlist.email, email.trim().toLowerCase()));
  return Boolean(row);
}

/** Optional auth — `context.user` is the session user or null. */
export const withUser = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  return next({
    context: { user: session?.user ?? null, session: session?.session ?? null },
  });
});

/** Protected procedures — rejects unauthenticated calls; `context.user` is non-null. */
export const authed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { user: session.user, session: session.session } });
});

/**
 * Data Room lockdown — requires an authenticated session AND an allowlisted
 * email. Signed-in but unapproved users get FORBIDDEN and see the
 * "access pending" screen on the client. Guards all privileged legal/financial
 * data so the Data Room can never leak, even to a self-registered account.
 */
// OPEN ACCESS (temporary): the Data Room gate is disabled by request — no
// login and no allowlist required. The privileged data is served to everyone.
// To re-lock, restore the commented block below.
export const authedAllowed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  return next({
    context: { user: session?.user ?? null, session: session?.session ?? null },
  });
});

/* LOCKED VERSION — restore to require login + allowlist:
export const authedAllowed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  if (!(await isAllowed(session.user.email))) {
    throw new ORPCError("FORBIDDEN", { message: "Access pending approval" });
  }
  return next({ context: { user: session.user, session: session.session } });
});
*/
