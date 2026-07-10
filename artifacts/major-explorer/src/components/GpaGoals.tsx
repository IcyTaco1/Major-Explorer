import { useState } from "react";
import type { UserProfile } from "@/lib/storage";

// ─── Onboarding & profile (GPA + goals) ───────────────────────────────
export const GOAL_PRESETS = [
  "Maximize earning potential",
  "Job stability & growth",
  "Help people / social impact",
  "Get into grad or professional school",
  "Build or create things",
  "Start my own venture",
];

export const GRADE_OPTIONS = [
  { value: 9, label: "9th", name: "Freshman" },
  { value: 10, label: "10th", name: "Sophomore" },
  { value: 11, label: "11th", name: "Junior" },
  { value: 12, label: "12th", name: "Senior" },
] as const;

export function useGpaGoals(initial: UserProfile) {
  const [gradeLevel, setGradeLevel] = useState<number | null>(initial.gradeLevel ?? null);
  const [gpa, setGpa] = useState(initial.gpa == null ? "" : String(initial.gpa));
  const [sat, setSat] = useState(initial.sat == null ? "" : String(initial.sat));
  const [act, setAct] = useState(initial.act == null ? "" : String(initial.act));
  const [goals, setGoals] = useState(initial.goals);

  const gpaTrim = gpa.trim();
  const gpaNum = gpaTrim === "" ? null : Number(gpaTrim);
  const gpaValid = gpaNum == null || (Number.isFinite(gpaNum) && gpaNum >= 0 && gpaNum <= 4);

  const satTrim = sat.trim();
  const satNum = satTrim === "" ? null : Number(satTrim);
  const satValid = satNum == null || (Number.isFinite(satNum) && satNum >= 400 && satNum <= 1600);

  const actTrim = act.trim();
  const actNum = actTrim === "" ? null : Number(actTrim);
  const actValid = actNum == null || (Number.isFinite(actNum) && actNum >= 1 && actNum <= 36);

  const profile: UserProfile = {
    gradeLevel,
    gpa: gpaValid ? gpaNum : null,
    sat: satValid ? satNum : null,
    act: actValid ? actNum : null,
    goals: goals.trim(),
  };
  return { gradeLevel, setGradeLevel, gpa, setGpa, sat, setSat, act, setAct, goals, setGoals, gpaValid, satValid, actValid, profile };
}

export function GpaGoalsControls({ state }: { state: ReturnType<typeof useGpaGoals> }) {
  const { gradeLevel, setGradeLevel, gpa, setGpa, sat, setSat, act, setAct, goals, setGoals, gpaValid, satValid, actValid } = state;
  return (
    <div className="space-y-5 text-left">
      <div>
        <span className="block text-sm font-semibold text-foreground mb-1.5">
          Your grade <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {GRADE_OPTIONS.map(({ value, label, name }) => {
            const active = gradeLevel === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setGradeLevel(active ? null : value)}
                className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${active ? "bg-primary border-primary text-primary-foreground" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                data-testid={`button-grade-${value}`}
              >
                {label} <span className="font-normal opacity-80">· {name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Powers your College Prep Roadmap. Saved privately to your account.</p>
      </div>
      <div>
        <label htmlFor="gpa-input" className="block text-sm font-semibold text-foreground mb-1.5">
          Your GPA <span className="font-normal text-muted-foreground">(unweighted, 4.0 scale)</span>
        </label>
        <input
          id="gpa-input"
          type="number"
          inputMode="decimal"
          min="0"
          max="4"
          step="0.01"
          value={gpa}
          onChange={(e) => setGpa(e.target.value)}
          placeholder="e.g. 3.7"
          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${gpaValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
          data-testid="input-gpa"
        />
        {!gpaValid && <p className="text-xs text-rose-500 mt-1.5">Enter a GPA between 0 and 4.0.</p>}
        <p className="text-xs text-muted-foreground mt-1.5">Saved privately to your account to estimate Reach / Match / Safety.</p>
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground mb-1.5">
          Test scores <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sat-input" className="block text-xs font-medium text-muted-foreground mb-1">SAT total (400–1600)</label>
            <input
              id="sat-input"
              type="number"
              inputMode="numeric"
              min="400"
              max="1600"
              step="10"
              value={sat}
              onChange={(e) => setSat(e.target.value)}
              placeholder="e.g. 1350"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${satValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
              data-testid="input-sat"
            />
            {!satValid && <p className="text-xs text-rose-500 mt-1.5">400–1600.</p>}
          </div>
          <div>
            <label htmlFor="act-input" className="block text-xs font-medium text-muted-foreground mb-1">ACT composite (1–36)</label>
            <input
              id="act-input"
              type="number"
              inputMode="numeric"
              min="1"
              max="36"
              step="1"
              value={act}
              onChange={(e) => setAct(e.target.value)}
              placeholder="e.g. 30"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${actValid ? "border-border focus:border-primary" : "border-rose-300 focus:border-rose-500"}`}
              data-testid="input-act"
            />
            {!actValid && <p className="text-xs text-rose-500 mt-1.5">1–36.</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Add either or both to see how you compare with each college's typical admitted students. Saved privately to your account.</p>
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground mb-2">
          What matters most to you? <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {GOAL_PRESETS.map((g) => {
            const active = goals === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoals(active ? "" : g)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary border-primary text-primary-foreground" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground"}`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Or describe your goals in your own words…"
          className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
          data-testid="input-goals"
        />
      </div>
    </div>
  );
}
