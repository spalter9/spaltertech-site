import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Root of every artifact the protocol writes. Gitignored, operator-owned. */
export const PROTOCOL_DATA_DIR = join(PACKAGE_ROOT, ".data", "protocol");

/** Uploaded containers under audit, keyed by job id. */
export const AUDIT_DIR = join(PROTOCOL_DATA_DIR, "audit");

/** Sealed 4-valve packages, keyed by session id. */
export const EXPORT_DIR = join(PROTOCOL_DATA_DIR, "export");
