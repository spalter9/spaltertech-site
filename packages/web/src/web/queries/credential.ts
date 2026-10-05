import { useMutation } from "@tanstack/react-query";

/**
 * SSP Credit Layer — client bindings. All three paths move file bytes, so
 * they post multipart to /api/v1/credential directly.
 */

export type Disclosure = { kind: string; location: string; detail: string };

export type InspectResult = {
  format: string;
  disclosures: Disclosure[];
  invisible_watermarks_unchecked: true;
  has_ssp_credential: boolean;
};

export type AuthorshipCredential = {
  credential_id: string;
  issued_at: string;
  credit: { creator: string; role: string; contributions: string[]; statement?: string };
  subject: { file_name: string; format: string; byte_length: number; content_sha256: string };
  ai_disclosure: { declared_tools: string[]; detected: Disclosure[]; preserved_in_file: true };
};

export type IssueResult = {
  credential: AuthorshipCredential;
  signature: { algorithm: string; key_id: string; signature_b64: string };
  credited_file_b64: string | null;
  sidecar_json: string;
};

export type VerifyResult = {
  found: boolean;
  signature_valid: boolean;
  content_intact: boolean;
  disclosures_intact: boolean;
  credential: AuthorshipCredential | null;
  signer_key_id: string | null;
  problems: string[];
};

export type IssueInput = {
  file: File;
  creatorName: string;
  role: string;
  contributions: string;
  declaredTools: string;
  statement: string;
};

async function postForm<T>(path: string, body: FormData, whatFailed: string): Promise<T> {
  const res = await fetch(path, { method: "POST", body });
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error(`${whatFailed}: the credential service is not reachable from this deployment.`);
  }
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok && json.error) throw new Error(json.error);
  return json;
}

export function useInspectFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return postForm<InspectResult>("/api/v1/credential/inspect", body, "Inspect failed");
    },
  });
}

export function useIssueCredential() {
  return useMutation({
    mutationFn: (input: IssueInput) => {
      const body = new FormData();
      for (const [k, v] of Object.entries(input)) body.append(k, v);
      return postForm<IssueResult>("/api/v1/credential/issue", body, "Credential failed");
    },
  });
}

export function useVerifyCredential() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return postForm<VerifyResult>("/api/v1/credential/verify", body, "Verification failed");
    },
  });
}

export function downloadBase64(b64: string, fileName: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  downloadBlob(new Blob([bytes]), fileName);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
