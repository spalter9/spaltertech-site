import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Bot, Clapperboard, Gamepad2, Landmark, Layers, Music2, Presentation, UserCheck } from "lucide-react";
import type { EngineModuleId } from "../../lib/engine-data";

export interface TabDef {
  id: EngineModuleId;
  label: string;
  short: string;
  blurb: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: "investor", label: "Investor Briefing", short: "Investors",
    blurb: "The business case: market, traction and the protocol economics in one briefing.", icon: Presentation },
  { id: "multitask", label: "Multitask · All Rails", short: "Multitask",
    blurb: "Every industry rail running concurrently — watch jobs settle in parallel.", icon: Layers },
  {
    id: "authorship",
    label: "Authorship & Provenance",
    short: "Authorship",
    blurb: "Prove who made what, stem by stem, with provenance embedded at the source.",
    icon: UserCheck,
  },
  { id: "credit", label: "Credit Layer", short: "Credit",
    blurb: "Verified credit and ownership records that travel with the work.", icon: BadgeCheck },
  { id: "gaming", label: "Video Games & Virtual Economies", short: "Games",
    blurb: "Microtransaction routing and royalty splits for virtual economies.", icon: Gamepad2 },
  { id: "film", label: "Film, Television & Streaming", short: "Film",
    blurb: "Box-office gross split across talent and treasuries, with chain-of-title checks.", icon: Clapperboard },
  { id: "music", label: "Music & Spatial Audio", short: "Music",
    blurb: "Per-stream micropayments and stem isolation with spatial preview.", icon: Music2 },
  { id: "ai", label: "Generative AI & Data Licensing", short: "AI / DIL",
    blurb: "License validation and per-prompt micro-metering for generative AI.", icon: Bot },
  { id: "tax", label: "IRS Tax Settlement Terminal", short: "Tax Engine",
    blurb: "Smart-contract IRS withholding at the point of sale, with audit receipts.", icon: Landmark },
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
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              selected
                ? tab.id === "multitask"
                  ? "border-gold bg-gradient-to-r from-gold/25 to-gold-bright/10 text-gold-bright shadow-[0_0_30px_-10px_rgba(var(--gold-rgb),0.8)]"
                  : "border-gold/50 bg-gold/15 text-gold-bright shadow-[0_0_26px_-12px_rgba(var(--gold-rgb),0.8)]"
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
