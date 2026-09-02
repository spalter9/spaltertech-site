import { useMutation } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/** Spalty's text reasoning (Claude). Audio playback is handled separately —
 * see spalty-assistant.tsx, which POSTs the reply to /api/spalty/speak. */
export function useSpaltyChat() {
  return useMutation(orpc.spalty.chat.mutationOptions());
}
