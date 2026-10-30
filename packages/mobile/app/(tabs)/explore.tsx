import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Glow } from "@/components/Glow";

const METRICS = [
  { v: "$14.9M", k: "Volume processed" },
  { v: "$3.7M", k: "IRS tax remitted" },
  { v: "1,420", k: "Protocol nodes" },
  { v: "12ms", k: "Settlement latency" },
];

const MODULES: { icon: keyof typeof Ionicons.glyphMap; name: string; body: string }[] = [
  { icon: "easel-outline", name: "Investor Briefing", body: "Market, traction and protocol economics in one briefing." },
  { icon: "layers-outline", name: "Multitask · All Rails", body: "Every industry rail settling in parallel." },
  { icon: "person-circle-outline", name: "Authorship & Provenance", body: "Prove who made what, stem by stem." },
  { icon: "ribbon-outline", name: "Credit Layer", body: "Verified credit and ownership that travels with the work." },
  { icon: "game-controller-outline", name: "Games & Virtual Economies", body: "Microtransaction routing and royalty splits." },
  { icon: "film-outline", name: "Film, TV & Streaming", body: "Box-office gross split across talent and treasuries." },
  { icon: "musical-notes-outline", name: "Music & Spatial Audio", body: "Per-stream micropayments with stem isolation." },
  { icon: "hardware-chip-outline", name: "Generative AI & Data Licensing", body: "Per-prompt micro-metering for AI." },
  { icon: "business-outline", name: "IRS Tax Settlement", body: "Smart-contract withholding with audit receipts." },
];

export default function Explore() {
  const c = useColors();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.screen, { backgroundColor: c.background }]}>
      <Glow color={c.deep} size={480} style={{ top: -200, right: -220 }} />
      <Glow color={c.violet} size={380} style={{ top: 560, left: -220 }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: c.primary }]}>SSP MASTER ENGINE</Text>
        <Text style={[styles.h1, { color: c.foreground }]}>
          Every industry. <Text style={{ color: c.accent }}>One settlement layer.</Text>
        </Text>
        <Text style={[styles.lede, { color: c.mutedForeground }]}>
          Games, film, music, AI licensing and tax settle in parallel on the Sovereign Sign Protocol.
        </Text>

        <View style={styles.grid}>
          {METRICS.map((m) => (
            <View key={m.k} style={[styles.metric, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.metricV, { color: c.foreground }]}>{m.v}</Text>
              <Text style={[styles.metricK, { color: c.mutedForeground }]}>{m.k.toUpperCase()}</Text>
              <View style={[styles.bar, { backgroundColor: c.border }]}>
                <View style={[styles.barFill, { backgroundColor: c.accent }]} />
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.eyebrow, { color: c.primary, marginTop: 14 }]}>MODULES</Text>
        {MODULES.map((m, i) => (
          <View key={m.name} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.tile, { backgroundColor: c.primary + "26", borderColor: c.primary + "55" }]}>
              <Ionicons name={m.icon} size={20} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowIdx, { color: c.primary }]}>{`MODULE 0${i + 1}`}</Text>
              <Text style={[styles.rowName, { color: c.foreground }]}>{m.name}</Text>
              <Text style={[styles.rowBody, { color: c.mutedForeground }]}>{m.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  content: { padding: 22, paddingBottom: 48, gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4 },
  h1: { fontSize: 34, lineHeight: 38, fontWeight: "700", letterSpacing: -0.9 },
  lede: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  metricV: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  metricK: { fontSize: 9, letterSpacing: 1.5 },
  bar: { height: 3, borderRadius: 2, marginTop: 10, overflow: "hidden" },
  barFill: { height: 3, width: "70%", borderRadius: 2 },
  row: { flexDirection: "row", gap: 14, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: "center" },
  tile: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowIdx: { fontSize: 9, fontWeight: "700", letterSpacing: 1.8 },
  rowName: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  rowBody: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
});
