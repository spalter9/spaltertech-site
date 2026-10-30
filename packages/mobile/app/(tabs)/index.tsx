import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePing } from "@/queries/ping";
import { useColors } from "@/hooks/use-colors";
import { Glow } from "@/components/Glow";

const TRUST: { icon: keyof typeof Ionicons.glyphMap; v: string; k: string }[] = [
  { icon: "person-circle-outline", v: "Measured", k: "Human authorship" },
  { icon: "shield-checkmark-outline", v: "Verified", k: "Chain of title" },
  { icon: "finger-print-outline", v: "Embedded", k: "Provenance" },
  { icon: "flash-outline", v: "Instant", k: "Settlement" },
];

const PILLARS: { icon: keyof typeof Ionicons.glyphMap; tag: string; name: string; body: string }[] = [
  {
    icon: "shield-checkmark",
    tag: "Ownership, absolute",
    name: "Cryptographic Sovereignty",
    body: "Every master, split and attestation sealed on-chain. Chain-of-title becomes mathematical fact.",
  },
  {
    icon: "pulse",
    tag: "Legacy IP, reawakened",
    name: "Catalog Modernization",
    body: "Neural stem extraction and forensic attribution turn dormant catalogs into living assets.",
  },
  {
    icon: "link",
    tag: "One sovereign standard",
    name: "Ecosystem Integration",
    body: "A Polygon-anchored ledger with real-time split escrow and an anti-scraping tripwire.",
  },
];

export default function Index() {
  const c = useColors();
  const ping = usePing();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.screen, { backgroundColor: c.background }]}>
      <Glow color={c.deep} size={520} style={{ top: -220, left: -200 }} />
      <Glow color={c.accent} size={380} style={{ top: 120, right: -220 }} />
      <Glow color={c.violet} size={420} style={{ top: 620, left: -240 }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand row */}
        <View style={styles.brandRow}>
          <View style={[styles.crest, { borderColor: c.primary, backgroundColor: c.background }]}>
            <View style={[styles.crestDot, { borderColor: c.primary }]} />
            <View style={[styles.crestStem, { backgroundColor: c.primary }]} />
          </View>
          <View>
            <Text style={[styles.brand, { color: c.accent }]}>SPALTER</Text>
            <Text style={[styles.brandSub, { color: c.mutedForeground }]}>ENTERTAINMENT TECHNOLOGIES</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={[styles.pill, { borderColor: c.primary + "55", backgroundColor: c.primary + "1A" }]}>
          <View style={[styles.liveDot, { backgroundColor: c.success }]} />
          <Text style={[styles.pillText, { color: c.accent }]}>SOVEREIGN INFRASTRUCTURE</Text>
        </View>
        <Text style={[styles.h1, { color: c.foreground }]}>
          The sovereign infrastructure for the <Text style={{ color: c.accent }}>next era of media assets.</Text>
        </Text>
        <Text style={[styles.lede, { color: c.mutedForeground }]}>
          Every work cryptographically proven, every legacy catalog reawakened as a living asset, and every
          payment settled the instant it is earned.
        </Text>

        <Pressable style={({ pressed }) => [styles.cta, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="lock-closed" size={14} color={c.primaryForeground} />
          <Text style={[styles.ctaText, { color: c.primaryForeground }]}>ENTER THE DATA ROOM</Text>
        </Pressable>

        {/* Now live */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.primary + "44" }]}>
          <View style={[styles.badge, { backgroundColor: c.primary + "33" }]}>
            <Text style={[styles.badgeText, { color: c.accent }]}>NOW LIVE</Text>
          </View>
          <Text style={[styles.cardBody, { color: c.foreground }]}>
            <Text style={{ color: c.accent }}>The Examiner</Text> — upload a record and get a stem-by-stem
            finding on which parts a person actually performed, with the Copyright Office wording to match.
          </Text>
        </View>

        {/* Trust grid */}
        <View style={styles.grid}>
          {TRUST.map((t) => (
            <View key={t.k} style={[styles.trust, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.iconTile, { backgroundColor: c.primary + "26" }]}>
                <Ionicons name={t.icon} size={18} color={c.accent} />
              </View>
              <Text style={[styles.trustV, { color: c.foreground }]}>{t.v}</Text>
              <Text style={[styles.trustK, { color: c.mutedForeground }]}>{t.k.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Pillars */}
        <Text style={[styles.eyebrow, { color: c.primary }]}>THE CORE ECOSYSTEM</Text>
        <Text style={[styles.h2, { color: c.foreground }]}>
          Three pillars. <Text style={{ color: c.accent }}>One sovereign standard.</Text>
        </Text>
        {PILLARS.map((p, i) => (
          <View key={p.name} style={[styles.pillar, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.pillarTop}>
              <View style={[styles.iconTile, { backgroundColor: c.primary + "26", borderColor: c.primary + "66", borderWidth: 1 }]}>
                <Ionicons name={p.icon} size={20} color={c.accent} />
              </View>
              <Text style={[styles.pillarIdx, { color: c.border }]}>{`0${i + 1}`}</Text>
            </View>
            <Text style={[styles.eyebrow, { color: c.primary, marginTop: 14 }]}>{p.tag.toUpperCase()}</Text>
            <Text style={[styles.pillarName, { color: c.foreground }]}>{p.name}</Text>
            <Text style={[styles.cardBody, { color: c.mutedForeground }]}>{p.body}</Text>
          </View>
        ))}

        {/* Live status */}
        <View style={[styles.status, { backgroundColor: c.card, borderColor: c.border }]}>
          {ping.isLoading ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <>
              <View
                style={[styles.liveDot, { backgroundColor: ping.isError ? c.destructive : c.success }]}
              />
              <Text style={{ color: ping.isError ? c.destructive : c.mutedForeground, fontSize: 12 }}>
                {ping.isError ? "API unreachable" : `API status: ${ping.data?.message}`}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  content: { padding: 22, paddingBottom: 48, gap: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  crest: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center" },
  crestDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginTop: 8 },
  crestStem: { width: 5, height: 12, marginTop: 3, borderRadius: 1 },
  brand: { fontSize: 18, fontWeight: "700", letterSpacing: 2 },
  brandSub: { fontSize: 8, letterSpacing: 2.6, marginTop: 3 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  pillText: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  h1: { fontSize: 38, lineHeight: 42, fontWeight: "700", letterSpacing: -1 },
  lede: { fontSize: 15, lineHeight: 23 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 17,
    marginTop: 4,
  },
  ctaText: { fontSize: 12, fontWeight: "800", letterSpacing: 2.2 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  cardBody: { fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  trust: { width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  iconTile: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  trustV: { fontSize: 17, fontWeight: "700" },
  trustK: { fontSize: 9, letterSpacing: 1.6 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4, marginTop: 18 },
  h2: { fontSize: 28, lineHeight: 32, fontWeight: "700", letterSpacing: -0.6 },
  pillar: { borderWidth: 1, borderRadius: 22, padding: 22, gap: 8 },
  pillarTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pillarIdx: { fontSize: 30, fontWeight: "700" },
  pillarName: { fontSize: 21, fontWeight: "700", letterSpacing: -0.4 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 8,
  },
});
