import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compoundKey: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  }),
);

export const portfolioProfiles = pgTable("portfolio_profiles", {
  id: text("id").primaryKey().default("main"),
  handle: text("handle").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  tagline: text("tagline").notNull(),
  location: text("location").notNull(),
  timezone: text("timezone").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  linkedin: text("linkedin"),
  github: text("github"),
  /** Public HTTPS URL or data URL from CMS upload; null = CIT monogram placeholder */
  heroImageUrl: text("hero_image_url"),
  /** Public URL of the uploaded resume PDF; null hides resume CTAs on the site */
  resumeUrl: text("resume_url"),
  resumeUpdatedAt: timestamp("resume_updated_at", { mode: "date" }),
  available: boolean("available").notNull().default(true),
  yearsExp: integer("years_exp").notNull().default(0),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioStats = pgTable("portfolio_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioAbout = pgTable("portfolio_about", {
  id: text("id").primaryKey().default("main"),
  headCode: text("head_code").notNull(),
  headLabel: text("head_label").notNull(),
  headTitle: text("head_title").notNull(),
  paragraph1: text("paragraph_1").notNull(),
  paragraph2Prefix: text("paragraph_2_prefix").notNull(),
  paragraph2Highlight: text("paragraph_2_highlight").notNull(),
  paragraph2Mid: text("paragraph_2_mid").notNull(),
  paragraph2Emphasis: text("paragraph_2_emphasis").notNull(),
  paragraph2Suffix: text("paragraph_2_suffix").notNull(),
  paragraph3: text("paragraph_3").notNull(),
  frameLabel: text("frame_label").notNull(),
  frameSpec: text("frame_spec").notNull(),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const aboutCurrentlyItems = pgTable("about_currently_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  aboutId: text("about_id")
    .notNull()
    .references(() => portfolioAbout.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const experiences = pgTable("experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  role: text("role").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  current: boolean("current").notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const experienceBullets = pgTable("experience_bullets", {
  id: uuid("id").defaultRandom().primaryKey(),
  experienceId: uuid("experience_id")
    .notNull()
    .references(() => experiences.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  size: text("size").notNull(),
  year: text("year").notNull(),
  tag: text("tag"),
  color: text("color"),
  blurb: text("blurb").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const projectStackItems = pgTable("project_stack_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const projectMetrics = pgTable("project_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const stackGroups = pgTable("stack_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const stackItems = pgTable("stack_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => stackGroups.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const devlogPosts = pgTable("devlog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  read: text("read").notNull(),
  excerpt: text("excerpt").notNull(),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const contactInquiries = pgTable("contact_inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default("contact"),
  status: text("status").notNull().default("new"),
  emailStatus: text("email_status").notNull().default("pending"),
  fingerprint: text("fingerprint").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (inquiry) => ({
  fingerprintIdx: uniqueIndex("contact_inquiries_fingerprint_idx").on(
    inquiry.fingerprint,
  ),
}));

export const bookingRequests = pgTable("booking_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  requestedDay: text("requested_day").notNull(),
  requestedTime: text("requested_time").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("hold_requested"),
  emailStatus: text("email_status").notNull().default("pending"),
  fingerprint: text("fingerprint").notNull(),
  confirmedMeetingId: uuid("confirmed_meeting_id"),
  gcalMeetLink: text("gcal_meet_link"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (booking) => ({
  fingerprintIdx: uniqueIndex("booking_requests_fingerprint_idx").on(
    booking.fingerprint,
  ),
}));

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    status: text("status").notNull().default("subscribed"),
    emailStatus: text("email_status").notNull().default("pending"),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (subscriber) => ({
    emailIdx: uniqueIndex("newsletter_subscribers_email_idx").on(
      subscriber.email,
    ),
  }),
);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const integrationSettings = pgTable("integration_settings", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  who: text("who").notNull().default(""),
  kind: text("kind").notNull().default("CLIENT"),
  status: text("status").notNull().default("Confirmed"),
  platform: text("platform").notNull().default(""),
  link: text("link").notNull().default(""),
  notes: text("notes").notNull().default(""),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }).notNull(),
  gcalEventId: text("gcal_event_id"),
  gcalMeetLink: text("gcal_meet_link"),
  bookingRequestId: uuid("booking_request_id"),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type AvailabilityDay = {
  enabled: boolean;
  /** HH:MM 24h */
  start: string;
  /** HH:MM 24h */
  end: string;
};

export type WeeklyAvailability = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  AvailabilityDay
>;

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("main"),
  primaryDomain: text("primary_domain").notNull().default("cakeintech.com"),
  aliases: text("aliases").notNull().default(""),
  availability: jsonb("availability").$type<WeeklyAvailability | null>(),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const appearanceSettings = pgTable("appearance_settings", {
  id: text("id").primaryKey().default("main"),
  theme: text("theme").notNull().default("light"),
  accent: text("accent").notNull().default("#d4ff3d"),
  borderStyle: text("border_style").notNull().default("dashed"),
  gridDensity: integer("grid_density").notNull().default(32),
  slashDensity: integer("slash_density").notNull().default(7),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
