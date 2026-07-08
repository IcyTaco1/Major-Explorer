import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import TiltedCard from "@/components/TiltedCard";
import RevealBorderGlow from "@/components/RevealBorderGlow";
import {
  BookOpen, ClipboardList, Users, Compass, Sun, Milestone,
  AlertCircle, RotateCcw, Check, type LucideIcon,
} from "lucide-react";

interface RoadmapSection {
  icon: LucideIcon;
  title: string;
  items: string[];
}

interface GradeRoadmap {
  name: string;
  headline: string;
  sections: RoadmapSection[];
}

const ROADMAPS: Record<number, GradeRoadmap> = {
  9: {
    name: "Freshman",
    headline: "Build strong foundations — your GPA starts counting now.",
    sections: [
      {
        icon: BookOpen, title: "Academics",
        items: [
          "Start strong: freshman grades count toward the GPA colleges see.",
          "Take the most challenging courses you can handle comfortably.",
          "Build good study habits and relationships with your teachers.",
          "Explore electives to discover subjects you genuinely enjoy.",
        ],
      },
      {
        icon: Users, title: "Activities & Leadership",
        items: [
          "Join 2–3 clubs, sports, or activities that actually interest you.",
          "Depth beats breadth — colleges prefer commitment over collecting clubs.",
          "Start volunteering in your community and log your hours.",
        ],
      },
      {
        icon: Compass, title: "College Planning",
        items: [
          "Start an activity log — track awards, roles, and volunteer hours.",
          "Meet your school counselor and share your early goals.",
          "Use the Explore tab to browse majors that match your interests.",
        ],
      },
      {
        icon: Sun, title: "Summer",
        items: [
          "Try a summer camp, class, or volunteer project in an area of interest.",
          "Read widely — strong readers become strong test-takers and writers.",
          "Start a personal project or hobby you can grow over four years.",
        ],
      },
    ],
  },
  10: {
    name: "Sophomore",
    headline: "Step up the rigor and start your testing timeline.",
    sections: [
      {
        icon: BookOpen, title: "Academics",
        items: [
          "Move into honors or AP/IB courses where you're ready.",
          "Keep your GPA trending up — improvement over time matters.",
          "Ask for help early if a class gets difficult.",
        ],
      },
      {
        icon: ClipboardList, title: "Standardized Testing",
        items: [
          "Take the PSAT 10 for low-stakes practice.",
          "Sketch your SAT/ACT plan: first real test junior spring.",
          "Try a practice test of each to see which format suits you.",
        ],
      },
      {
        icon: Users, title: "Activities & Leadership",
        items: [
          "Deepen your involvement — aim for a leadership role or bigger responsibility.",
          "Consider a part-time job, internship, or a passion project.",
        ],
      },
      {
        icon: Compass, title: "College Planning",
        items: [
          "Attend a college fair or virtual info sessions.",
          "Start a rough college list — save colleges you like to My Colleges.",
          "Compare majors you're considering in the Compare tab.",
        ],
      },
      {
        icon: Sun, title: "Summer",
        items: [
          "Apply to a pre-college summer program or take a community college class.",
          "Begin light SAT/ACT prep — 30 minutes a few times a week is plenty.",
          "Visit a nearby campus or two to get a feel for college environments.",
        ],
      },
    ],
  },
  11: {
    name: "Junior",
    headline: "The big year — grades, tests, and your college list all peak now.",
    sections: [
      {
        icon: BookOpen, title: "Academics",
        items: [
          "Take your most rigorous course load — junior year matters most to admissions.",
          "Protect your GPA: this is the last full year colleges see before you apply.",
          "Prepare seriously for May AP/IB exams.",
        ],
      },
      {
        icon: ClipboardList, title: "Standardized Testing",
        items: [
          "Take the PSAT/NMSQT in October — it's the National Merit qualifier.",
          "Take your first SAT or ACT in winter or spring.",
          "Plan a retake for early fall of senior year if you want a higher score.",
        ],
      },
      {
        icon: Users, title: "Activities & Leadership",
        items: [
          "Pursue leadership positions in your main activities.",
          "Enter competitions, apply for awards, and document everything.",
        ],
      },
      {
        icon: Compass, title: "College Planning",
        items: [
          "Build a balanced college list: reaches, matches, and safeties (use the fit badges).",
          "Visit campuses over breaks — official tours or self-guided.",
          "Ask two teachers for recommendation letters before summer break.",
          "Track application deadlines for each college in My Colleges.",
        ],
      },
      {
        icon: Sun, title: "Summer",
        items: [
          "Draft your personal essay — have a full draft before senior year starts.",
          "Finalize your college list and note ED/EA deadlines.",
          "Do something meaningful: internship, job, research, or a capstone project.",
        ],
      },
    ],
  },
  12: {
    name: "Senior",
    headline: "Execute: applications, deadlines, and the finish line.",
    sections: [
      {
        icon: Compass, title: "Applications (Fall)",
        items: [
          "Finalize your list and enter every deadline in My Colleges.",
          "Early Decision / Early Action deadlines are usually Nov 1 or Nov 15.",
          "Polish your essays — get feedback from a teacher or counselor.",
          "Confirm your recommendation letters are submitted.",
        ],
      },
      {
        icon: ClipboardList, title: "Testing & Financial Aid",
        items: [
          "Last SAT/ACT retakes: September–October for early apps, December for regular.",
          "Submit the FAFSA as soon as it opens — aid can be first-come, first-served.",
          "Complete the CSS Profile for colleges that require it.",
          "Apply for local and national scholarships all year.",
        ],
      },
      {
        icon: BookOpen, title: "Academics",
        items: [
          "Keep your grades up — offers can be rescinded for a weak final semester.",
          "Finish strong on AP/IB exams; credits can save tuition.",
        ],
      },
      {
        icon: Milestone, title: "Decisions (Spring)",
        items: [
          "Regular Decision results arrive March–April.",
          "Compare financial aid offers side by side before choosing.",
          "Commit by May 1 (National College Decision Day).",
          "Update your application statuses in My Colleges as results come in.",
        ],
      },
      {
        icon: Sun, title: "Summer",
        items: [
          "Complete orientation, housing, and course registration for your college.",
          "Send your final transcript and AP scores.",
          "Celebrate — and thank the teachers who wrote your recommendations.",
        ],
      },
    ],
  },
};

const GRADES = [9, 10, 11, 12] as const;

export default function RoadmapView() {
  const qc = useQueryClient();
  const meQuery = useGetMe();
  const updateMe = useUpdateMe();

  const gradeLevel = meQuery.data?.gradeLevel ?? null;

  const selectGrade = (grade: number) => {
    updateMe.mutate(
      { data: { gradeLevel: grade } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }) },
    );
  };

  if (meQuery.isPending) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-10">
        <div className="h-8 bg-muted rounded w-56 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-80 mb-8 animate-pulse" />
        <div className="glass-panel rounded-2xl border border-border p-6 animate-pulse">
          <div className="h-5 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">Couldn't load your roadmap</h3>
        <p className="text-muted-foreground max-w-sm mb-5">Something went wrong. Please try again.</p>
        <button onClick={() => meQuery.refetch()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const roadmap = gradeLevel != null ? ROADMAPS[gradeLevel] : undefined;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-foreground">College Prep Roadmap</h2>
        <p className="text-muted-foreground mt-1">A grade-by-grade plan to stay on track for college.</p>
      </div>

      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {gradeLevel == null ? "What grade are you in?" : "Your grade"}
        </p>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => {
            const active = gradeLevel === g;
            return (
              <button
                key={g}
                disabled={updateMe.isPending}
                onClick={() => selectGrade(g)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-60 ${active ? "bg-primary border-primary text-primary-foreground" : "glass-panel border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                data-testid={`button-grade-${g}`}
              >
                {g}th grade{active ? "" : ""} · {ROADMAPS[g].name}
              </button>
            );
          })}
        </div>
        {gradeLevel != null && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Check className="w-3.5 h-3.5 text-emerald-500" /> Saved to your profile
          </p>
        )}
      </div>

      {roadmap == null ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <Milestone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-serif text-foreground font-bold mb-2">Pick your grade to see your roadmap</h3>
          <p className="text-muted-foreground max-w-sm">We'll show you exactly what to focus on this year — classes, tests, activities, and college planning.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="text-xl font-serif font-bold text-foreground">{roadmap.name} year</h3>
            <p className="text-muted-foreground mt-0.5">{roadmap.headline}</p>
          </div>
          <div className="space-y-5">
            {roadmap.sections.map((section) => {
              const Icon = section.icon;
              return (
                <TiltedCard key={section.title}>
                  <RevealBorderGlow>
                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 md:px-6 py-4 bg-background border-b border-border">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <h4 className="font-serif font-bold text-foreground text-base">{section.title}</h4>
                    </div>
                    <ul className="px-5 md:px-6 py-4 space-y-2.5">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <span className="text-sm text-foreground leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  </RevealBorderGlow>
                </TiltedCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
