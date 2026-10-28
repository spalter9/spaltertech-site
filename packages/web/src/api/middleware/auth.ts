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

/** The allowlist row's role for `email`, or null if not on the allowlist. */
export async function allowlistRole(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const [row] = await db
    .select({ role: schema.allowlist.role })
    .from(schema.allowlist)
    .where(eq(schema.allowlist.email, email.trim().toLowerCase()));
  return row?.role ?? null;
}

/**
 * Data Room lockdown — requires an authenticated session AND an allowlisted
 * email. Signed-in but unapproved users get FORBIDDEN and see the
 * "access pending" screen on the client. Guards all privileged legal/financial
 * data so the Data Room can never leak, even to a self-registered account.
 */
export const authedAllowed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  if (!(await isAllowed(session.user.email))) {
    throw new ORPCError("FORBIDDEN", { message: "Access pending approval" });
  }
  return next({ context: { user: session.user, session: session.session } });
});

/** Data Room admin lockdown — authenticated, allowlisted, AND role "admin". */
export const authedAdmin = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  const role = await allowlistRole(session.user.email);
  if (role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
  }
  return next({ context: { user: session.user, session: session.session } });
});
