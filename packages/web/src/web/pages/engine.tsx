import { useState } from "react";
import { motion } from "motion/react";
import type { EngineModuleId } from "../lib/engine-data";
import { Nav } from "../components/nav";
import { EngineHeader } from "../components/engine/engine-header";
import { LiveMetricsBar } from "../components/engine/live-metrics-bar";
import { EngineHero } from "../components/engine/engine-hero";
import { ModuleTabs, TABS } from "../components/engine/module-tabs";
import { GamingModule } from "../components/engine/modules/gaming-module";
import { FilmModule } from "../components/engine/modules/film-module";
import { MusicModule } from "../components/engine/modules/music-module";
import { AiLicensingModule } from "../components/engine/modules/ai-licensing-module";
import { TaxSettlementTerminal } from "../components/engine/modules/tax-settlement-terminal";
import { MultitaskModule } from "../components/engine/modules/multitask-module";
import { AuthorshipModule } from "../components/engine/modules/authorship-module";
import { CreditLayerModule } from "../components/engine/modules/credit-layer-module";
import { InvestorModule } from "../components/engine/modules/investor-module";
import { SpaltyAssistant } from "../components/spalty-assistant";

function ModuleBanner({ id }: { id: EngineModuleId }) {
  const tab = TABS.find((t) => t.id === id);
  if (!tab) return null;
  const Icon = tab.icon;
  const index = String(TABS.indexOf(tab) + 1).padStart(2, "0");
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex items-center gap-5 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/15 via-obsidian-raised/80 to-obsidian-raised/40 p-5 sm:p-6"
    >
      <span
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-sora text-[7rem] font-bold leading-none text-bone/[0.04]"
        aria-hidden
      >
        {index}
      </span>
      <span
        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-bright to-gold text-obsidian"
        style={{ boxShadow: "0 0 36px -6px rgba(109,139,255,0.8)" }}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="relative min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-bright">Module {index}</p>
        <h2 className="font-sora text-xl font-semibold tracking-tight text-bone sm:text-2xl">{tab.label}</h2>
        <p className="mt-1 text-sm text-muted">{tab.blurb}</p>
      </div>
    </motion.div>
  );
}

export default function Engine() {
  const [activeModule, setActiveModule] = useState<EngineModuleId>("investor");

  return (
    <div className="theme-engine min-h-screen bg-obsidian text-bone">
      <Nav />

      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="aurora-blob -left-32 -top-24 h-[28rem] w-[28rem] bg-[#3a4fd6]/60" aria-hidden />
        <div
          className="aurora-blob -right-24 top-40 h-[26rem] w-[26rem] bg-[#8fe9ff]/25"
          style={{ animationDelay: "-6s" }}
          aria-hidden
        />
        <div
          className="aurora-blob left-1/3 top-[34rem] h-[24rem] w-[24rem] bg-[#8f5bff]/25"
          style={{ animationDelay: "-11s" }}
          aria-hidden
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <EngineHeader />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <EngineHero />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            <LiveMetricsBar />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14 }}
            className="space-y-4"
          >
            <ModuleTabs active={activeModule} onChange={setActiveModule} />

            <ModuleBanner id={activeModule} />

            <div
              role="tabpanel"
              id={`panel-${activeModule}`}
              aria-labelledby={`tab-${activeModule}`}
            >
              {activeModule === "investor" && <InvestorModule />}
              {activeModule === "multitask" && <MultitaskModule />}
              {activeModule === "authorship" && <AuthorshipModule />}
              {activeModule === "credit" && <CreditLayerModule />}
              {activeModule === "gaming" && <GamingModule />}
              {activeModule === "film" && <FilmModule />}
              {activeModule === "music" && <MusicModule />}
              {activeModule === "ai" && <AiLicensingModule />}
              {activeModule === "tax" && <TaxSettlementTerminal />}
            </div>
          </motion.div>
        </div>
      </div>

      <SpaltyAssistant />
    </div>
  );
}
