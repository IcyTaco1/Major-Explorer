// ─── Interest Quiz data & major recommender ──────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string }[];
}

// Five indirect, scenario-based quiz versions. Each version asks about the same
// five dimensions (activity, environment, strength, impact, subject) using the
// same answer `value`s, so getMajorSuggestions works identically across them.
export const QUIZ_VERSIONS: QuizQuestion[][] = [
  // ── Version 1 · "A day in your life" ──────────────────────────────────
  [
    {
      id: "activity",
      question: "You finally have a free weekend. What are you itching to do?",
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

// ─── Major recommender ────────────────────────────────────────────────
// Every major is tagged with the answer `value`s it aligns with across all
// five quiz dimensions. We score each major against the user's actual
// selections so recommendations reflect everything they picked — not just
// one or two answers.
export interface MajorProfile {
  name: string;
  activity: string[];
  environment: string[];
  strength: string[];
  impact: string[];
  subject: string[];
}

export const MAJOR_CATALOG: MajorProfile[] = [
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

export interface MajorSuggestion { major: string; reason: string; }

export function getMajorSuggestions(answers: Record<string, string>): MajorSuggestion[] {
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
