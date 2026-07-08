import { useLocation } from "wouter";
import GlassSurface from "@/components/GlassSurface";
import { Milestone, Sparkles, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-border glass-panel shadow-sm">
        <div className="flex items-center gap-2">
          <Milestone className="w-5 h-5 text-foreground" />
          <span className="font-display font-bold text-lg tracking-tight text-foreground">Next Steps</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/sign-in")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted">
            Sign in
          </button>
          <button onClick={() => setLocation("/sign-up")} className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-primary/90 transition-colors">
            Get started
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <GlassSurface width={300} height={40} borderRadius={20} className="mb-6">
          <span className="inline-flex items-center gap-2 text-muted-foreground text-xs font-semibold whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered college major explorer
          </span>
        </GlassSurface>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight max-w-3xl">
          Find the major that's right for you.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
          Take a quick quiz, get personalized major recommendations, and explore the top US universities for any field.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button onClick={() => setLocation("/sign-up")} className="flex items-center gap-2 bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-full hover:bg-primary/90 transition-colors shadow-lg">
            Start for free <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setLocation("/sign-in")} className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors">
            Already have an account →
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { title: "Personalized quiz", desc: "Answer 5 quick questions to get matched with majors that fit your interests and strengths." },
            { title: "Top 10 colleges", desc: "Instantly see the top US universities for any major, with highlights on what makes each one great." },
            { title: "4-year course plan", desc: "Click any college to see a realistic 4-year course plan tailored to your major." },
          ].map(({ title, desc }) => (
            <div key={title} className="glass-panel rounded-2xl border border-border p-6 text-left shadow-sm">
              <h3 className="font-display font-bold text-foreground text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
