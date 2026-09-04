import type { LucideIcon } from "lucide-react";
import { Bot, Clapperboard, Gamepad2, Landmark, Layers, Music2, UserCheck } from "lucide-react";
import type { EngineModuleId } from "../../lib/engine-data";

interface TabDef {
  id: EngineModuleId;
  label: string;
  short: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "multitask", label: "Multitask · All Rails", short: "Multitask", icon: Layers },
  {
    id: "authorship",
    label: "Authorship & Provenance",
    short: "Authorship",
    icon: UserCheck,
  },
  { id: "gaming", label: "Video Games & Virtual Economies", short: "Games", icon: Gamepad2 },
  { id: "film", label: "Film, Television & Streaming", short: "Film", icon: Clapperboard },
  { id: "music", label: "Music & Spatial Audio", short: "Music", icon: Music2 },
  { id: "ai", label: "Generative AI & Data Licensing", short: "AI / DIL", icon: Bot },
  { id: "tax", label: "IRS Tax Settlement Terminal", short: "Tax Engine", icon: Landmark },
];

interface ModuleTabsProps {
  active: EngineModuleId;
  onChange: (id: EngineModuleId) => void;
}

export function ModuleTabs({ active, onChange }: ModuleTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Industry engine modules"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              selected
                ? tab.id === "multitask"
                  ? "border-gold bg-gradient-to-r from-gold/20 to-gold/5 text-gold"
                  : "border-gold/45 bg-gold/10 text-gold"
                : "border-obsidian-line bg-obsidian-raised/50 text-muted hover:border-gold/30 hover:text-bone",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">{tab.label}</span>
            <span className="lg:hidden">{tab.short}</span>
          </button>
        );
      })}
    </div>
  );
}
