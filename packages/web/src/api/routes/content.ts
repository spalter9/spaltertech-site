import { z } from "zod";
import { base } from "../__core/app";

/**
 * Homepage pillar copy, generated live by Claude so the framing stays fresh
 * instead of living as hand-written static strings. Never allowed to break
 * the homepage: with no API key, a failed call, or output that doesn't
 * parse, `generated: false` tells the client to keep its built-in copy.
 */

const PILLAR_SLUGS = ["master-trust", "surrealizer", "ssp"] as const;

const pillarCopySchema = z.object({
  pillars: z
    .array(
      z.object({
        slug: z.enum(PILLAR_SLUGS),
        tag: z.string().min(1).max(40),
        body: z.string().min(1).max(420),
      }),
    )
    .length(3),
});

type PillarCopy = z.infer<typeof pillarCopySchema>;

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { copy: PillarCopy; expiresAt: number } | null = null;

async function generatePillarCopy(): Promise<PillarCopy | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "You write homepage marketing copy for Spalter Entertainment Technologies' Sovereign Sign " +
      "Protocol — a luxury fintech, 'vault-grade trust' platform for music rights. Voice: premium, " +
      "forensic, institutional, confident, no hype clichés. Each pillar needs a short eyebrow tag " +
      "(2-5 words, title case) and a body paragraph (2-3 sentences, ~40-60 words) describing the " +
      "pillar's real mechanism.",
    messages: [
      {
        role: "user",
        content:
          "Write fresh copy for the three pillars: " +
          "(1) slug='master-trust' — cryptographic chain-of-title, multi-sig escrow, on-chain " +
          "settlement of masters/splits; " +
          "(2) slug='surrealizer' — forensic audio engine doing neural stem extraction, DNA-level " +
          "credit detection, and steganographic provenance to reawaken dormant catalogs; " +
          "(3) slug='ssp' — Polygon-anchored ledger, real-time split escrow, anti-scraping tripwire " +
          "that bills or blocks AI crawlers. Call the return_pillar_copy tool with all three.",
      },
    ],
    tools: [
      {
        name: "return_pillar_copy",
        description: "Return the generated homepage copy for the three pillars.",
        input_schema: {
          type: "object",
          properties: {
            pillars: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slug: { type: "string", enum: [...PILLAR_SLUGS] },
                  tag: { type: "string" },
                  body: { type: "string" },
                },
                required: ["slug", "tag", "body"],
              },
            },
          },
          required: ["pillars"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "return_pillar_copy" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const parsed = pillarCopySchema.safeParse(toolUse.input);
  if (!parsed.success) return null;
  // `.length(3)` doesn't rule out a repeated slug — require all three distinct.
  if (new Set(parsed.data.pillars.map((p) => p.slug)).size !== PILLAR_SLUGS.length) return null;

  return parsed.data;
}

export const content = {
  // Live-generated homepage pillar copy, cached for an hour. The client
  // treats `generated: false` as "keep the static fallback copy".
  pillarCopy: base.handler(async () => {
    if (cache && cache.expiresAt > Date.now()) {
      return { generated: true, pillars: cache.copy.pillars };
    }
    try {
      const copy = await generatePillarCopy();
      if (!copy) return { generated: false, pillars: [] };
      cache = { copy, expiresAt: Date.now() + CACHE_TTL_MS };
      return { generated: true, pillars: copy.pillars };
    } catch {
      return { generated: false, pillars: [] };
    }
  }),
};
