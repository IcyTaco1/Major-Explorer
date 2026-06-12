import { useState, useEffect, useCallback, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLookupMajor, useGetMajorCurriculum, useChat } from "@workspace/api-client-react";
import type { College, CurriculumResponse, ChatMessage } from "@workspace/api-client-react";
import {
  Search, GraduationCap, MapPin, Milestone, AlertCircle, X,
  ChevronRight, ChevronDown, ChevronUp, Bookmark, BookmarkCheck,
  Trash2, SortAsc, MessageCircle, Send, Bot, Check, DollarSign,
  LogOut, User, ChevronLeft, Sparkles
} from "lucide-react";
import NotFound from "@/pages/not-found";

// ─── Clerk setup ──────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0f172a",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#e2e8f0",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-serif font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-slate-900 font-semibold hover:text-slate-700",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-slate-900",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "flex justify-center mb-2",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50",
    formButtonPrimary: "bg-slate-900 hover:bg-slate-700 text-white font-semibold",
    formFieldInput: "bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800 focus:ring-slate-800",
    footerAction: "border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border border-red-100",
    otpCodeFieldInput: "border-slate-200",
    formFieldRow: "",
    main: "",
  },
  signUp: {
    elements: {
      socialButtons: "hidden",
      socialButtonsBlockButton: "hidden",
      socialButtonsIconButton: "hidden",
      dividerRow: "hidden",
    },
  },
};

// ─── QueryClient ──────────────────────────────────────────────────────
const queryClient = new QueryClient();

// ─── Types & Storage ─────────────────────────────────────────────────
interface SavedCollege extends College { savedAt: number; }
interface SavedMajor {
  majorName: string;
  description: string;
  savedAt: number;
  colleges: SavedCollege[];
}
type SavedData = Record<string, SavedMajor>;

interface MyCollege extends College {
  majorName: string;
  savedAt: number;
}

const SAVED_KEY = "declare-saved-majors";
const MY_COLLEGES_KEY = "next-steps-my-colleges";
const QUIZ_DONE_KEY = "next-steps-quiz-done";
const QUIZ_RESULTS_KEY = "next-steps-quiz-results";

function loadSaved(): SavedData {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") ?? {}; }
  catch { return {}; }
}
function persistSaved(data: SavedData) { localStorage.setItem(SAVED_KEY, JSON.stringify(data)); }
function loadMyColleges(): MyCollege[] {
  try { return JSON.parse(localStorage.getItem(MY_COLLEGES_KEY) ?? "[]") ?? []; }
  catch { return []; }
}
function persistMyColleges(data: MyCollege[]) { localStorage.setItem(MY_COLLEGES_KEY, JSON.stringify(data)); }

// ─── Interest Quiz ────────────────────────────────────────────────────
interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  options: { label: string; value: string }[];
}

// Five indirect, scenario-based quiz versions. Each version asks about the same
// five dimensions (activity, environment, strength, impact, subject) using the
// same answer `value`s, so getMajorSuggestions works identically across them.
const QUIZ_VERSIONS: QuizQuestion[][] = [
  // ── Version 1 · "A day in your life" ──────────────────────────────────
  [
    {
      id: "activity",
      question: "You finally have a free weekend. What are you itching to do?",
      emoji: "🌅",
      options: [
        { label: "Take something apart to see how it works", value: "building" },
        { label: "Show up for a friend who needs me", value: "helping" },
        { label: "Get lost in a puzzle or strategy game", value: "analyzing" },
        { label: "Write, paint, film, or design something", value: "creating" },
        { label: "Plan an event or start a side hustle", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Picture the space where you feel most 'in the zone.'",
      emoji: "🪟",
      options: [
        { label: "A quiet lab surrounded by experiments", value: "lab" },
        { label: "Outdoors, moving between people and places", value: "field" },
        { label: "A cozy desk with my screens and headphones", value: "desk" },
        { label: "A busy clinic helping people one-on-one", value: "clinic" },
        { label: "A new city every few months — no fixed desk", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "Your friends always come to you for…?",
      emoji: "🤝",
      options: [
        { label: "Cracking a tricky logic or numbers problem", value: "math" },
        { label: "Putting their messy thoughts into words", value: "writing" },
        { label: "A listening ear and honest advice", value: "empathy" },
        { label: "Making something look amazing", value: "design" },
        { label: "Getting them organized and on track", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "In 20 years, you'd be proudest if you had…?",
      emoji: "🏆",
      options: [
        { label: "Invented something that pushes tech forward", value: "science" },
        { label: "Helped thousands live healthier lives", value: "health" },
        { label: "Changed a law that makes life fairer", value: "policy" },
        { label: "Built a business that created jobs", value: "economy" },
        { label: "Moved people with a story or work of art", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which class never really felt like work?",
      emoji: "📖",
      options: [
        { label: "Science labs (Bio, Chem, Physics)", value: "science" },
        { label: "Math problem sets", value: "math" },
        { label: "English and literature discussions", value: "english" },
        { label: "History and social studies debates", value: "history" },
        { label: "Art, music, or theater", value: "art" },
      ],
    },
  ],
  // ── Version 2 · "Startup roleplay" ────────────────────────────────────
  [
    {
      id: "activity",
      question: "You join a scrappy startup. Which role do you grab first?",
      emoji: "🚀",
      options: [
        { label: "The one who builds the actual product", value: "building" },
        { label: "The one who supports the team and customers", value: "helping" },
        { label: "The one who reads the data and finds insights", value: "analyzing" },
        { label: "The one who shapes the brand and content", value: "creating" },
        { label: "The one who sets the vision and runs it", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "On the office tour, which room makes you go 'yes, this one'?",
      emoji: "🚪",
      options: [
        { label: "The research lab full of equipment", value: "lab" },
        { label: "There's no office — you're always on site", value: "field" },
        { label: "The quiet focus pods with big monitors", value: "desk" },
        { label: "The care rooms where people get helped", value: "clinic" },
        { label: "The airport lounge — you work while traveling", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "A group project is falling apart. What do you bring?",
      emoji: "🧩",
      options: [
        { label: "Logic to crack the hard technical part", value: "math" },
        { label: "Clear writing to pull it all together", value: "writing" },
        { label: "Calm to keep everyone getting along", value: "empathy" },
        { label: "A creative spark to make it stand out", value: "design" },
        { label: "A plan and timeline to save it", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "A genie grants one change to the world. You pick…?",
      emoji: "🧞",
      options: [
        { label: "Faster scientific breakthroughs", value: "science" },
        { label: "Healthier people everywhere", value: "health" },
        { label: "Fairer laws and systems", value: "policy" },
        { label: "Opportunity and jobs for all", value: "economy" },
        { label: "More beauty, stories, and culture", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Flipping through old report cards, your eyes light up at…?",
      emoji: "🗂️",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art, Music, or Theater", value: "art" },
      ],
    },
  ],
  // ── Version 3 · "Media & vibes" ───────────────────────────────────────
  [
    {
      id: "activity",
      question: "What kind of video rabbit hole do you fall into?",
      emoji: "📺",
      options: [
        { label: "How things are made / engineering builds", value: "building" },
        { label: "Heartwarming stories and self-improvement", value: "helping" },
        { label: "Deep-dive explainers and breakdowns", value: "analyzing" },
        { label: "Art, film-making, and creative tutorials", value: "creating" },
        { label: "Business, startups, and success stories", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Your ideal commute ends at…?",
      emoji: "🚇",
      options: [
        { label: "A lab with your name on a project", value: "lab" },
        { label: "Wherever the work takes you that day", value: "field" },
        { label: "A calm room with your setup dialed in", value: "desk" },
        { label: "A place where people are waiting for your help", value: "clinic" },
        { label: "A different time zone — you work remote", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "Pick the 'superpower' that already feels kind of real for you:",
      emoji: "⚡",
      options: [
        { label: "Solving any number or logic puzzle", value: "math" },
        { label: "Saying exactly the right thing", value: "writing" },
        { label: "Sensing how someone really feels", value: "empathy" },
        { label: "Seeing the beauty in everything", value: "design" },
        { label: "Turning chaos into a clean plan", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "Which headline would you most want to be about you?",
      emoji: "📰",
      options: [
        { label: "'Breakthrough discovery changes the field'", value: "science" },
        { label: "'New approach saves countless lives'", value: "health" },
        { label: "'Landmark law passes after years of work'", value: "policy" },
        { label: "'Company hits milestone, hiring thousands'", value: "economy" },
        { label: "'Debut work captivates audiences everywhere'", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which homework did you secretly enjoy?",
      emoji: "✏️",
      options: [
        { label: "Science labs and reports", value: "science" },
        { label: "Math problem sets", value: "math" },
        { label: "Essays and reading", value: "english" },
        { label: "History projects", value: "history" },
        { label: "Studio or performance work", value: "art" },
      ],
    },
  ],
  // ── Version 4 · "Desert island" ───────────────────────────────────────
  [
    {
      id: "activity",
      question: "Stranded on an island with a group — what's your job?",
      emoji: "🏝️",
      options: [
        { label: "Build the shelter and tools", value: "building" },
        { label: "Keep everyone's spirits and health up", value: "helping" },
        { label: "Map the island and ration resources", value: "analyzing" },
        { label: "Document the journey and keep morale high", value: "creating" },
        { label: "Take charge and coordinate everyone", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "Where do you do your best thinking?",
      emoji: "💭",
      options: [
        { label: "Somewhere precise and controlled", value: "lab" },
        { label: "Out in the real world, hands-on", value: "field" },
        { label: "Alone with my screen and zero distractions", value: "desk" },
        { label: "Around people who need me", value: "clinic" },
        { label: "On the move — trains, planes, cafes", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "What's the compliment you get most often?",
      emoji: "💬",
      options: [
        { label: "'You're so logical'", value: "math" },
        { label: "'You explain things really well'", value: "writing" },
        { label: "'You really get me'", value: "empathy" },
        { label: "'You have great taste'", value: "design" },
        { label: "'You're so organized'", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "What problem keeps you up at night wanting to fix it?",
      emoji: "🌙",
      options: [
        { label: "Unsolved science and tech challenges", value: "science" },
        { label: "People suffering from illness", value: "health" },
        { label: "Unfair rules and broken systems", value: "policy" },
        { label: "Lack of jobs and opportunity", value: "economy" },
        { label: "A world that needs more beauty and stories", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "If school had only one subject forever, you'd pick…?",
      emoji: "🎓",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art / Music / Theater", value: "art" },
      ],
    },
  ],
  // ── Version 5 · "Your phone & browser tabs" ───────────────────────────
  [
    {
      id: "activity",
      question: "Your phone's most-used app is probably…?",
      emoji: "📱",
      options: [
        { label: "A tinkering, DIY, or coding app", value: "building" },
        { label: "Messaging — I'm always checking on people", value: "helping" },
        { label: "A stats, finance, or strategy app", value: "analyzing" },
        { label: "A photo, video, or design app", value: "creating" },
        { label: "A productivity or business app", value: "leading" },
      ],
    },
    {
      id: "environment",
      question: "A dream job listing pops up. Which location line sells you?",
      emoji: "🧭",
      options: [
        { label: "'On-site research laboratory'", value: "lab" },
        { label: "'Fieldwork / travel required'", value: "field" },
        { label: "'Remote, deep-focus role'", value: "desk" },
        { label: "'Hospital / clinical setting'", value: "clinic" },
        { label: "'Work from anywhere in the world'", value: "anywhere" },
      ],
    },
    {
      id: "strength",
      question: "You've got 50 browser tabs open. Most are about…?",
      emoji: "🗂️",
      options: [
        { label: "Puzzles, data, and how things work", value: "math" },
        { label: "Articles, blogs, and things to read", value: "writing" },
        { label: "Advice, relationships, and people", value: "empathy" },
        { label: "Design inspiration and aesthetics", value: "design" },
        { label: "To-do systems and planners", value: "planning" },
      ],
    },
    {
      id: "impact",
      question: "You're given a TED talk. Your topic is…?",
      emoji: "🎤",
      options: [
        { label: "The next big scientific frontier", value: "science" },
        { label: "How we can all live healthier", value: "health" },
        { label: "Fixing a broken system", value: "policy" },
        { label: "Building businesses that lift people up", value: "economy" },
        { label: "Why stories and art matter", value: "art" },
      ],
    },
    {
      id: "subject",
      question: "Which textbook would you actually keep?",
      emoji: "📚",
      options: [
        { label: "Science", value: "science" },
        { label: "Math", value: "math" },
        { label: "English / Literature", value: "english" },
        { label: "History / Social Studies", value: "history" },
        { label: "Art / Music / Theater", value: "art" },
      ],
    },
  ],
];

// Most-awarded U.S. bachelor's degree fields, ordered by popularity.
// Source: NCES Digest of Education Statistics 2021–22 (Table 322.10 /
// Fast Facts #37): Business, Health Professions, Social Sciences & History,
// Biological Sciences, Psychology, Computer & Information Sciences,
// Engineering, Communication & Journalism. Mapped to recognizable major names.
const POPULAR_MAJORS = [
  "Business",
  "Nursing",
  "Political Science",
  "Biology",
  "Psychology",
  "Computer Science",
  "Mechanical Engineering",
  "Communications",
];

// ─── Major recommender ────────────────────────────────────────────────
// Every major is tagged with the answer `value`s it aligns with across all
// five quiz dimensions. We score each major against the user's actual
// selections so recommendations reflect everything they picked — not just
// one or two answers.
interface MajorProfile {
  name: string;
  activity: string[];
  environment: string[];
  strength: string[];
  impact: string[];
  subject: string[];
}

const MAJOR_CATALOG: MajorProfile[] = [
  { name: "Mechanical Engineering", activity: ["building"], environment: ["lab", "field"], strength: ["math"], impact: ["science"], subject: ["science", "math"] },
  { name: "Electrical Engineering", activity: ["building"], environment: ["lab", "desk"], strength: ["math"], impact: ["science"], subject: ["math", "science"] },
  { name: "Chemical Engineering", activity: ["building", "analyzing"], environment: ["lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Computer Science", activity: ["building", "analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math", "science"] },
  { name: "Software Engineering", activity: ["building"], environment: ["desk"], strength: ["math", "planning"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Information Technology", activity: ["building"], environment: ["desk"], strength: ["planning", "math"], impact: ["economy"], subject: ["math"] },
  { name: "Civil Engineering", activity: ["building"], environment: ["field"], strength: ["math", "planning"], impact: ["science"], subject: ["math", "science"] },
  { name: "Architecture", activity: ["building", "creating"], environment: ["field", "desk"], strength: ["design", "math"], impact: ["art", "science"], subject: ["art", "math"] },
  { name: "Environmental Engineering", activity: ["building", "analyzing"], environment: ["field", "lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Nursing", activity: ["helping"], environment: ["clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Pre-Medicine", activity: ["helping", "analyzing"], environment: ["clinic", "lab"], strength: ["empathy", "math"], impact: ["health", "science"], subject: ["science"] },
  { name: "Physical Therapy", activity: ["helping"], environment: ["clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Social Work", activity: ["helping"], environment: ["field"], strength: ["empathy"], impact: ["policy", "health"], subject: ["history"] },
  { name: "Public Health", activity: ["helping", "analyzing"], environment: ["field", "desk"], strength: ["empathy", "planning"], impact: ["health", "policy"], subject: ["science"] },
  { name: "Education", activity: ["helping"], environment: ["field"], strength: ["empathy", "writing"], impact: ["policy"], subject: ["english", "history"] },
  { name: "Psychology", activity: ["helping", "analyzing"], environment: ["desk", "clinic"], strength: ["empathy"], impact: ["health"], subject: ["science"] },
  { name: "Human Resources", activity: ["helping", "leading"], environment: ["desk"], strength: ["empathy", "planning"], impact: ["economy"], subject: ["history"] },
  { name: "Counseling", activity: ["helping"], environment: ["desk", "clinic"], strength: ["empathy"], impact: ["health"], subject: ["english"] },
  { name: "Data Science", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Finance", activity: ["analyzing", "leading"], environment: ["desk"], strength: ["math", "planning"], impact: ["economy"], subject: ["math"] },
  { name: "Economics", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["economy", "policy"], subject: ["math", "history"] },
  { name: "Biochemistry", activity: ["analyzing"], environment: ["lab"], strength: ["math"], impact: ["science", "health"], subject: ["science"] },
  { name: "Statistics", activity: ["analyzing"], environment: ["desk"], strength: ["math"], impact: ["science", "economy"], subject: ["math"] },
  { name: "Neuroscience", activity: ["analyzing"], environment: ["lab"], strength: ["math", "empathy"], impact: ["science", "health"], subject: ["science"] },
  { name: "Graphic Design", activity: ["creating"], environment: ["desk", "anywhere"], strength: ["design"], impact: ["art"], subject: ["art"] },
  { name: "Film Studies", activity: ["creating"], environment: ["anywhere"], strength: ["design", "writing"], impact: ["art"], subject: ["art", "english"] },
  { name: "Creative Writing", activity: ["creating"], environment: ["anywhere", "desk"], strength: ["writing"], impact: ["art"], subject: ["english"] },
  { name: "UX Design", activity: ["creating", "analyzing"], environment: ["desk"], strength: ["design"], impact: ["art", "economy"], subject: ["art"] },
  { name: "Digital Media", activity: ["creating"], environment: ["desk", "anywhere"], strength: ["design", "writing"], impact: ["art"], subject: ["art"] },
  { name: "Communications", activity: ["creating", "leading"], environment: ["desk", "anywhere"], strength: ["writing"], impact: ["art", "policy"], subject: ["english"] },
  { name: "Business Administration", activity: ["leading"], environment: ["desk"], strength: ["planning"], impact: ["economy"], subject: ["math", "history"] },
  { name: "Marketing", activity: ["leading", "creating"], environment: ["desk"], strength: ["planning", "design", "writing"], impact: ["economy"], subject: ["english"] },
  { name: "Entrepreneurship", activity: ["leading", "building"], environment: ["anywhere", "desk"], strength: ["planning"], impact: ["economy"], subject: ["math"] },
  { name: "International Business", activity: ["leading"], environment: ["anywhere"], strength: ["planning"], impact: ["economy", "policy"], subject: ["history"] },
  { name: "Political Science", activity: ["leading", "analyzing"], environment: ["anywhere", "desk"], strength: ["writing", "planning"], impact: ["policy"], subject: ["history"] },
  { name: "Law", activity: ["leading", "analyzing"], environment: ["desk"], strength: ["writing"], impact: ["policy"], subject: ["history", "english"] },
];

// Concise phrases describing each selection, used to explain matches.
const SEL_ACTIVITY: Record<string, string> = {
  building: "building and fixing things", helping: "helping people", analyzing: "analyzing data and patterns", creating: "creating and designing", leading: "leading projects",
};
const SEL_ENVIRONMENT: Record<string, string> = {
  lab: "working in a lab", field: "being out in the field", desk: "focused desk work", clinic: "working in a clinic", anywhere: "the freedom to work anywhere",
};
const SEL_STRENGTH: Record<string, string> = {
  math: "your math and logic skills", writing: "your writing ability", empathy: "your empathy", design: "your eye for design", planning: "your organization skills",
};
const SEL_IMPACT: Record<string, string> = {
  science: "advancing science", health: "improving health", policy: "shaping policy", economy: "growing the economy", art: "inspiring through art",
};
const SEL_SUBJECT: Record<string, string> = {
  science: "your love of science", math: "your love of math", english: "your love of English", history: "your love of history", art: "your love of art",
};

// Each dimension contributes to the score; activity weighted highest.
const DIMENSIONS: { key: keyof Omit<MajorProfile, "name">; weight: number; labels: Record<string, string> }[] = [
  { key: "activity", weight: 3, labels: SEL_ACTIVITY },
  { key: "environment", weight: 2, labels: SEL_ENVIRONMENT },
  { key: "strength", weight: 2, labels: SEL_STRENGTH },
  { key: "impact", weight: 2, labels: SEL_IMPACT },
  { key: "subject", weight: 2, labels: SEL_SUBJECT },
];

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getMajorSuggestions(answers: Record<string, string>): MajorSuggestion[] {
  const scored = MAJOR_CATALOG.map((major) => {
    let score = 0;
    const matched: string[] = [];
    for (const dim of DIMENSIONS) {
      const answer = answers[dim.key];
      if (answer && major[dim.key].includes(answer)) {
        score += dim.weight;
        const phrase = dim.labels[answer];
        if (phrase) matched.push(phrase);
      }
    }
    return { major, score, matched };
  });

  // Highest score first; preserve catalog order for ties (stable sort).
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ major, matched }) => {
    const top = matched.slice(0, 3);
    const reason = top.length > 0
      ? `Matches ${joinList(top)} from your answers.`
      : "A well-rounded option based on your overall answers.";
    return { major: major.name, reason };
  });
}

interface MajorSuggestion { major: string; reason: string; }

function InterestQuiz({ onComplete }: { onComplete: (majors: MajorSuggestion[]) => void }) {
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Quiz · {questions.length} questions
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-3">Find your perfect major</h1>
          <p className="text-slate-500">Answer a few quick questions and we'll suggest majors that match your interests.</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="bg-slate-900 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
          <div className="text-4xl mb-4 text-center">{question.emoji}</div>
          <h2 className="text-xl font-serif font-bold text-slate-900 text-center mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                  selected === opt.value
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
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
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm text-slate-400 font-medium">{step + 1} / {questions.length}</span>
          <button
            onClick={handleNext}
            disabled={!selected}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "See Results" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Results splash ──────────────────────────────────────────────
function QuizResults({ majors, onExplore, onDismiss }: { majors: MajorSuggestion[]; onExplore: (major: string) => void; onDismiss: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="text-5xl mb-5">🎉</div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-3">Your top matches!</h1>
        <p className="text-slate-500 mb-8">Based on your interests, here are the majors we think you'll love — and why. Click one to explore it.</p>
        <div className="space-y-3 mb-8">
          {majors.map((item, i) => (
            <button
              key={item.major}
              onClick={() => onExplore(item.major)}
              className="w-full flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-slate-400 hover:shadow-md transition-all group"
            >
              <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-serif font-bold text-lg flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-serif font-bold text-slate-900 text-lg">{item.major}</span>
                {item.reason && <span className="block text-sm text-slate-500 mt-1 leading-relaxed">{item.reason}</span>}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-700 transition-colors flex-shrink-0 mt-2.5" />
            </button>
          ))}
        </div>
        <button onClick={onDismiss} className="text-sm text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2">
          Skip and explore on my own
        </button>
      </div>
    </div>
  );
}

// ─── Curriculum Modal ────────────────────────────────────────────────
function CurriculumModal({ college, major, onClose }: { college: College; major: string; onClose: () => void }) {
  const getCurriculum = useGetMajorCurriculum();
  useEffect(() => { getCurriculum.mutate({ data: { major, college: college.name } }); }, []);

  const curriculum = getCurriculum.data as CurriculumResponse | undefined;
  const yearColors = [
    { bg: "bg-blue-50", border: "border-blue-100", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-400" },
    { bg: "bg-indigo-50", border: "border-indigo-100", badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-400" },
    { bg: "bg-violet-50", border: "border-violet-100", badge: "bg-violet-100 text-violet-800", dot: "bg-violet-400" },
    { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-900 text-white", dot: "bg-slate-600" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full md:max-w-2xl max-h-[90vh] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-400" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{major}</span>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 leading-tight mt-1">{college.name}</h2>
            <div className="flex items-center text-slate-500 mt-1 text-sm"><MapPin className="w-3.5 h-3.5 mr-1" />{college.location}</div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-slate-600" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          {getCurriculum.isPending && (
            <div className="space-y-6 animate-pulse">
              {[1,2,3,4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-32" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  {[1,2,3].map((j) => <div key={j} className="h-4 bg-slate-100 rounded w-full" />)}
                </div>
              ))}
            </div>
          )}
          {getCurriculum.isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-slate-700 font-medium">Could not load the curriculum.</p>
            </div>
          )}
          {!getCurriculum.isPending && !getCurriculum.isError && curriculum && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <p className="text-sm text-slate-500 font-medium">4-Year Course Plan</p>
              {curriculum.years.map((year, idx) => {
                const c = yearColors[idx] || yearColors[0];
                return (
                  <div key={year.year} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${c.badge}`}>{year.label}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">{year.focus}</p>
                    <ul className="space-y-3">
                      {year.courses.map((course, cIdx) => (
                        <li key={cIdx} className="flex gap-3">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                          <div>
                            <span className="font-semibold text-slate-900 text-sm">{course.name}</span>
                            <span className="text-slate-500 text-sm"> — {course.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved View ───────────────────────────────────────────────────────
type SortMode = "rank" | "alpha";

function SavedView({ saved, onUnsaveMajor, onUnsaveCollege }: {
  saved: SavedData;
  onUnsaveMajor: (majorName: string) => void;
  onUnsaveCollege: (majorName: string, collegeName: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});

  const majors = Object.values(saved).sort((a, b) => b.savedAt - a.savedAt);

  const toggleExpand = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode(prev => ({ ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha" }));
  const sortedColleges = (colleges: SavedCollege[], mode: SortMode) =>
    mode === "alpha" ? [...colleges].sort((a, b) => a.name.localeCompare(b.name)) : [...colleges].sort((a, b) => a.rank - b.rank);

  if (majors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Bookmark className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-serif text-slate-800 font-bold mb-2">No saved items yet</h3>
        <p className="text-slate-500 max-w-sm">Search for a major and click "Save Major" to bookmark it here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Saved</h2>
        <p className="text-slate-500 mt-1">{majors.length} saved {majors.length === 1 ? "major" : "majors"}</p>
      </div>
      <div className="space-y-4">
        {majors.map((item) => {
          const isOpen = expanded[item.majorName] !== false;
          const mode = getSortMode(item.majorName);
          const colleges = sortedColleges(item.colleges, mode);
          return (
            <div key={item.majorName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-5 md:p-6">
                <button onClick={() => toggleExpand(item.majorName)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">{item.majorName}</h3>
                    <p className="text-slate-500 text-sm mt-0.5">{item.colleges.length} saved {item.colleges.length === 1 ? "college" : "colleges"}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                <button onClick={() => onUnsaveMajor(item.majorName)} className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0" title="Remove major">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {isOpen && item.description && (
                <div className="px-5 md:px-6 pb-4 -mt-2">
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
              )}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {item.colleges.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-5 md:px-6 py-3 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Colleges</span>
                        <button onClick={() => toggleSort(item.majorName)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                          <SortAsc className="w-3.5 h-3.5" />
                          {mode === "rank" ? "By Rank" : "A–Z"}
                        </button>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {colleges.map((college) => (
                          <li key={college.name} className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-slate-50 transition-colors">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">#{college.rank}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{college.name}</p>
                              <p className="text-slate-500 text-xs">{college.location}</p>
                            </div>
                            <button onClick={() => onUnsaveCollege(item.majorName, college.name)} className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors flex-shrink-0" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="px-5 md:px-6 py-4 text-sm text-slate-400 italic">No colleges saved for this major yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── My Colleges View ────────────────────────────────────────────────
function MyCollegesView({ myColleges, onRemove }: {
  myColleges: MyCollege[];
  onRemove: (collegeName: string, majorName: string) => void;
}) {
  const [sortMode, setSortMode] = useState<Record<string, SortMode>>({});

  const grouped = myColleges.reduce<Record<string, MyCollege[]>>((acc, c) => {
    (acc[c.majorName] ??= []).push(c);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(([, a], [, b]) => b[0].savedAt - a[0].savedAt);
  const totalColleges = myColleges.length;

  const getSortMode = (name: string): SortMode => sortMode[name] || "rank";
  const toggleSort = (name: string) => setSortMode(prev => ({ ...prev, [name]: prev[name] === "alpha" ? "rank" : "alpha" }));

  if (totalColleges === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <GraduationCap className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-serif text-slate-800 font-bold mb-2">No colleges saved yet</h3>
        <p className="text-slate-500 max-w-sm">Browse majors and bookmark colleges to "My Colleges" using the save button on each college card.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-slate-900">My Colleges</h2>
        <p className="text-slate-500 mt-1">{totalColleges} saved {totalColleges === 1 ? "college" : "colleges"}</p>
      </div>
      <div className="space-y-6">
        {groups.map(([majorName, colleges]) => {
          const mode = getSortMode(majorName);
          const sorted = mode === "alpha" ? [...colleges].sort((a, b) => a.name.localeCompare(b.name)) : [...colleges].sort((a, b) => a.rank - b.rank);
          return (
            <div key={majorName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 md:px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-slate-900 text-base leading-tight">{majorName}</h3>
                    <p className="text-slate-500 text-xs">{colleges.length} {colleges.length === 1 ? "college" : "colleges"}</p>
                  </div>
                </div>
                <button onClick={() => toggleSort(majorName)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                  <SortAsc className="w-3.5 h-3.5" />
                  {mode === "rank" ? "By Rank" : "A–Z"}
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {sorted.map((college) => (
                  <li key={`${college.name}-${majorName}`} className="group flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">#{college.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{college.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-slate-400 text-xs">{college.location}</p>
                      </div>
                    </div>
                    <button onClick={() => onRemove(college.name, majorName)} className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors flex-shrink-0" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Explore View ──────────────────────────────────────────────────────
function ExploreView({ saved, setSaved, myColleges, setMyColleges, initialMajor }: {
  saved: SavedData;
  setSaved: (d: SavedData) => void;
  myColleges: MyCollege[];
  setMyColleges: (d: MyCollege[]) => void;
  initialMajor?: string;
}) {
  const [inputValue, setInputValue] = useState(initialMajor || "");
  const [currentMajor, setCurrentMajor] = useState(initialMajor || "");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lookupMajor = useLookupMajor();

  useEffect(() => {
    if (initialMajor) {
      lookupMajor.mutate({ data: { major: initialMajor } });
      setCurrentMajor(initialMajor);
    }
  }, [initialMajor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    setSelectedCollege(null);
    setOpenDropdown(null);
    lookupMajor.mutate({ data: { major: inputValue } });
    setCurrentMajor(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSearch(); };

  const setSuggestedMajor = (major: string) => {
    setInputValue(major);
    setSelectedCollege(null);
    setOpenDropdown(null);
    lookupMajor.mutate({ data: { major } });
    setCurrentMajor(major);
  };

  const isMajorSaved = (majorName: string) => !!saved[majorName];

  const saveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const { major, description } = lookupMajor.data;
    const updated = { ...saved };
    if (!updated[major]) updated[major] = { majorName: major, description, savedAt: Date.now(), colleges: [] };
    else updated[major].description = description;
    setSaved(updated); persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const unsaveMajor = useCallback(() => {
    if (!lookupMajor.data) return;
    const updated = { ...saved };
    delete updated[lookupMajor.data.major];
    setSaved(updated); persistSaved(updated);
  }, [saved, lookupMajor.data, setSaved]);

  const isInSaved = (majorName: string, collegeName: string) =>
    !!saved[majorName]?.colleges.find((c) => c.name === collegeName);
  const isInMyColleges = (collegeName: string, majorName: string) =>
    myColleges.some((c) => c.name === collegeName && c.majorName === majorName);
  const isAnywhereSaved = (majorName: string, collegeName: string) =>
    isInSaved(majorName, collegeName) || isInMyColleges(collegeName, majorName);

  const toggleSavedCollege = useCallback((college: College, majorName: string, description: string) => {
    const updated = { ...saved };
    if (!updated[majorName]) updated[majorName] = { majorName, description, savedAt: Date.now(), colleges: [] };
    const already = updated[majorName].colleges.find((c) => c.name === college.name);
    if (already) {
      updated[majorName].colleges = updated[majorName].colleges.filter((c) => c.name !== college.name);
    } else {
      updated[majorName].colleges = [...updated[majorName].colleges, { ...college, savedAt: Date.now() }];
    }
    setSaved(updated); persistSaved(updated);
  }, [saved, setSaved]);

  const toggleMyCollege = useCallback((college: College, majorName: string) => {
    const already = myColleges.some((c) => c.name === college.name && c.majorName === majorName);
    const updated = already
      ? myColleges.filter((c) => !(c.name === college.name && c.majorName === majorName))
      : [...myColleges, { ...college, majorName, savedAt: Date.now() }];
    setMyColleges(updated); persistMyColleges(updated);
  }, [myColleges, setMyColleges]);

  const isIdle = lookupMajor.isIdle && !lookupMajor.data;
  const isLoading = lookupMajor.isPending;
  const isError = lookupMajor.isError;
  const result = lookupMajor.data;

  return (
    <main className="flex-1 flex flex-col items-center pt-14 md:pt-20 px-4 pb-24">
      <div className="w-full max-w-3xl flex flex-col items-center text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-bold mb-5 leading-tight">Discover your academic path.</h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-8">Explore college majors, understand their focus, and discover the top universities renowned for these programs.</p>
        <div className="w-full max-w-2xl relative flex items-center group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-4 md:py-5 border border-slate-200 rounded-full text-lg shadow-sm focus:ring-2 focus:ring-slate-800 focus:border-slate-800 transition-all bg-white text-slate-900 placeholder-slate-400"
            placeholder="e.g. Finance, Computer Science, Nursing..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="input-major"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button onClick={handleSearch} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2" data-testid="button-search">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Explore"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        {isIdle && (
          <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 delay-300 fill-mode-both">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Popular Majors</p>
            <p className="text-xs text-slate-400 mb-4">Top fields by U.S. bachelor's degrees awarded · NCES 2021–22</p>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_MAJORS.map((major) => (
                <button key={major} onClick={() => setSuggestedMajor(major)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-slate-400 hover:shadow-sm transition-all">{major}</button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="w-full animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 mb-8 animate-pulse">
              <div className="h-10 bg-slate-100 rounded w-1/3 mb-6" />
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${85+(i*3)}%` }} />)}</div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-slate-100 rounded w-48 mb-2 animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex gap-6 animate-pulse">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
            <h3 className="text-xl font-serif text-red-900 mb-2">Could not load results</h3>
            <p className="text-red-700 max-w-md">We had trouble looking that up. Please check the spelling and try again.</p>
          </div>
        )}

        {!isLoading && !isError && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
              <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 font-bold leading-tight">{result.major}</h2>
                <button
                  onClick={isMajorSaved(result.major) ? unsaveMajor : saveMajor}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${isMajorSaved(result.major) ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"}`}
                  data-testid="button-save-major"
                >
                  {isMajorSaved(result.major) ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Major</>}
                </button>
              </div>
              <p className="text-lg leading-relaxed text-slate-700 relative z-10 mb-8" data-testid="text-major-description">{result.description}</p>
              {result.salary && (
                <div className="relative z-10 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Average Salaries</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Entry Level</p>
                      <p className="text-lg font-bold text-slate-800">{result.salary.entryLevel}</p>
                      <p className="text-xs text-slate-400 mt-1">0–2 years</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4 text-center ring-1 ring-indigo-100">
                      <p className="text-xs text-indigo-400 mb-1 font-medium">Mid-Career</p>
                      <p className="text-lg font-bold text-indigo-700">{result.salary.midCareer}</p>
                      <p className="text-xs text-indigo-300 mt-1">5–10 years</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Experienced</p>
                      <p className="text-lg font-bold text-slate-800">{result.salary.experienced}</p>
                      <p className="text-xs text-slate-400 mt-1">15+ years</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-slate-800" />
              <h3 className="text-2xl font-serif text-slate-900 font-bold">Top Colleges</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Click a college to see its 4-year course plan. Use the bookmark to save it to a list.</p>

            <div ref={dropdownRef} className="space-y-4" data-testid="list-top-colleges">
              {result.topColleges.map((college, index) => {
                const anySaved = isAnywhereSaved(result.major, college.name);
                const inSaved = isInSaved(result.major, college.name);
                const inMyColleges = isInMyColleges(college.name, result.major);
                const dropKey = `${result.major}::${college.name}`;
                const isOpen = openDropdown === dropKey;

                return (
                  <div
                    key={college.rank}
                    className={`bg-white rounded-2xl border border-slate-200 transition-all duration-200 hover:shadow-md hover:border-slate-300 group animate-in fade-in slide-in-from-bottom-4 stagger-${index+1} fill-mode-both`}
                    data-testid={`item-college-${college.rank}`}
                  >
                    <div className="flex gap-4 md:gap-6 p-5 md:p-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 text-slate-800 font-serif font-bold text-xl md:text-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                          #{college.rank}
                        </div>
                      </div>
                      <button className="flex-1 min-w-0 text-left" onClick={() => { setOpenDropdown(null); setSelectedCollege(college); }}>
                        <h4 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">{college.name}</h4>
                        <div className="flex items-center text-slate-500 mb-3 text-sm font-medium">
                          <MapPin className="w-4 h-4 mr-1.5 opacity-70" />{college.location}
                        </div>
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">{college.highlights}</p>
                      </button>
                      <div className="flex-shrink-0 flex flex-col items-center gap-2 pl-2 md:pl-4 md:border-l md:border-slate-100 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : dropKey); }}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${anySaved ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700"}`}
                          title="Save to a list"
                          data-testid={`button-save-college-${college.rank}`}
                        >
                          {anySaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                        {isOpen && (
                          <div className="absolute right-0 top-11 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Save to</p>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                              onClick={(e) => { e.stopPropagation(); toggleSavedCollege(college, result.major, result.description); }}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${inSaved ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>
                                {inSaved && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm font-medium text-slate-700">Saved</span>
                            </button>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                              onClick={(e) => { e.stopPropagation(); toggleMyCollege(college, result.major); }}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${inMyColleges ? "bg-slate-900 border-slate-900" : "border-slate-300"}`}>
                                {inMyColleges && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm font-medium text-slate-700">My Colleges</span>
                            </button>
                            <div className="h-2" />
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedCollege && (
        <CurriculumModal college={selectedCollege} major={currentMajor} onClose={() => setSelectedCollege(null)} />
      )}
    </main>
  );
}

// ─── Chat Widget ──────────────────────────────────────────────────────
function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Sage, your college advisor. Ask me anything about majors, careers, or universities." }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendChat = useChat();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendChat.isPending]);

  const send = () => {
    const text = input.trim();
    if (!text || sendChat.isPending) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    sendChat.mutate({ data: { messages: newMessages } }, {
      onSuccess: (data) => setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]),
      onError: () => setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]),
    });
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-4 md:left-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-900">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Sage</p>
              <p className="text-white/60 text-xs">AI College Advisor</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-slate-900 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sendChat.isPending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask Sage anything..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 transition-all placeholder-slate-400"
              disabled={sendChat.isPending}
            />
            <button onClick={send} disabled={!input.trim() || sendChat.isPending} className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className="fixed bottom-6 left-4 md:left-6 z-50 w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center" aria-label="Chat with Sage">
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────
function UserMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Account";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
          {initials || <User className="w-3.5 h-3.5" />}
        </div>
        <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-52 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs text-slate-400 font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Suggested Majors View ────────────────────────────────────────────
function SuggestedView({ results, onExplore, onRetake }: {
  results: MajorSuggestion[];
  onExplore: (major: string) => void;
  onRetake: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="text-5xl mb-5">🎯</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No suggestions yet</h3>
        <p className="text-slate-500 max-w-sm mb-8">Take the quiz to get personalized major recommendations based on your interests.</p>
        <button onClick={onRetake} className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-slate-700 transition-colors">
          <Sparkles className="w-4 h-4" /> Take the Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Suggested Majors</h2>
          <p className="text-slate-500 mt-1">Based on your quiz answers — click any to explore it.</p>
        </div>
        <button
          onClick={onRetake}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 hover:bg-white transition-all bg-white"
        >
          <Sparkles className="w-3.5 h-3.5" /> Retake Quiz
        </button>
      </div>
      <div className="space-y-3">
        {results.map((item, i) => (
          <button
            key={item.major}
            onClick={() => onExplore(item.major)}
            className="w-full flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 font-sans">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-slate-900 text-lg">{item.major}</span>
              {item.reason && <span className="block text-sm text-slate-500 mt-1 leading-relaxed">{item.reason}</span>}
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-700 transition-colors flex-shrink-0 mt-2.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────
type AppView = "explore" | "suggested" | "colleges" | "saved";

function AppShell() {
  const [view, setView] = useState<AppView>("explore");
  const [saved, setSaved] = useState<SavedData>(loadSaved);
  const [myColleges, setMyColleges] = useState<MyCollege[]>(loadMyColleges);
  const [quizState, setQuizState] = useState<"quiz" | "results" | "done">(() =>
    localStorage.getItem(QUIZ_DONE_KEY) ? "done" : "quiz"
  );
  const [quizResults, setQuizResults] = useState<MajorSuggestion[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(QUIZ_RESULTS_KEY) ?? "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r: unknown) => typeof r === "string" || (!!r && typeof (r as MajorSuggestion).major === "string"))
        .map((r: unknown): MajorSuggestion =>
          typeof r === "string"
            ? { major: r, reason: "" }
            : { major: (r as MajorSuggestion).major, reason: String((r as MajorSuggestion).reason ?? "") }
        );
    } catch { return []; }
  });
  const [exploreInitialMajor, setExploreInitialMajor] = useState<string | undefined>();

  const savedMajorCount = Object.keys(saved).length;
  const savedCollegeCount = myColleges.length;

  const unsaveMajor = (majorName: string) => {
    const updated = { ...saved };
    delete updated[majorName];
    setSaved(updated); persistSaved(updated);
  };

  const unsaveCollege = (majorName: string, collegeName: string) => {
    const updated = { ...saved };
    if (updated[majorName]) {
      updated[majorName].colleges = updated[majorName].colleges.filter((c) => c.name !== collegeName);
    }
    setSaved(updated); persistSaved(updated);
  };

  const removeMyCollege = (collegeName: string, majorName: string) => {
    const updated = myColleges.filter((c) => !(c.name === collegeName && c.majorName === majorName));
    setMyColleges(updated); persistMyColleges(updated);
  };

  const handleQuizComplete = (majors: MajorSuggestion[]) => {
    setQuizResults(majors);
    localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(majors));
    setQuizState("results");
  };

  const handleExploreMajor = (major: string) => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
    setExploreInitialMajor(major);
    setView("explore");
  };

  const handleDismissQuiz = () => {
    localStorage.setItem(QUIZ_DONE_KEY, "1");
    setQuizState("done");
  };

  const handleRetakeQuiz = () => {
    localStorage.removeItem(QUIZ_DONE_KEY);
    setQuizState("quiz");
  };

  if (quizState === "quiz") {
    return <InterestQuiz onComplete={handleQuizComplete} />;
  }

  if (quizState === "results") {
    return (
      <QuizResults
        majors={quizResults}
        onExplore={handleExploreMajor}
        onDismiss={handleDismissQuiz}
      />
    );
  }

  const navBtn = (target: AppView, label: string, count?: number) => (
    <button
      onClick={() => setView(target)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${view === target ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${view === target ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        <button onClick={() => setView("explore")} className="flex items-center gap-2 text-slate-900 hover:opacity-75 transition-opacity">
          <Milestone className="w-5 h-5 text-slate-700" />
          <span className="font-serif font-semibold text-lg tracking-tight">Next Steps</span>
        </button>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
            {navBtn("explore", "Explore")}
            {navBtn("suggested", "Suggested")}
            {navBtn("colleges", "My Colleges", savedCollegeCount)}
            {navBtn("saved", "Saved", savedMajorCount)}
          </nav>
          <Show when="signed-in">
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <UserMenu />
          </Show>
        </div>
      </header>

      {view === "explore" && (
        <ExploreView
          saved={saved} setSaved={setSaved}
          myColleges={myColleges} setMyColleges={setMyColleges}
          initialMajor={exploreInitialMajor}
        />
      )}
      {view === "suggested" && (
        <SuggestedView
          results={quizResults}
          onExplore={(major) => { setExploreInitialMajor(major); setView("explore"); }}
          onRetake={handleRetakeQuiz}
        />
      )}
      {view === "colleges" && (
        <MyCollegesView myColleges={myColleges} onRemove={removeMyCollege} />
      )}
      {view === "saved" && (
        <SavedView saved={saved} onUnsaveMajor={unsaveMajor} onUnsaveCollege={unsaveCollege} />
      )}

      <ChatWidget />
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────
function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full py-4 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Milestone className="w-5 h-5 text-slate-700" />
          <span className="font-serif font-semibold text-lg tracking-tight text-slate-900">Next Steps</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/sign-in")} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-full hover:bg-slate-100">
            Sign in
          </button>
          <button onClick={() => setLocation("/sign-up")} className="text-sm font-semibold bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-700 transition-colors">
            Get started
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered college major explorer
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6 leading-tight max-w-3xl">
          Find the major that's right for you.
        </h1>
        <p className="text-xl text-slate-500 max-w-xl mb-10 leading-relaxed">
          Take a quick quiz, get personalized major recommendations, and explore the top US universities for any field.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button onClick={() => setLocation("/sign-up")} className="flex items-center gap-2 bg-slate-900 text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-slate-700 transition-colors shadow-lg">
            Start for free <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setLocation("/sign-in")} className="text-base font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Already have an account →
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { emoji: "🎯", title: "Personalized quiz", desc: "Answer 5 quick questions to get matched with majors that fit your interests and strengths." },
            { emoji: "🏛️", title: "Top 10 colleges", desc: "Instantly see the top US universities for any major, with highlights on what makes each one great." },
            { emoji: "🗓️", title: "4-year course plan", desc: "Click any college to see a realistic 4-year course plan tailored to your major." },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-sm">
              <div className="text-3xl mb-3">{emoji}</div>
              <h3 className="font-serif font-bold text-slate-900 text-lg mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Sign-in / Sign-up pages ──────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// ─── Home redirect ────────────────────────────────────────────────────
function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function AppRoute() {
  return (
    <>
      <Show when="signed-in">
        <AppShell />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// ─── Cache invalidator ────────────────────────────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── Clerk Provider + Routes ──────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Next Steps account" } },
        signUp: { start: { title: "Create your account", subtitle: "Start discovering your perfect major" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/app" component={AppRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
