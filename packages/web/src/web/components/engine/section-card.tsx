import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  glow = false,
}: SectionCardProps) {
  return (
    <section
      className={[
        "card-surface rounded-2xl p-5 sm:p-6",
        glow ? "border-gold/35 shadow-[0_0_40px_-18px_rgba(197,160,89,0.55)]" : "",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base sm:text-lg tracking-tight text-bone">
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
