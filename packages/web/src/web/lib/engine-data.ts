export type EngineModuleId =
  | "multitask"
  | "authorship"
  | "gaming"
  | "film"
  | "music"
  | "ai"
  | "tax";

export interface LiveMetric {
  id: string;
  label: string;
  value: string;
  hint?: string;
  accent: "gold" | "verified" | "bone";
}

export const LIVE_METRICS: LiveMetric[] = [
  {
    id: "volume",
    label: "Total Volume Processed",
    value: "$14,892,400.00",
    accent: "gold",
  },
  {
    id: "irs",
    label: "Instant IRS Tax Remitted",
    value: "$3,723,100.00",
    hint: "Real-Time 25% Auto-Settled",
    accent: "gold",
  },
  {
    id: "nodes",
    label: "Active Protocol Nodes",
    value: "1,420",
    accent: "verified",
  },
  {
    id: "latency",
    label: "Average Settlement Latency",
    value: "12ms",
    accent: "bone",
  },
];

export interface MusicTrack {
  id: string;
  title: string;
  isrc: string;
  streams: number;
  perStream: number;
  debtWaiver: boolean;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "t1",
    title: "Liquid Dreams (O-Town Remaster)",
    isrc: "US-SPA-26-00001",
    streams: 1_842_300,
    perStream: 0.0042,
    debtWaiver: true,
  },
  {
    id: "t2",
    title: "All or Nothing — Spatial Mix",
    isrc: "US-SPA-26-00002",
    streams: 992_110,
    perStream: 0.0038,
    debtWaiver: true,
  },
  {
    id: "t3",
    title: "We Fit Together (Remaster)",
    isrc: "US-SPA-26-00003",
    streams: 2_401_880,
    perStream: 0.0045,
    debtWaiver: true,
  },
  {
    id: "t4",
    title: "The One That Got Away",
    isrc: "US-SPA-26-00004",
    streams: 678_420,
    perStream: 0.0035,
    debtWaiver: true,
  },
  {
    id: "t5",
    title: "Ship Ahoy — Stem Vault",
    isrc: "US-SPA-26-00005",
    streams: 421_050,
    perStream: 0.004,
    debtWaiver: true,
  },
];

export const FILM_SPLIT = [
  { role: "Producers", pct: 0.35, accent: "gold" as const },
  { role: "Directors", pct: 0.2, accent: "bone" as const },
  { role: "Audio Designers", pct: 0.15, accent: "verified" as const },
  { role: "State Tax Treasury", pct: 0.1, accent: "gold" as const },
  { role: "Federal Tax Treasury", pct: 0.2, accent: "bone" as const },
];
