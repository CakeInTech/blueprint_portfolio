/**
 * Seed-only starter content — used exclusively by `scripts/seed.ts` to
 * bootstrap the database. The live site and CMS never read from this object;
 * all rendered content comes from the CMS tables.
 */
export const CIT_DATA = {
  profile: {
    handle: "cakeintech",
    name: "Mohamed Abdulhakim",
    role: "Fullstack Software Engineer",
    tagline:
      "I build offline-first SaaS — hotels, schools, clinics — for places where the internet doesn't always show up.",
    location: "Addis Ababa, Ethiopia",
    timezone: "EAT · UTC+3",
    email: "cake.intech@gmail.com",
    phone: "+251 987 043 194",
    linkedin: "linkedin.com/in/cakeintech",
    github: "github.com/cakeintech",
    available: true,
    yearsExp: 3,
    heroImageUrl: null,
    resumeUrl: null,
    resumeUpdatedAt: null,
  },
  stats: [
    { v: "3+", k: "Years shipping" },
    { v: "11", k: "Production systems" },
    { v: "4", k: "Countries served" },
    { v: "99.9%", k: "Offline uptime" },
  ],
  about: {
    headCode: "00.A",
    headLabel: "ABOUT — STORY",
    headTitle: "Born offline. Built for it.",
    contentMd:
      "I grew up where the internet flickered. Where the booking-system reboot mid-checkout loses a guest, where the bus that comes home doesn't always come home. The software I write is shaped by that.\n\n" +
      "Three years in, I ship **offline-first SaaS** across hotels, schools and clinics — desktop, mobile and web, syncing when the wind blows the right direction. Stacks: *Next.js, TypeScript, Flutter, Supabase, Postgres*. Methods: small teams, real users, real signal.\n\n" +
      "I read schematics for fun. This site is one. Every section is a sheet, every component an annotated part.",
    paragraph1:
      "I grew up where the internet flickered. Where the booking-system reboot mid-checkout loses a guest, where the bus that comes home doesn't always come home. The software I write is shaped by that.",
    paragraph2Prefix: "Three years in, I ship ",
    paragraph2Highlight: "offline-first SaaS",
    paragraph2Mid:
      " across hotels, schools and clinics — desktop, mobile and web, syncing when the wind blows the right direction. Stacks: ",
    paragraph2Emphasis: "Next.js, TypeScript, Flutter, Supabase, Postgres",
    paragraph2Suffix: ". Methods: small teams, real users, real signal.",
    paragraph3:
      "I read schematics for fun. This site is one. Every section is a sheet, every component an annotated part.",
    frameLabel: "CURRENTLY",
    frameSpec: "2026 / Q2",
    currently: [
      { title: "BREVISWORK", description: "Dental clinic ↔ professional matching" },
      { title: "DAAD", description: "School bus QR tracking, parent push" },
      { title: "ELUUL · LUUL HMS", description: "Offline-first hotel mgmt, Flutter" },
      { title: "READING", description: "Designing Data-Intensive Apps" },
      { title: "LISTENING", description: "Khruangbin — A LA SALA" },
    ],
  },
  experience: [
    {
      co: "Breviswork",
      loc: "Vancouver · Remote",
      role: "Full-Time Software Engineer",
      start: "Jan 2026",
      end: "Present",
      current: true,
      bullets: [
        "Building a SaaS platform connecting dental clinics with qualified professionals for short-term staffing.",
        "Full-stack: professional profiles, clinic job postings, real-time availability matching, booking workflows.",
        "Stack — Next.js · TypeScript · Supabase.",
      ],
    },
    {
      co: "Daad",
      loc: "Kenya · Remote",
      role: "Freelance Software Engineer",
      start: "Jan 2026",
      end: "Present",
      current: true,
      bullets: [
        "SaaS school management with a student-safety feature: QR-coded student IDs scanned on bus boarding/exit.",
        "Parents receive real-time push notifications — school, in-transit, arrived home.",
        "Multi-tenant backend, RBAC, offline-resilient sync for low-connectivity environments.",
      ],
    },
    {
      co: "Redwan Hydrogeology",
      loc: "Addis Ababa · Hybrid",
      role: "Software Engineer",
      start: "Aug 2025",
      end: "Dec 2025",
      current: false,
      bullets: [
        "End-to-end project management with Kanban, real-time collaboration, secure document sharing.",
        "AI-powered notifications and issue tracking for visibility, prioritization, project efficiency.",
      ],
    },
    {
      co: "Sufast Express",
      loc: "Tanzania · Remote",
      role: "Freelance Software Engineer",
      start: "May 2025",
      end: "May 2025",
      current: false,
      bullets: [
        "Designed a high-impact website that boosted brand presence and customer engagement.",
        "Built a real-time air cargo tracking system with live status, automated notifications, ops dashboard.",
      ],
    },
    {
      co: "Artisan Blend Café",
      loc: "Kenya · Remote",
      role: "Freelance Software Engineer",
      start: "Oct 2025",
      end: "Oct 2025",
      current: false,
      bullets: [
        "Visually refined café website showcasing products and brand identity.",
        "WhatsApp ordering + real-time table reservations.",
        "Sanity-powered CMS so owners can update menu and pricing without devs.",
      ],
    },
    {
      co: "Fayda National ID",
      loc: "Addis Ababa",
      role: "Hackathon Finalist",
      start: "Jul 2025",
      end: "Aug 2025",
      current: false,
      bullets: [
        "Integrated Ethiopia's national ID (Fayda eSignet) for real-time identity validation.",
        "99.9% accuracy, reduced fraud incidents, local-regulation compliance.",
      ],
    },
    {
      co: "Eluul Technologies",
      loc: "Addis Ababa",
      role: "Full-Time Software Engineer",
      start: "Jan 2023",
      end: "Present",
      current: true,
      bullets: [
        "Scalable offline-first architecture supporting multi-device workflows (+25% productivity).",
        "Hotel staff operate across web, mobile, desktop without data loss or sync issues.",
      ],
    },
  ],
  projects: [
    {
      id: "luul",
      name: "Luul HMS",
      kind: "SaaS · Hotel Mgmt",
      size: "lg" as const,
      year: "2025",
      tag: "Flagship",
      color: "#d4ff3d",
      blurb:
        "Cross-platform hotel management — Flutter, Drift, Supabase. 99.9% reliability during internet outages.",
      stack: ["Flutter", "Drift", "Supabase", "PostgreSQL"],
      metrics: [
        { v: "99.9%", k: "offline uptime" },
        { v: "3", k: "platforms" },
      ],
    },
    {
      id: "meftaha",
      name: "MeftaHa PMS",
      kind: "SaaS · Property",
      size: "md" as const,
      year: "2025",
      tag: undefined,
      color: undefined,
      blurb:
        "Offline-first property management with multi-tenant isolation and bookings, housekeeping, rooms.",
      stack: ["Flutter", "SQLite", "Supabase"],
      metrics: [{ v: "multi", k: "tenant" }],
    },
    {
      id: "daad",
      name: "Daad School Safety",
      kind: "EdTech · K-12",
      size: "md" as const,
      year: "2026",
      tag: undefined,
      color: undefined,
      blurb:
        "QR-on-ID bus tracking with parent push. School ↔ bus ↔ home, in real time.",
      stack: ["Next.js", "Supabase", "Flutter"],
      metrics: [{ v: "RT", k: "tracking" }],
    },
    {
      id: "breviswork",
      name: "Breviswork",
      kind: "SaaS · Healthcare staffing",
      size: "lg" as const,
      year: "2026",
      tag: undefined,
      color: undefined,
      blurb:
        "Dental clinic ↔ professional matching. Availability matching, bookings, profile workflows.",
      stack: ["Next.js", "TypeScript", "Supabase"],
      metrics: [{ v: "RT", k: "matching" }],
    },
    {
      id: "sufast",
      name: "Sufast Express",
      kind: "Logistics · Air cargo",
      size: "sm" as const,
      year: "2025",
      tag: undefined,
      color: undefined,
      blurb:
        "Live air-cargo tracking and ops dashboard for a Tanzanian freight forwarder.",
      stack: ["Next.js", "WebSockets"],
      metrics: [],
    },
    {
      id: "redwan",
      name: "Redwan PM",
      kind: "Internal tools",
      size: "sm" as const,
      year: "2025",
      tag: undefined,
      color: undefined,
      blurb: "Kanban + docs + AI nudges for a hydrogeology consultancy.",
      stack: ["Next.js", "Prisma", "PostgreSQL"],
      metrics: [],
    },
    {
      id: "artisan",
      name: "Artisan Blend Café",
      kind: "Brand site + CMS",
      size: "sm" as const,
      year: "2025",
      tag: undefined,
      color: undefined,
      blurb:
        "Café site with WhatsApp ordering, table reservations and Sanity CMS.",
      stack: ["Next.js", "Sanity"],
      metrics: [],
    },
    {
      id: "fayda",
      name: "Fayda eSignet Integration",
      kind: "Identity · Civic",
      size: "sm" as const,
      year: "2025",
      tag: "Hackathon Finalist",
      color: undefined,
      blurb:
        "Real-time identity validation against Ethiopia's national ID system.",
      stack: ["Node.js", "OIDC"],
      metrics: [{ v: "99.9%", k: "accuracy" }],
    },
  ],
  stack: {
    Frontend: [
      "Next.js",
      "React.js",
      "TypeScript",
      "Flutter",
      "Redux",
      "SASS",
      "Vite",
      "Webpack",
    ],
    Backend: [
      "Node.js",
      "Express.js",
      "Ruby on Rails",
      "REST",
      "WebSockets",
      "RBAC",
    ],
    Database: [
      "PostgreSQL",
      "Supabase",
      "MongoDB",
      "Prisma",
      "SQLite",
      "Drift",
    ],
    Infra: ["Docker", "AWS", "CI/CD", "Git", "Vercel", "Netlify"],
    Practice: [
      "Offline-first",
      "Multi-tenant",
      "Real-time",
      "Testing (RSpec)",
      "Pair Programming",
    ],
  },
  devlog: [
    {
      date: "2026-04-22",
      title: "Designing offline-first conflict resolution for Luul HMS",
      kind: "Field note",
      read: "8 min",
      excerpt:
        "Last-write-wins is a lie you tell yourself when the bar in room 304 has been cut off for 6 hours and bookings stack up on three devices.",
    },
    {
      date: "2026-03-09",
      title: "Why I picked Drift over Hive (again)",
      kind: "Tech",
      read: "5 min",
      excerpt:
        "SQL is a language. Hive is a hashmap with a passport. When the schema starts evolving, only one of them survives.",
    },
    {
      date: "2026-02-14",
      title: "Shipping the Daad bus-scan flow in 11 days",
      kind: "Devlog",
      read: "6 min",
      excerpt:
        "QR codes are easy. Convincing a driver to scan one is the actual product. Notes on UX for the front seat.",
    },
    {
      date: "2026-01-30",
      title: "Integrating Fayda eSignet — what worked, what didn't",
      kind: "Civic tech",
      read: "12 min",
      excerpt:
        "OIDC against a national identity provider sounds simple. Then you read 'verifiable credentials' and 'consent dance' in the same paragraph.",
    },
    {
      date: "2025-12-04",
      title: "I rebuilt my portfolio with a CMS this weekend",
      kind: "Meta",
      read: "3 min",
      excerpt:
        "If you're seeing this, the migration worked. Every word, project and bullet on this site is now editable from a dashboard I built myself.",
    },
  ],
};

export type Profile = {
  handle: string;
  name: string;
  role: string;
  tagline: string;
  location: string;
  timezone: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  /** When null/empty, hero spec card shows the CIT monogram placeholder */
  heroImageUrl: string | null;
  /** Public URL of the uploaded resume PDF; null hides resume CTAs */
  resumeUrl: string | null;
  /** ISO timestamp of the last resume upload; null when no resume */
  resumeUpdatedAt: string | null;
  available: boolean;
  yearsExp: number;
};

export type Stat = {
  v: string;
  k: string;
};

export type AboutCurrentlyItem = {
  title: string;
  description: string;
};

export type AboutContent = {
  headCode: string;
  headLabel: string;
  headTitle: string;
  /** Single markdown body — when non-empty it replaces the legacy paragraph fields */
  contentMd: string | null;
  paragraph1: string;
  paragraph2Prefix: string;
  paragraph2Highlight: string;
  paragraph2Mid: string;
  paragraph2Emphasis: string;
  paragraph2Suffix: string;
  paragraph3: string;
  frameLabel: string;
  frameSpec: string;
  currently: AboutCurrentlyItem[];
};

export type Experience = {
  co: string;
  loc: string;
  role: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
};

export type Project = {
  id: string;
  name: string;
  kind: string;
  size: "lg" | "md" | "sm";
  year: string;
  tag?: string;
  color?: string;
  blurb: string;
  stack: string[];
  metrics: Stat[];
};

export type DevlogPost = {
  date: string;
  title: string;
  kind: string;
  read: string;
  excerpt: string;
};
