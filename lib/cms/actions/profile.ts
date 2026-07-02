"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import {
  auditEvents,
  portfolioProfiles,
  portfolioStats,
} from "@/lib/db/schema";
import { uploadHeroProfileFromFile } from "@/lib/cms/hero-upload";
import { uploadResumeFromFile } from "@/lib/cms/resume-upload";

export type ProfileFormState = {
  ok: boolean;
  message: string;
};

const MAX_STATS = 6;

const MAX_HERO_URL_LEN = 4096;
const MAX_HERO_DATA_URL_LEN = 1_400_000;
const MAX_HERO_IMAGE_BYTES = 512 * 1024;

function parseHeroImageUrl(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };

  if (t.length > MAX_HERO_DATA_URL_LEN) {
    return { ok: false, message: "Hero image is too large. Use a smaller file or a hosted image URL." };
  }

  const lower = t.toLowerCase();
  if (lower.startsWith("data:image/")) {
    const m = /^data:image\/(jpeg|png|webp|gif);base64,([\s\S]+)$/i.exec(t);
    if (!m) {
      return {
        ok: false,
        message: "Hero image must be a JPEG, PNG, WebP, or GIF data URL (from upload).",
      };
    }
    let buf: Buffer;
    try {
      buf = Buffer.from(m[2], "base64");
    } catch {
      return { ok: false, message: "Hero image data could not be read. Try uploading again." };
    }
    if (!buf.length) {
      return { ok: false, message: "Hero image upload was empty." };
    }
    if (buf.length > MAX_HERO_IMAGE_BYTES) {
      return {
        ok: false,
        message: `Hero image must be under ${Math.round(MAX_HERO_IMAGE_BYTES / 1024)} KB after decoding.`,
      };
    }
    return { ok: true, value: t };
  }

  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return { ok: false, message: "Hero image URL must be a valid http(s) link." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, message: "Hero image URL must start with http:// or https://." };
  }
  if (t.length > MAX_HERO_URL_LEN) {
    return { ok: false, message: "Hero image URL is too long." };
  }
  return { ok: true, value: t };
}

const profileFieldsSchema = z.object({
  handle: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  tagline: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().max(40).optional().default(""),
  linkedin: z.string().trim().max(200).optional().default(""),
  github: z.string().trim().max(200).optional().default(""),
  yearsExp: z.coerce.number().int().min(0).max(80),
});

const statRowSchema = z.object({
  v: z.string().trim().min(1).max(64),
  k: z.string().trim().min(1).max(120),
});

function collectStatsFromFormData(formData: FormData): { v: string; k: string }[] {
  const rows: { v: string; k: string }[] = [];
  for (let i = 0; i < MAX_STATS; i++) {
    const v = String(formData.get(`stat_v_${i}`) ?? "").trim();
    const k = String(formData.get(`stat_k_${i}`) ?? "").trim();
    if (!v && !k) continue;
    rows.push({ v, k });
  }
  return rows;
}

export async function saveProfileAndStats(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { email: actorEmail } = await requireAdmin();

  const profilePayload = {
    handle: String(formData.get("handle") ?? ""),
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    location: String(formData.get("location") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    linkedin: String(formData.get("linkedin") ?? ""),
    github: String(formData.get("github") ?? ""),
    yearsExp: formData.get("yearsExp"),
  };

  const parsedProfile = profileFieldsSchema.safeParse(profilePayload);
  if (!parsedProfile.success) {
    return {
      ok: false,
      message: "Check required fields (name, email, tagline, etc.) and try again.",
    };
  }

  const available = formData.get("available") === "on";

  const heroFile = formData.get("heroImageFile");
  let heroImageUrl: string | null;

  if (heroFile instanceof File && heroFile.size > 0) {
    const uploaded = await uploadHeroProfileFromFile(heroFile);
    if (!uploaded.ok) {
      return { ok: false, message: uploaded.message };
    }
    heroImageUrl = uploaded.url;
  } else {
    const heroParsed = parseHeroImageUrl(String(formData.get("heroImageUrl") ?? ""));
    if (!heroParsed.ok) {
      return { ok: false, message: heroParsed.message };
    }
    heroImageUrl = heroParsed.value;
  }

  // Resume: new file upload wins; otherwise honor explicit clear or keep stored value.
  const resumeFile = formData.get("resumeFile");
  const resumeCleared = formData.get("resumeClear") === "1";
  const existingResumeUrl = String(formData.get("resumeUrl") ?? "").trim() || null;
  let resumeUrl: string | null = resumeCleared ? null : existingResumeUrl;
  let resumeUpdatedAt: Date | null | undefined;

  if (resumeFile instanceof File && resumeFile.size > 0) {
    const uploaded = await uploadResumeFromFile(resumeFile);
    if (!uploaded.ok) {
      return { ok: false, message: uploaded.message };
    }
    resumeUrl = uploaded.url;
    resumeUpdatedAt = new Date();
  } else if (resumeCleared) {
    resumeUpdatedAt = null;
  }

  const rawStats = collectStatsFromFormData(formData);
  for (const row of rawStats) {
    if (!row.v || !row.k) {
      return {
        ok: false,
        message: "Each stat needs both a value and a label, or clear the row entirely.",
      };
    }
  }

  const statsParsed = z
    .array(statRowSchema)
    .min(1)
    .max(MAX_STATS)
    .safeParse(rawStats);

  if (!statsParsed.success) {
    return {
      ok: false,
      message: `Add between 1 and ${MAX_STATS} stats with value and label.`,
    };
  }

  const stats = statsParsed.data;
  const p = parsedProfile.data;

  let db;
  try {
    db = getDb();
  } catch {
    return {
      ok: false,
      message: "Database is not configured (DATABASE_URL).",
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(portfolioProfiles)
        .values({
          id: "main",
          handle: p.handle,
          name: p.name,
          role: p.role,
          tagline: p.tagline,
          location: p.location,
          timezone: p.timezone,
          email: p.email,
          phone: p.phone || null,
          linkedin: p.linkedin || null,
          github: p.github || null,
          heroImageUrl,
          resumeUrl,
          resumeUpdatedAt: resumeUpdatedAt ?? null,
          available,
          yearsExp: p.yearsExp,
        })
        .onConflictDoUpdate({
          target: portfolioProfiles.id,
          set: {
            handle: p.handle,
            name: p.name,
            role: p.role,
            tagline: p.tagline,
            location: p.location,
            timezone: p.timezone,
            email: p.email,
            phone: p.phone || null,
            linkedin: p.linkedin || null,
            github: p.github || null,
            heroImageUrl,
            resumeUrl,
            ...(resumeUpdatedAt !== undefined ? { resumeUpdatedAt } : {}),
            available,
            yearsExp: p.yearsExp,
            version: sql`${portfolioProfiles.version} + 1`,
            updatedAt: new Date(),
          },
        });

      await tx.delete(portfolioStats);

      if (stats.length > 0) {
        await tx.insert(portfolioStats).values(
          stats.map((stat, index) => ({
            value: stat.v,
            label: stat.k,
            sortOrder: index,
          })),
        );
      }

      await tx.insert(auditEvents).values({
        actorEmail,
        action: "cms.profile_stats.publish",
        entityType: "portfolio_profile",
        entityId: "main",
        metadata: { statCount: stats.length },
      });
    });

    revalidatePath("/");
    revalidatePath("/cms");

    return { ok: true, message: "Published to the live site." };
  } catch (error) {
    console.error("saveProfileAndStats", error);
    return {
      ok: false,
      message: "Could not save. Try again or check the server logs.",
    };
  }
}
