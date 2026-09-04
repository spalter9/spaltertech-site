/**
 * Streaming delivery targets.
 *
 * The protocol already measures integrated loudness and true peak to
 * BS.1770-4 for every valve it renders. On its own that is two numbers; what
 * an operator actually wants to know is "will this master survive Spotify
 * without being turned down, and will Amazon clip it." This turns the
 * measurement into that answer.
 *
 * Ported from the `surreal-stamp-engine` Lovable project, whose browser-side
 * meter carried the same table. The measurement here comes from this repo's
 * own meter instead — the one verified against the EBU Tech 3341 reference
 * tone — so the numbers behind these verdicts are the tested ones.
 */

export type PlatformTarget = {
  name: string;
  /** Integrated loudness the platform normalises to, LUFS. */
  lufs: number;
  /** True-peak ceiling the platform asks masters to respect, dBTP. */
  truePeakDbtp: number;
};

/**
 * Published normalisation targets, as of the last review.
 *
 * These are the platforms' own stated figures, not house preferences. They do
 * move: treat this table as documentation with a shelf life, not a constant.
 */
export const PLATFORM_TARGETS: readonly PlatformTarget[] = [
  { name: "Spotify", lufs: -14, truePeakDbtp: -1 },
  { name: "Apple Music", lufs: -16, truePeakDbtp: -1 },
  { name: "YouTube", lufs: -14, truePeakDbtp: -1 },
  { name: "Tidal", lufs: -14, truePeakDbtp: -1 },
  { name: "TikTok", lufs: -14, truePeakDbtp: -1 },
  { name: "Amazon Music", lufs: -14, truePeakDbtp: -2 },
] as const;

export type DeliveryStatus =
  /** Already within half a LU of target with headroom to spare. */
  | "on_target"
  /** Quieter than target; the platform will turn it up. */
  | "quiet"
  /** Louder than target; the platform will turn it down. */
  | "loud"
  /** Normalising to target would push the true peak past the ceiling. */
  | "would_clip"
  /**
   * The programme has no measurable loudness, so there is no normalisation
   * answer to give. Digital silence gates every BS.1770 block away and the
   * integrated value is -Infinity; normalising from it is infinite gain,
   * which is arithmetic rather than advice.
   */
  | "unmeasurable";

export type DeliveryVerdict = {
  platform: string;
  target_lufs: number;
  target_true_peak_dbtp: number;
  /** Gain the platform will apply to reach its target, dB. Null when unmeasurable. */
  normalisation_gain_db: number | null;
  /** True peak after that gain is applied, dBTP. Null when unmeasurable. */
  true_peak_after_gain_dbtp: number | null;
  status: DeliveryStatus;
  note: string;
};

/** Within this many LU of target counts as already delivered correctly. */
const ON_TARGET_TOLERANCE_LU = 0.5;

function round(value: number, places = 2): number {
  if (!Number.isFinite(value)) return value;
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}

/**
 * Judge one measured master against every platform target.
 *
 * The important case is `would_clip`: a master quieter than target is not
 * simply "too quiet" — the platform raises it, and that gain lifts the true
 * peak with it. A master sitting at −20 LUFS with a −0.2 dBTP peak is fine as
 * measured and clips the moment Spotify normalises it up six dB.
 */
export function evaluateDelivery(
  integratedLufs: number,
  truePeakDbtp: number,
  targets: readonly PlatformTarget[] = PLATFORM_TARGETS,
): DeliveryVerdict[] {
  // Silence is not a quiet master — it has no loudness to normalise from, and
  // treating it as one yields infinite gain and a false "would clip".
  const measurable = Number.isFinite(integratedLufs) && Number.isFinite(truePeakDbtp);

  return targets.map((target) => {
    if (!measurable) {
      return {
        platform: target.name,
        target_lufs: target.lufs,
        target_true_peak_dbtp: target.truePeakDbtp,
        normalisation_gain_db: null,
        true_peak_after_gain_dbtp: null,
        status: "unmeasurable" as const,
        note: describe("unmeasurable", 0, 0, target),
      };
    }

    const gain = target.lufs - integratedLufs;
    const peakAfter = truePeakDbtp + gain;
    const clips = peakAfter > target.truePeakDbtp;

    let status: DeliveryStatus;
    if (clips) status = "would_clip";
    else if (Math.abs(gain) <= ON_TARGET_TOLERANCE_LU) status = "on_target";
    else if (gain > 0) status = "quiet";
    else status = "loud";

    return {
      platform: target.name,
      target_lufs: target.lufs,
      target_true_peak_dbtp: target.truePeakDbtp,
      normalisation_gain_db: round(gain),
      true_peak_after_gain_dbtp: round(peakAfter),
      status,
      note: describe(status, gain, peakAfter, target),
    };
  });
}

function describe(
  status: DeliveryStatus,
  gain: number,
  peakAfter: number,
  target: PlatformTarget,
): string {
  switch (status) {
    case "on_target":
      return `Within ${ON_TARGET_TOLERANCE_LU} LU of ${target.lufs} LUFS with headroom to spare — ships as rendered.`;
    case "quiet":
      return `${gain.toFixed(1)} dB below target; the platform turns it up, and the peak rises with it to ${peakAfter.toFixed(2)} dBTP.`;
    case "loud":
      return `${Math.abs(gain).toFixed(1)} dB above target; the platform turns it down, so the extra level buys nothing but lost dynamics.`;
    case "would_clip":
      return `Normalising to ${target.lufs} LUFS lifts the true peak to ${peakAfter.toFixed(2)} dBTP, past the ${target.truePeakDbtp} dBTP ceiling — limit before delivery.`;
    case "unmeasurable":
      return "No measurable programme loudness, so no normalisation applies — check the container carries audio before delivering.";
  }
}

/**
 * True when every platform would accept the master as rendered.
 *
 * An unmeasurable programme is not a clipping risk, so it does not fail here
 * — it fails earlier, on having no audio to deliver.
 */
export function clearsAllPlatforms(verdicts: DeliveryVerdict[]): boolean {
  return verdicts.every((v) => v.status !== "would_clip");
}
