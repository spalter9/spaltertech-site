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
import { InvestorModule } from "../components/engine/modules/investor-module";
import { SpaltyAssistant } from "../components/spalty-assistant";

export default function Engine() {
  const [activeModule, setActiveModule] = useState<EngineModuleId>("investor");

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />

      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)",
          }}
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
