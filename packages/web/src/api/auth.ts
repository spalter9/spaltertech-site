import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { runableManagedAuth } from "@runablehq/managed-auth/server";
import { db } from "./database";

const applicationId = process.env.APPLICATION_ID?.trim() || "";
const issuer = process.env.VITE_RUNABLE_AUTH_ISSUER?.trim() || "";
const managedAuthPlugins =
  applicationId && issuer
    ? runableManagedAuth({ applicationId, issuer })
    : [];

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL || "http://localhost:5173",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-spalter-local-only",
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [...managedAuthPlugins, expo()],
});
