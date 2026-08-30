import { z } from "zod";
import { base } from "../__core/app";

/**
 * Spalty — the SSP Master Engine's interactive voice guide (/engine only,
 * not the public website). Text reasoning runs on
 * Claude; the reply is then read aloud client-side via the ElevenLabs
 * text-to-speech route below (POST /api/spalty/speak), using the user's
 * cloned voice model. Text chat degrades gracefully (a fixed "offline"
 * reply) when ANTHROPIC_API_KEY isn't configured; the voice layer degrades
 * separately (silently, text-only) when ELEVENLABS_API_KEY/VOICE_ID aren't.
 */

const SPALTY_SYSTEM_PROMPT =
  "You are Spalty, the voice guide of Spalter Entertainment Technologies' Sovereign Sign " +
  "Protocol (SSP) platform — a luxury fintech, 'vault-grade trust' system for music rights: " +
  "The MasterTrust (cryptographic chain-of-title + escrow), the Surrealizer Engine (forensic " +
  "audio, neural stem extraction, catalog restoration), and SSP itself (Polygon-anchored " +
  "ledger, real-time split settlement, anti-scraping tripwire). Speak as a confident, warm, " +
  "knowledgeable guide — premium and institutional, never hypey. Your replies are read aloud, " +
  "so keep them short and conversational: 1-3 sentences, no markdown, no lists, no headings.";

const chatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export const spalty = {
  chat: base.input(chatInput).handler(async ({ input }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        reply: "Spalty is offline right now — the site isn't configured with an Anthropic API key yet.",
        available: false,
      };
    }
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system: SPALTY_SYSTEM_PROMPT,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const textBlock = response.content.find((block) => block.type === "text");
      const reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
      if (!reply) return { reply: "I didn't quite catch that — could you rephrase?", available: true };
      return { reply, available: true };
    } catch {
      return { reply: "Spalty couldn't respond just now — try again in a moment.", available: false };
    }
  }),
};
