import { useState } from "react";
import { motion } from "motion/react";
import type { EngineModuleId } from "../lib/engine-data";
import { Nav } from "../components/nav";
import { EngineHeader } from "../components/engine/engine-header";
import { LiveMetricsBar } from "../components/engine/live-metrics-bar";
import { ModuleTabs } from "../components/engine/module-tabs";
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
