import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { Sparkles, ChevronRight } from "lucide-react";
import type { MajorSuggestion } from "@/lib/quiz";

export default function SuggestedView({ results, onExplore, onRetake }: {
  results: MajorSuggestion[];
  onExplore: (major: string) => void;
  onRetake: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <h3 className="text-xl font-bold text-foreground mb-2">No suggestions yet</h3>
        <p className="text-muted-foreground max-w-sm mb-8">Take the quiz to get personalized major recommendations based on your interests.</p>
        <button onClick={onRetake} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" /> Take the Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Suggested Majors</h2>
          <p className="text-muted-foreground mt-1">Based on your quiz answers — click any to explore it.</p>
        </div>
        <button
          onClick={onRetake}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-all glass-panel"
        >
          <Sparkles className="w-3.5 h-3.5" /> Retake Quiz
        </button>
      </div>
      <div className="space-y-3">
        {results.map((item, i) => (
          <TiltedCard key={item.major}>
            <RevealBorderGlow className="group">
            <button
              onClick={() => onExplore(item.major)}
              className="w-full flex items-start gap-4 p-5 text-left rounded-2xl"
            >
              <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0 font-sans">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-foreground text-lg">{item.major}</span>
                {item.reason && <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{item.reason}</span>}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-2.5" />
            </button>
            </RevealBorderGlow>
          </TiltedCard>
        ))}
      </div>
    </div>
  );
}
