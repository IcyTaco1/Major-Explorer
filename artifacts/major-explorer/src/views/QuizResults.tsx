import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import { ChevronRight } from "lucide-react";
import type { MajorSuggestion } from "@/lib/quiz";

export default function QuizResults({ majors, onExplore, onDismiss }: { majors: MajorSuggestion[]; onExplore: (major: string) => void; onDismiss: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Your top matches!</h1>
        <p className="text-muted-foreground mb-8">Based on your interests, here are the majors we think you'll love — and why. Click one to explore it.</p>
        <div className="space-y-3 mb-8">
          {majors.map((item, i) => (
            <TiltedCard key={item.major}>
              <RevealBorderGlow className="group">
              <button
                onClick={() => onExplore(item.major)}
                className="w-full flex items-start gap-4 p-5 text-left rounded-2xl"
              >
                <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-serif font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif font-bold text-foreground text-lg">{item.major}</span>
                  {item.reason && <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{item.reason}</span>}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-2.5" />
              </button>
              </RevealBorderGlow>
            </TiltedCard>
          ))}
        </div>
        <button onClick={onDismiss} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
          Skip and explore on my own
        </button>
      </div>
    </div>
  );
}
