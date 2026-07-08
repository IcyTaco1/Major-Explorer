import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { QUIZ_VERSIONS, getMajorSuggestions, type QuizQuestion, type MajorSuggestion } from "@/lib/quiz";

export default function InterestQuiz({ onComplete }: { onComplete: (majors: MajorSuggestion[]) => void }) {
  const [questions] = useState<QuizQuestion[]>(
    () => QUIZ_VERSIONS[Math.floor(Math.random() * QUIZ_VERSIONS.length)]
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>("");

  const question = questions[step];
  const isLast = step === questions.length - 1;
  const progress = ((step) / questions.length) * 100;

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);
    setSelected("");
    if (isLast) {
      onComplete(getMajorSuggestions(newAnswers));
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    setSelected(answers[questions[step - 1].id] || "");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Quiz · {questions.length} questions
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">Find your perfect major</h1>
          <p className="text-muted-foreground">Answer a few quick questions and we'll suggest majors that match your interests.</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-border rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="glass-panel rounded-3xl border border-border shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                  selected === opt.value
                    ? "bg-primary border-primary text-primary-foreground"
                    : "glass-panel border-border text-foreground hover:border-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm text-muted-foreground font-medium">{step + 1} / {questions.length}</span>
          <button
            onClick={handleNext}
            disabled={!selected}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "See Results" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
