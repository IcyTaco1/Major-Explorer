// ─── Filter chips (fit / selectivity) ─────────────────────────────────
export default function FilterChips({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mr-1 min-w-[68px]">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${value === o.value ? "bg-primary border-primary text-primary-foreground" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
          data-testid={`filter-${label.toLowerCase()}-${o.value}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
