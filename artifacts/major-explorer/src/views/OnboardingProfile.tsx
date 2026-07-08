import { Sparkles, ChevronRight } from "lucide-react";
import { useGpaGoals, GpaGoalsControls } from "@/components/GpaGoals";
import type { UserProfile } from "@/lib/storage";

export default function OnboardingProfile({ initial, onComplete, onSkip }: {
  initial: UserProfile;
  onComplete: (p: UserProfile) => void;
  onSkip: () => void;
}) {
  const state = useGpaGoals(initial);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> One last thing
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">Personalize your college fit</h1>
          <p className="text-muted-foreground">Add your GPA and we'll flag every college as a Reach, Match, or Safety. You can change this anytime.</p>
        </div>
        <div className="glass-panel rounded-3xl border border-border shadow-sm p-8">
          <GpaGoalsControls state={state} />
          <button
            onClick={() => onComplete(state.profile)}
            disabled={!(state.gpaValid && state.satValid && state.actValid)}
            className="w-full mt-6 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-save-profile"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-6">
          <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" data-testid="button-skip-profile">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
