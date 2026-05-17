"use client";

import React, {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { CIT_DATA } from "@/app/components/data";
import type { Profile, Stat } from "@/app/components/data";
import {
  saveProfileAndStats,
  type ProfileFormState,
} from "@/lib/cms/actions/profile";
import { Chip, Slash } from "@/app/components/blueprint";
import { Card, Field, PageHead, Dot } from "../shell";
import {
  addExperienceBullet,
  createExperience,
  deleteExperience,
  deleteExperienceBullet,
  getExperienceEditorData,
  reorderExperienceBullets,
  reorderExperiences,
  updateExperience,
  updateExperienceBullet,
  type ExperienceRecord,
} from "@/lib/cms/actions/experience";
import {
  addProjectMetric,
  addProjectStackItem,
  createProject,
  deleteProject,
  deleteProjectMetric,
  deleteProjectStackItem,
  getProjectEditorData,
  reorderProjectMetrics,
  reorderProjects,
  reorderProjectStackItems,
  updateProject,
  updateProjectMetric,
  updateProjectStackItem,
  type ProjectRecord,
} from "@/lib/cms/actions/projects";
import {
  addStackItem,
  createStackGroup,
  deleteStackGroup,
  deleteStackItem,
  getStackEditorData,
  reorderStackGroups,
  reorderStackItems,
  updateStackGroup,
  updateStackItem,
  type StackGroupRecord,
} from "@/lib/cms/actions/stack";
import {
  createDevlogPost,
  getDevlogEditorData,
  reorderDevlogPosts,
  setDevlogPublished,
  updateDevlogPost,
  type DevlogPostRecord,
} from "@/lib/cms/actions/devlog";

/* ===== ProjectVisual — thumbnail placeholder for project cards ===== */
function ProjectVisual({
  name,
  color,
}: {
  name: string;
  color?: string | null;
}) {
  if (color) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "var(--accent-ink)",
            opacity: 0.55,
          }}
        >
          {name
            .split(" ")
            .map((w) => w[0])
            .join("")}
        </div>
      </div>
    );
  }
  return (
    <Slash
      style={{ position: "absolute", inset: 0, opacity: 0.4 }}
    />
  );
}

function padStatRows(rows: Stat[], count: number): Stat[] {
  const next = rows.map((row) => ({ ...row }));
  while (next.length < count) {
    next.push({ v: "", k: "" });
  }
  return next.slice(0, count);
}

const profileFormInitial: ProfileFormState = {
  ok: true,
  message: "",
};

/** 88×88 like homepage spec card — object-fit cover + center matches server square crop. */
function HeroSpecThumbPreview({ src }: { src: string }) {
  return (
    <div
      style={{
        width: 88,
        height: 88,
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--bg)",
        border: "1px dashed var(--rule)",
        boxSizing: "border-box",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- CMS blob/URL preview */}
      <img
        src={src}
        alt=""
        width={88}
        height={88}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}

/* ===== ProfileEditor ===== */
export function ProfileEditor({
  profile,
  stats,
}: {
  profile: Profile;
  stats: Stat[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...profile });
  const [statRows, setStatRows] = useState<Stat[]>(() =>
    padStatRows(stats, 6),
  );
  /** Object URL for a picked hero file — square preview before save. */
  const [heroLocalPreview, setHeroLocalPreview] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const heroPickUrlRef = useRef<string | null>(null);

  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(saveProfileAndStats, profileFormInitial);

  useEffect(() => {
    setForm({ ...profile });
    setStatRows(padStatRows(stats, 6));
    if (heroPickUrlRef.current) {
      URL.revokeObjectURL(heroPickUrlRef.current);
      heroPickUrlRef.current = null;
    }
    setHeroLocalPreview(null);
    if (heroFileInputRef.current) heroFileInputRef.current.value = "";
  }, [profile, stats]);

  useEffect(() => {
    return () => {
      if (heroPickUrlRef.current) {
        URL.revokeObjectURL(heroPickUrlRef.current);
        heroPickUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (state.ok && state.message) {
      router.refresh();
    }
  }, [state.ok, state.message, router]);

  const onF = (k: keyof Profile, v: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onStat = (index: number, key: "v" | "k", value: string) => {
    setStatRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const heroSavedUrl = form.heroImageUrl ?? "";
  const heroRemotePreview =
    heroSavedUrl.startsWith("data:image/") || /^https?:\/\//i.test(heroSavedUrl)
      ? heroSavedUrl
      : null;
  const heroPreviewThumb = heroLocalPreview ?? heroRemotePreview;

  return (
    <div>
      <PageHead
        code="10"
        sub="CONTENT — PROFILE / HERO"
        title="Profile & hero"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {state.message ? (
              <span
                style={{
                  fontSize: 12,
                  color: state.ok ? "var(--ink-2)" : "var(--danger)",
                  maxWidth: 280,
                }}
              >
                {state.message}
              </span>
            ) : null}
            <a
              className="btn slash"
              style={{
                height: 36,
                display: "inline-flex",
                alignItems: "center",
              }}
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              PREVIEW →
            </a>
            <button
              type="submit"
              form="profile-editor-form"
              className="btn primary"
              style={{ height: 36 }}
              disabled={pending}
            >
              {pending ? "SAVING…" : "SAVE & PUBLISH"}
            </button>
          </div>
        }
      />

      <form id="profile-editor-form" action={formAction}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 24,
          }}
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card label="10.A — IDENTITY" spec="REQUIRED">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Name">
                <input
                  className="fld"
                  name="name"
                  value={form.name}
                  onChange={(e) => onF("name", e.target.value)}
                />
              </Field>
              <Field label="Handle" hint="appears as @handle">
                <input
                  className="fld"
                  name="handle"
                  value={form.handle}
                  onChange={(e) => onF("handle", e.target.value)}
                />
              </Field>
              <Field label="Role">
                <input
                  className="fld"
                  name="role"
                  value={form.role}
                  onChange={(e) => onF("role", e.target.value)}
                />
              </Field>
              <Field label="Years experience">
                <input
                  className="fld"
                  type="number"
                  name="yearsExp"
                  value={form.yearsExp}
                  onChange={(e) =>
                    onF("yearsExp", Number(e.target.value) || 0)
                  }
                />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field
                label="Tagline"
                hint={`${(form.tagline || "").length} / 200`}
              >
                <textarea
                  className="fld"
                  name="tagline"
                  rows={3}
                  value={form.tagline}
                  onChange={(e) => onF("tagline", e.target.value)}
                  style={{ resize: "vertical", fontFamily: "var(--mono)" }}
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field
                label="Hero spec photo (optional)"
                hint="Spec card — 88×88 CSS slot; uploads are saved as 176×176 WebP with the blueprint dashed frame, then sent to MinIO (S3_* in .env). Empty keeps the CIT monogram. JPEG / PNG / WebP / GIF, up to ~12 MB before processing."
              >
                <input
                  type="hidden"
                  name="heroImageUrl"
                  value={form.heroImageUrl ?? ""}
                />
                {(() => {
                  const hu = form.heroImageUrl ?? "";
                  const isData = hu.startsWith("data:image/");
                  const isHttp = /^https?:\/\//i.test(hu);
                  if (isData) {
                    return (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <HeroSpecThumbPreview src={hu} />
                        <button
                          type="button"
                          className="btn slash"
                          onClick={() => onF("heroImageUrl", "")}
                        >
                          Remove image
                        </button>
                      </div>
                    );
                  }
                  return (
                    <>
                      {isHttp ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 12,
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <HeroSpecThumbPreview src={hu} />
                          <button
                            type="button"
                            className="btn slash"
                            onClick={() => onF("heroImageUrl", "")}
                          >
                            Clear URL
                          </button>
                        </div>
                      ) : null}
                      <input
                        className="fld"
                        placeholder="https://… (optional if you upload below)"
                        value={hu}
                        onChange={(e) => onF("heroImageUrl", e.target.value)}
                      />
                    </>
                  );
                })()}
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <input
                      ref={heroFileInputRef}
                      type="file"
                      name="heroImageFile"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ fontSize: 12, maxWidth: "100%", flex: "1 1 200px" }}
                      onChange={(e) => {
                        if (heroPickUrlRef.current) {
                          URL.revokeObjectURL(heroPickUrlRef.current);
                          heroPickUrlRef.current = null;
                        }
                        const f = e.target.files?.[0];
                        if (!f) {
                          setHeroLocalPreview(null);
                          return;
                        }
                        const url = URL.createObjectURL(f);
                        heroPickUrlRef.current = url;
                        setHeroLocalPreview(url);
                      }}
                    />
                    {heroLocalPreview ? (
                      <button
                        type="button"
                        className="btn slash"
                        onClick={() => {
                          if (heroFileInputRef.current)
                            heroFileInputRef.current.value = "";
                          if (heroPickUrlRef.current) {
                            URL.revokeObjectURL(heroPickUrlRef.current);
                            heroPickUrlRef.current = null;
                          }
                          setHeroLocalPreview(null);
                        }}
                      >
                        Clear file
                      </button>
                    ) : null}
                  </div>
                  {heroLocalPreview ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "flex-start",
                        marginTop: 12,
                      }}
                    >
                      <HeroSpecThumbPreview src={heroLocalPreview} />
                      <p
                        style={{
                          flex: "1 1 200px",
                          fontSize: 11,
                          color: "var(--ink-3)",
                          margin: 0,
                          lineHeight: 1.45,
                          maxWidth: 360,
                        }}
                      >
                        Square preview uses the same center crop as the live site
                        slot. There is no in-browser cropper — Save runs Sharp on
                        the server (cover + dashed frame + WebP) then uploads to
                        storage.
                      </p>
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 6,
                      lineHeight: 1.45,
                    }}
                  >
                    Choose a file and click Save & publish — the
                    server crops, adds the dashed frame, uploads to storage, and
                    stores the public URL. If you pick a file, it overrides the URL
                    field for that save.
                  </div>
                </div>
              </Field>
            </div>
          </Card>

          <Card label="10.B — CONTACT" spec="PUBLIC">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Email">
                <input
                  className="fld"
                  name="email"
                  value={form.email}
                  onChange={(e) => onF("email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  className="fld"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => onF("phone", e.target.value)}
                />
              </Field>
              <Field label="Location">
                <input
                  className="fld"
                  name="location"
                  value={form.location}
                  onChange={(e) => onF("location", e.target.value)}
                />
              </Field>
              <Field label="Timezone">
                <input
                  className="fld"
                  name="timezone"
                  value={form.timezone}
                  onChange={(e) => onF("timezone", e.target.value)}
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  className="fld"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={(e) => onF("linkedin", e.target.value)}
                />
              </Field>
              <Field label="GitHub">
                <input
                  className="fld"
                  name="github"
                  value={form.github}
                  onChange={(e) => onF("github", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card label="10.C — LIVE STATS" spec="HOMEPAGE STRIP">
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                margin: "0 0 14px",
                lineHeight: 1.5,
              }}
            >
              Values and labels map to the stat strip on the public site (up
              to 6 rows). Leave a row empty to skip it; each kept row needs
              both value and label.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {statRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Field label={`Value ${i + 1}`}>
                    <input
                      className="fld"
                      name={`stat_v_${i}`}
                      value={row.v}
                      onChange={(e) => onStat(i, "v", e.target.value)}
                    />
                  </Field>
                  <Field label={`Label ${i + 1}`}>
                    <input
                      className="fld"
                      name={`stat_k_${i}`}
                      value={row.k}
                      onChange={(e) => onStat(i, "k", e.target.value)}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          <Card label="10.D — AVAILABILITY">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
              }}
            >
              {(
                [
                  ["Contract", true],
                  ["Advisory", true],
                  ["Full-time", false],
                ] as [string, boolean][]
              ).map(([k, on]) => (
                <Field key={k} label={k}>
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      padding: 8,
                      justifyContent: "center",
                      background: on ? "var(--accent)" : "transparent",
                    }}
                  >
                    {on ? "OPEN" : "PAUSED"}
                  </button>
                </Field>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Open to inquiries (site-wide)">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    name="available"
                    checked={form.available}
                    onChange={(e) => onF("available", e.target.checked)}
                  />
                  Available for work
                </label>
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Banner copy (homepage)">
                <input
                  className="fld"
                  defaultValue="Available for Q2/Q3 2026 · 2 offers pending"
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div
          style={{ position: "sticky", top: 80, alignSelf: "flex-start" }}
        >
          <Card label="LIVE PREVIEW" spec="HERO / DESKTOP" pad={0}>
            <div
              style={{ padding: 22, background: "var(--paper-tint)" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                {heroPreviewThumb ? (
                  <HeroSpecThumbPreview src={heroPreviewThumb} />
                ) : (
                  <div
                    title="Monogram when no photo"
                    style={{
                      width: 88,
                      height: 88,
                      flexShrink: 0,
                      border: "1px dashed var(--rule)",
                      boxSizing: "border-box",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontFamily: "var(--mono)",
                      color: "var(--ink-3)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    CIT
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
                  >
                    <Chip>@{form.handle}</Chip>
                    <Chip>{form.location}</Chip>
                  </div>
              <div
                style={{
                  fontSize: 32,
                  lineHeight: 1,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  marginBottom: 10,
                }}
              >
                {form.name.split(" ")[0]}
                <br />
                {form.name.split(" ").slice(1).join(" ")}
                <span style={{ color: "var(--ink-3)" }}>.</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  marginBottom: 14,
                }}
              >
                {form.role}{" "}
                <span style={{ color: "var(--ink-3)" }}>—</span>{" "}
                <span className="mark">{form.yearsExp}+ yrs</span>
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {form.tagline}
              </p>
                </div>
              </div>
            </div>
            <div
              style={{
                padding: 14,
                borderTop: "1px dashed var(--rule)",
                display: "flex",
                gap: 8,
                fontSize: 11,
                color: "var(--ink-3)",
              }}
            >
              <Dot color="var(--accent)" /> Saved · 0:14 ago
            </div>
          </Card>
        </div>
      </div>
      </form>
    </div>
  );
}

/* ===== WorkEditor ===== */
export function WorkEditor() {
  const [items, setItems] = useState<ExperienceRecord[]>([]);
  const [sel, setSel] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("Loading…");

  const cur = items[sel];

  const load = async () => {
    try {
      const rows = await getExperienceEditorData();
      setItems(rows);
      setSel((prev) => Math.min(prev, Math.max(rows.length - 1, 0)));
      setStatus("Loaded.");
      return rows;
    } catch {
      setStatus("Could not load experiences.");
      return [];
    }
  };

  useEffect(() => {
    // Initial data hydrate for editor state from server actions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const patchCurrent = (patch: Partial<ExperienceRecord>) => {
    setItems((prev) =>
      prev.map((item, index) =>
        index === sel ? { ...item, ...patch } : item,
      ),
    );
  };

  const moveExperience = (offset: number) => {
    if (!cur) return;
    const to = sel + offset;
    if (to < 0 || to >= items.length) return;

    const ordered = [...items];
    const [moved] = ordered.splice(sel, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);
    setSel(to);

    startTransition(async () => {
      try {
        await reorderExperiences(ordered.map((item) => item.id));
        setStatus("Timeline order saved.");
      } catch {
        await load();
        setStatus("Reorder failed. Restored previous order.");
      }
    });
  };

  const moveBullet = (bulletIndex: number, offset: number) => {
    if (!cur) return;
    const to = bulletIndex + offset;
    if (to < 0 || to >= cur.bullets.length) return;

    const nextBullets = [...cur.bullets];
    const [moved] = nextBullets.splice(bulletIndex, 1);
    nextBullets.splice(to, 0, moved);
    patchCurrent({ bullets: nextBullets });

    startTransition(async () => {
      try {
        await reorderExperienceBullets(
          cur.id,
          nextBullets.map((bullet) => bullet.id),
        );
        setStatus("Bullet order saved.");
      } catch {
        await load();
        setStatus("Could not reorder bullets.");
      }
    });
  };

  const saveCurrent = () => {
    if (!cur) return;
    startTransition(async () => {
      try {
        await updateExperience(cur.id, {
          company: cur.company,
          location: cur.location,
          role: cur.role,
          start: cur.start,
          end: cur.end,
          current: cur.current,
        });
        await Promise.all(
          cur.bullets.map((bullet) =>
            updateExperienceBullet(cur.id, bullet.id, bullet.body),
          ),
        );
        setStatus("Entry saved.");
      } catch {
        setStatus("Save failed. Check required fields.");
      }
    });
  };

  return (
    <div>
      <PageHead
        code="11"
        sub="CONTENT — WORK"
        title={`Work experience · ${items.length} entries`}
        action={
          <button
            className="btn primary"
            style={{ height: 36 }}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const createdId = await createExperience();
                  const rows = await load();
                  const idx = rows.findIndex((item) => item.id === createdId);
                  if (idx >= 0) setSel(idx);
                  setStatus("New role created.");
                } catch {
                  setStatus("Could not create role.");
                }
              })
            }
          >
            + NEW ROLE
          </button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 24,
        }}
      >
        <Card label="11.A — TIMELINE" pad={0}>
          {items.map((it, i) => (
            <div
              key={it.id}
              style={{
                borderBottom:
                  i === items.length - 1
                    ? "none"
                    : "1px dashed var(--rule-soft)",
              }}
            >
              <button
                onClick={() => setSel(i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 18px 8px",
                  background: sel === i ? "var(--ink)" : "transparent",
                  color: sel === i ? "var(--bg)" : "var(--ink)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {it.company}
                  </span>
                  {it.current && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 6px",
                        background:
                          sel === i ? "var(--accent)" : "transparent",
                        color:
                          sel === i
                            ? "var(--accent-ink)"
                            : "var(--ink-3)",
                        border:
                          sel === i ? "none" : "1px dashed var(--rule)",
                      }}
                    >
                      NOW
                    </span>
                  )}
                </div>
                <div
                    style={{
                    fontSize: 11,
                    color:
                      sel === i ? "rgba(255,255,255,0.6)" : "var(--ink-3)",
                    marginTop: 2,
                    }}
                  >
                  {it.role}
                </div>
                <div
                  className="num"
                  style={{
                    fontSize: 10,
                    color:
                      sel === i ? "rgba(255,255,255,0.5)" : "var(--ink-4)",
                    marginTop: 4,
                    letterSpacing: "0.08em",
                  }}
                >
                  {it.start} → {it.end}
                </div>
              </button>
              <div style={{ display: "flex", gap: 6, padding: "0 18px 10px" }}>
                <button
                  className="btn slash"
                  style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || i === 0}
                  onClick={() => moveExperience(-1)}
                >
                  ↑
                </button>
                <button
                  className="btn slash"
                  style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || i === items.length - 1}
                  onClick={() => moveExperience(1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </Card>

        <Card
          label="11.B — EDIT ENTRY"
          spec={cur?.current ? "CURRENT" : "ARCHIVED"}
        >
          {!cur ? (
            <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
              No experience entries found.
            </div>
          ) : (
            <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="Company">
              <input
                className="fld"
                value={cur.company}
                onChange={(e) => patchCurrent({ company: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className="fld"
                value={cur.location}
                onChange={(e) => patchCurrent({ location: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <input
                className="fld"
                value={cur.role}
                onChange={(e) => patchCurrent({ role: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <div
                className="fld"
                style={{ display: "flex", gap: 6, padding: 4 }}
              >
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "6px",
                    justifyContent: "center",
                    background: cur.current
                      ? "var(--accent)"
                      : "transparent",
                  }}
                  onClick={() => patchCurrent({ current: true })}
                >
                  CURRENT
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "6px",
                    justifyContent: "center",
                    background: !cur.current
                      ? "var(--ink)"
                      : "transparent",
                    color: !cur.current ? "var(--bg)" : "inherit",
                  }}
                  onClick={() => patchCurrent({ current: false })}
                >
                  ARCHIVED
                </button>
              </div>
            </Field>
            <Field label="Start">
              <input
                className="fld"
                value={cur.start}
                onChange={(e) => patchCurrent({ start: e.target.value })}
              />
            </Field>
            <Field label="End">
              <input
                className="fld"
                value={cur.end}
                onChange={(e) => patchCurrent({ end: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Bullets"
            hint={`${cur.bullets.length} items · markdown supported`}
          >
            <div style={{ border: "1px dashed var(--rule)", padding: 8 }}>
              {cur.bullets.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 6px",
                    borderBottom:
                      i === cur.bullets.length - 1
                        ? "none"
                        : "1px dashed var(--rule-soft)",
                  }}
                >
                  <span
                    className="num"
                    style={{
                      fontSize: 10,
                      color: "var(--ink-4)",
                      paddingTop: 4,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <textarea
                    className="fld"
                    rows={2}
                    value={b.body}
                    onChange={(e) =>
                      patchCurrent({
                        bullets: cur.bullets.map((bullet, bulletIndex) =>
                          bulletIndex === i
                            ? { ...bullet, body: e.target.value }
                            : bullet,
                        ),
                      })
                    }
                    style={{
                      border: "none",
                      padding: "2px 0",
                      resize: "vertical",
                      background: "transparent",
                      fontFamily: "var(--mono)",
                    }}
                  />
                  <button
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteExperienceBullet(cur.id, b.id);
                          await load();
                          setStatus("Bullet deleted.");
                        } catch {
                          setStatus("Could not delete bullet.");
                        }
                      })
                    }
                  >
                    ✕
                  </button>
                  <button
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={i === 0 || isPending}
                    onClick={() => moveBullet(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={i === cur.bullets.length - 1 || isPending}
                    onClick={() => moveBullet(i, 1)}
                  >
                    ↓
                  </button>
                </div>
              ))}
              <button
                className="btn"
                style={{ marginTop: 8, height: 28, padding: "0 12px", fontSize: 11 }}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await addExperienceBullet(cur.id);
                      await load();
                      setStatus("Bullet added.");
                    } catch {
                      setStatus("Could not add bullet.");
                    }
                  })
                }
              >
                + ADD BULLET
              </button>
            </div>
          </Field>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button className="btn slash">DUPLICATE</button>
            <button
              className="btn"
              style={{
                borderColor: "var(--danger)",
                color: "var(--danger)",
              }}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteExperience(cur.id);
                    await load();
                    setStatus("Entry deleted.");
                  } catch {
                    setStatus("Could not delete entry.");
                  }
                })
              }
            >
              DELETE ENTRY
            </button>
            <button className="btn primary" disabled={isPending} onClick={saveCurrent}>
              {isPending ? "SAVING…" : "SAVE"}
            </button>
          </div>
          </>
          )}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.06em",
            }}
          >
            {status}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===== ProjectsEditor ===== */
export function ProjectsEditor() {
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sizeFilter, setSizeFilter] = useState<"" | "sm" | "md" | "lg">("");
  const [yearFilter, setYearFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("Loading…");

  const cur = items.find((p) => p.id === selectedId) ?? null;

  const yearOptions = useMemo(() => {
    return [...new Set(items.map((p) => p.year))].sort((a, b) =>
      b.localeCompare(a),
    );
  }, [items]);

  const filteredProjects = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((p) => {
      const hay = (
        p.name +
        p.kind +
        p.stack.map((s) => s.label).join(" ")
      ).toLowerCase();
      const qok = !ql || hay.includes(ql);
      const sok = !sizeFilter || p.size === sizeFilter;
      const yok = !yearFilter || p.year === yearFilter;
      return qok && sok && yok;
    });
  }, [items, q, sizeFilter, yearFilter]);

  const load = async () => {
    try {
      const rows = await getProjectEditorData();
      setItems(rows);
      setSelectedId((prev) => {
        if (rows.length === 0) return null;
        if (prev && rows.some((p) => p.id === prev)) return prev;
        return rows[0].id;
      });
      setStatus("Loaded.");
      return rows;
    } catch {
      setStatus("Could not load projects.");
      return [];
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchCurrent = (patch: Partial<ProjectRecord>) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)),
    );
  };

  const moveProjectAtIndex = (idx: number, offset: number) => {
    const to = idx + offset;
    if (to < 0 || to >= items.length) return;

    const ordered = [...items];
    const [moved] = ordered.splice(idx, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);
    setSelectedId(moved.id);

    startTransition(async () => {
      try {
        await reorderProjects(ordered.map((p) => p.id));
        setStatus("Project order saved.");
      } catch {
        await load();
        setStatus("Reorder failed. Restored order.");
      }
    });
  };

  const moveStackItem = (stackIndex: number, offset: number) => {
    if (!cur) return;
    const to = stackIndex + offset;
    if (to < 0 || to >= cur.stack.length) return;

    const nextStack = [...cur.stack];
    const [moved] = nextStack.splice(stackIndex, 1);
    nextStack.splice(to, 0, moved);
    patchCurrent({ stack: nextStack });

    startTransition(async () => {
      try {
        await reorderProjectStackItems(
          cur.id,
          nextStack.map((s) => s.id),
        );
        setStatus("Stack order saved.");
      } catch {
        await load();
        setStatus("Could not reorder stack.");
      }
    });
  };

  const moveMetric = (metricIndex: number, offset: number) => {
    if (!cur) return;
    const to = metricIndex + offset;
    if (to < 0 || to >= cur.metrics.length) return;

    const nextMetrics = [...cur.metrics];
    const [moved] = nextMetrics.splice(metricIndex, 1);
    nextMetrics.splice(to, 0, moved);
    patchCurrent({ metrics: nextMetrics });

    startTransition(async () => {
      try {
        await reorderProjectMetrics(
          cur.id,
          nextMetrics.map((m) => m.id),
        );
        setStatus("Metrics order saved.");
      } catch {
        await load();
        setStatus("Could not reorder metrics.");
      }
    });
  };

  const saveCurrent = () => {
    if (!cur) return;
    startTransition(async () => {
      try {
        await updateProject(cur.id, {
          name: cur.name,
          kind: cur.kind,
          size: cur.size,
          year: cur.year,
          tag: cur.tag?.trim() ? cur.tag.trim() : null,
          color: cur.color?.trim() ? cur.color.trim() : null,
          blurb: cur.blurb,
        });
        await Promise.all(
          cur.stack.map((s) =>
            updateProjectStackItem(cur.id, s.id, s.label),
          ),
        );
        await Promise.all(
          cur.metrics.map((m) =>
            updateProjectMetric(cur.id, m.id, {
              value: m.value,
              label: m.label,
            }),
          ),
        );
        setStatus("Project saved.");
      } catch {
        setStatus("Save failed. Check required fields.");
      }
    });
  };

  return (
    <div>
      <PageHead
        code="12"
        sub="CONTENT — PROJECTS"
        title={`Projects · ${items.length} live`}
        action={
          <button
            className="btn primary"
            style={{ height: 36 }}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const createdId = await createProject();
                  await load();
                  setSelectedId(createdId);
                  setStatus("New project created.");
                } catch {
                  setStatus("Could not create project.");
                }
              })
            }
          >
            + NEW PROJECT
          </button>
        }
      />

      <Card label="12.A — FILTER" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="fld"
            placeholder="Search projects, stack, kind…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="fld"
            style={{ width: 160 }}
            value={sizeFilter}
            onChange={(e) =>
              setSizeFilter(e.target.value as "" | "sm" | "md" | "lg")
            }
          >
            <option value="">All sizes</option>
            <option value="lg">Large</option>
            <option value="md">Medium</option>
            <option value="sm">Small</option>
          </select>
          <select
            className="fld"
            style={{ width: 160 }}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 24,
        }}
      >
        <Card label="12.B — PROJECTS" pad={0}>
          {filteredProjects.map((p, i) => {
            const globalIdx = items.findIndex((x) => x.id === p.id);
            return (
              <div
                key={p.id}
                style={{
                  borderBottom:
                    i === filteredProjects.length - 1
                      ? "none"
                      : "1px dashed var(--rule-soft)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 18px 8px",
                    background:
                      selectedId === p.id ? "var(--ink)" : "transparent",
                    color: selectedId === p.id ? "var(--bg)" : "var(--ink)",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 9,
                        color:
                          selectedId === p.id
                            ? "rgba(255,255,255,0.55)"
                            : "var(--ink-3)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {p.year}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        selectedId === p.id
                          ? "rgba(255,255,255,0.6)"
                          : "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    {p.kind}
                  </div>
                  <div
                    className="num"
                    style={{
                      fontSize: 10,
                      color:
                        selectedId === p.id
                          ? "rgba(255,255,255,0.5)"
                          : "var(--ink-4)",
                      marginTop: 4,
                      letterSpacing: "0.08em",
                    }}
                  >
                    SIZE · {p.size.toUpperCase()}
                  </div>
                </button>
                <div style={{ display: "flex", gap: 6, padding: "0 18px 10px" }}>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending || globalIdx <= 0}
                    onClick={() => moveProjectAtIndex(globalIdx, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={
                      isPending ||
                      globalIdx < 0 ||
                      globalIdx >= items.length - 1
                    }
                    onClick={() => moveProjectAtIndex(globalIdx, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card label="12.C — EDIT PROJECT" spec={cur?.size.toUpperCase() ?? "—"}>
          {!cur ? (
            <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
              No projects loaded.
            </div>
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  height: 100,
                  marginBottom: 16,
                  border: "1px dashed var(--rule)",
                  background: cur.color || "transparent",
                  overflow: "hidden",
                }}
              >
                <ProjectVisual name={cur.name} color={cur.color} />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <Field label="Name">
                  <input
                    className="fld"
                    value={cur.name}
                    onChange={(e) => patchCurrent({ name: e.target.value })}
                  />
                </Field>
                <Field label="Kind">
                  <input
                    className="fld"
                    value={cur.kind}
                    onChange={(e) => patchCurrent({ kind: e.target.value })}
                  />
                </Field>
                <Field label="Year">
                  <input
                    className="fld"
                    value={cur.year}
                    onChange={(e) => patchCurrent({ year: e.target.value })}
                  />
                </Field>
                <Field label="Size">
                  <select
                    className="fld"
                    value={cur.size}
                    onChange={(e) =>
                      patchCurrent({
                        size: e.target.value as ProjectRecord["size"],
                      })
                    }
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </Field>
                <Field label="Tag" hint="optional">
                  <input
                    className="fld"
                    value={cur.tag ?? ""}
                    onChange={(e) =>
                      patchCurrent({
                        tag: e.target.value.trim() === "" ? null : e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Color" hint="hex, optional">
                  <input
                    className="fld"
                    value={cur.color ?? ""}
                    onChange={(e) =>
                      patchCurrent({
                        color: e.target.value.trim() === "" ? null : e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Blurb" hint={`${cur.blurb.length} / 2000`}>
                <textarea
                  className="fld"
                  rows={4}
                  value={cur.blurb}
                  onChange={(e) => patchCurrent({ blurb: e.target.value })}
                  style={{ resize: "vertical", fontFamily: "var(--mono)" }}
                />
              </Field>

              <div style={{ marginTop: 14 }}>
                <Field label="Stack" hint={`${cur.stack.length} items`}>
                <div style={{ border: "1px dashed var(--rule)", padding: 8 }}>
                  {cur.stack.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "8px 6px",
                        borderBottom:
                          i === cur.stack.length - 1
                            ? "none"
                            : "1px dashed var(--rule-soft)",
                      }}
                    >
                      <span
                        className="num"
                        style={{
                          fontSize: 10,
                          color: "var(--ink-4)",
                          paddingTop: 4,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <input
                        className="fld"
                        value={s.label}
                        onChange={(e) =>
                          patchCurrent({
                            stack: cur.stack.map((row, j) =>
                              j === i ? { ...row, label: e.target.value } : row,
                            ),
                          })
                        }
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await deleteProjectStackItem(cur.id, s.id);
                              await load();
                              setStatus("Stack item removed.");
                            } catch {
                              setStatus("Could not remove stack item.");
                            }
                          })
                        }
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        disabled={i === 0 || isPending}
                        onClick={() => moveStackItem(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        disabled={i === cur.stack.length - 1 || isPending}
                        onClick={() => moveStackItem(i, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn"
                    style={{
                      marginTop: 8,
                      height: 28,
                      padding: "0 12px",
                      fontSize: 11,
                    }}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await addProjectStackItem(cur.id);
                          await load();
                          setStatus("Stack item added.");
                        } catch {
                          setStatus("Could not add stack item.");
                        }
                      })
                    }
                  >
                    + ADD STACK ITEM
                  </button>
                </div>
                </Field>
              </div>

              <div style={{ marginTop: 14 }}>
                <Field
                  label="Metrics"
                  hint={`${cur.metrics.length} items · value + label`}
                >
                <div style={{ border: "1px dashed var(--rule)", padding: 8 }}>
                  {cur.metrics.map((m, i) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "8px 6px",
                        borderBottom:
                          i === cur.metrics.length - 1
                            ? "none"
                            : "1px dashed var(--rule-soft)",
                      }}
                    >
                      <span
                        className="num"
                        style={{
                          fontSize: 10,
                          color: "var(--ink-4)",
                          paddingTop: 4,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <input
                        className="fld"
                        value={m.value}
                        placeholder="Value"
                        onChange={(e) =>
                          patchCurrent({
                            metrics: cur.metrics.map((row, j) =>
                              j === i ? { ...row, value: e.target.value } : row,
                            ),
                          })
                        }
                        style={{ width: 100 }}
                      />
                      <input
                        className="fld"
                        value={m.label}
                        placeholder="Label"
                        onChange={(e) =>
                          patchCurrent({
                            metrics: cur.metrics.map((row, j) =>
                              j === i ? { ...row, label: e.target.value } : row,
                            ),
                          })
                        }
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await deleteProjectMetric(cur.id, m.id);
                              await load();
                              setStatus("Metric removed.");
                            } catch {
                              setStatus("Could not remove metric.");
                            }
                          })
                        }
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        disabled={i === 0 || isPending}
                        onClick={() => moveMetric(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn slash"
                        style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                        disabled={i === cur.metrics.length - 1 || isPending}
                        onClick={() => moveMetric(i, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn"
                    style={{
                      marginTop: 8,
                      height: 28,
                      padding: "0 12px",
                      fontSize: 11,
                    }}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await addProjectMetric(cur.id);
                          await load();
                          setStatus("Metric added.");
                        } catch {
                          setStatus("Could not add metric.");
                        }
                      })
                    }
                  >
                    + ADD METRIC
                  </button>
                </div>
                </Field>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  style={{
                    borderColor: "var(--danger)",
                    color: "var(--danger)",
                  }}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteProject(cur.id);
                        await load();
                        setStatus("Project deleted.");
                      } catch {
                        setStatus("Could not delete project.");
                      }
                    })
                  }
                >
                  DELETE PROJECT
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={isPending}
                  onClick={saveCurrent}
                >
                  {isPending ? "SAVING…" : "SAVE"}
                </button>
              </div>
            </>
          )}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.06em",
            }}
          >
            {status}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===== SkillsEditor ===== */
export function SkillsEditor() {
  const [groups, setGroups] = useState<StackGroupRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("Loading…");

  const load = async () => {
    try {
      const rows = await getStackEditorData();
      setGroups(rows);
      setStatus("Loaded.");
      return rows;
    } catch {
      setStatus("Could not load stack groups.");
      return [];
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchGroup = (index: number, patch: Partial<StackGroupRecord>) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    );
  };

  const patchGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<StackGroupRecord["items"][number]>,
  ) => {
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== groupIndex) return g;
        return {
          ...g,
          items: g.items.map((it, ii) =>
            ii === itemIndex ? { ...it, ...patch } : it,
          ),
        };
      }),
    );
  };

  const moveGroup = (index: number, offset: number) => {
    const to = index + offset;
    if (to < 0 || to >= groups.length) return;
    const ordered = [...groups];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(to, 0, moved);
    setGroups(ordered);

    startTransition(async () => {
      try {
        await reorderStackGroups(ordered.map((g) => g.id));
        setStatus("Group order saved.");
      } catch {
        await load();
        setStatus("Reorder failed. Restored order.");
      }
    });
  };

  const moveItem = (groupIndex: number, itemIndex: number, offset: number) => {
    const g = groups[groupIndex];
    if (!g) return;
    const to = itemIndex + offset;
    if (to < 0 || to >= g.items.length) return;
    const nextItems = [...g.items];
    const [moved] = nextItems.splice(itemIndex, 1);
    nextItems.splice(to, 0, moved);
    patchGroup(groupIndex, { items: nextItems });

    startTransition(async () => {
      try {
        await reorderStackItems(
          g.id,
          nextItems.map((it) => it.id),
        );
        setStatus("Item order saved.");
      } catch {
        await load();
        setStatus("Could not reorder items.");
      }
    });
  };

  const saveGroup = (index: number) => {
    const g = groups[index];
    if (!g) return;
    startTransition(async () => {
      try {
        await updateStackGroup(g.id, { name: g.name });
        await Promise.all(
          g.items.map((it) =>
            updateStackItem(g.id, it.id, { label: it.label }),
          ),
        );
        setStatus("Group saved.");
      } catch {
        setStatus("Save failed. Check fields.");
      }
    });
  };

  return (
    <div>
      <PageHead
        code="13"
        sub="CONTENT — STACK / SKILLS"
        title={`Tech stack — parts list · ${groups.length} groups`}
        action={
          <button
            className="btn primary"
            style={{ height: 36 }}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await createStackGroup();
                  await load();
                  setStatus("New group created.");
                } catch {
                  setStatus("Could not create group.");
                }
              })
            }
          >
            + NEW GROUP
          </button>
        }
      />
      <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 14px" }}>
        {status}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {groups.map((g, gi) => (
          <Card
            key={g.id}
            label={`13.${String(gi + 1).padStart(2, "0")}`}
            spec={`${g.items.length} ITEMS`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <input
                className="fld"
                value={g.name}
                onChange={(e) => patchGroup(gi, { name: e.target.value })}
                style={{ flex: 1, minWidth: 160, fontSize: 14, fontWeight: 600 }}
              />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 26, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || gi === 0}
                  onClick={() => moveGroup(gi, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 26, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || gi === groups.length - 1}
                  onClick={() => moveGroup(gi, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 26, padding: "0 10px", fontSize: 10 }}
                  disabled={isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Remove this group and all its stack items?",
                      )
                    ) {
                      return;
                    }
                    startTransition(async () => {
                      try {
                        await deleteStackGroup(g.id);
                        await load();
                        setStatus("Group removed.");
                      } catch {
                        setStatus("Could not remove group.");
                      }
                    });
                  }}
                >
                  ✕ REMOVE GROUP
                </button>
              </div>
            </div>
            <div
              style={{
                border: "1px dashed var(--rule)",
                padding: 8,
                marginBottom: 10,
              }}
            >
              {g.items.map((it, ii) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 4px",
                    borderBottom:
                      ii === g.items.length - 1
                        ? "none"
                        : "1px dashed var(--rule-soft)",
                  }}
                >
                  <input
                    className="fld"
                    value={it.label}
                    onChange={(e) =>
                      patchGroupItem(gi, ii, { label: e.target.value })
                    }
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontFamily: "var(--mono)",
                    }}
                  />
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending || ii === 0}
                    onClick={() => moveItem(gi, ii, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending || ii === g.items.length - 1}
                    onClick={() => moveItem(gi, ii, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteStackItem(g.id, it.id);
                          await load();
                          setStatus("Item removed.");
                        } catch {
                          setStatus("Could not remove item.");
                        }
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                style={{ height: 26, padding: "0 10px", fontSize: 11, marginTop: 6 }}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await addStackItem(g.id);
                      await load();
                      setStatus("Item added.");
                    } catch {
                      setStatus("Could not add item.");
                    }
                  })
                }
              >
                + ADD
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn primary"
                style={{ height: 30, padding: "0 14px", fontSize: 11 }}
                disabled={isPending}
                onClick={() => saveGroup(gi)}
              >
                SAVE GROUP
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ===== BlogEditor ===== */
export function BlogEditor() {
  const [posts, setPosts] = useState<DevlogPostRecord[]>([]);
  const [sel, setSel] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("Loading…");

  const cur = posts[sel];

  const load = async () => {
    try {
      const rows = await getDevlogEditorData();
      setPosts(rows);
      setSel((prev) => Math.min(prev, Math.max(rows.length - 1, 0)));
      setStatus("Loaded.");
      return rows;
    } catch {
      setStatus("Could not load devlog posts.");
      return [];
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchCurrent = (patch: Partial<DevlogPostRecord>) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === sel ? { ...p, ...patch } : p)),
    );
  };

  const movePostFromIndex = (fromIndex: number, offset: number) => {
    const to = fromIndex + offset;
    if (to < 0 || to >= posts.length) return;
    const ordered = [...posts];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(to, 0, moved);
    const movedId = moved.id;
    setPosts(ordered);
    setSel(ordered.findIndex((p) => p.id === movedId));

    startTransition(async () => {
      try {
        await reorderDevlogPosts(ordered.map((p) => p.id));
        setStatus("Post order saved.");
      } catch {
        await load();
        setStatus("Reorder failed. Restored order.");
      }
    });
  };

  const excerptWords = cur
    ? cur.excerpt.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const saveCurrent = () => {
    if (!cur) return;
    startTransition(async () => {
      try {
        await updateDevlogPost(cur.id, {
          date: cur.date,
          title: cur.title,
          kind: cur.kind,
          read: cur.read,
          excerpt: cur.excerpt,
        });
        setStatus("Post saved.");
      } catch {
        setStatus("Save failed. Check required fields.");
      }
    });
  };

  return (
    <div>
      <PageHead
        code="14"
        sub="CONTENT — DEVLOG"
        title={`Devlog · ${posts.length} posts`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn primary"
              style={{ height: 36 }}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const id = await createDevlogPost();
                    const rows = await load();
                    const idx = rows.findIndex((p) => p.id === id);
                    if (idx >= 0) setSel(idx);
                    setStatus("New post created.");
                  } catch {
                    setStatus("Could not create post.");
                  }
                })
              }
            >
              + NEW POST
            </button>
          </div>
        }
      />
      <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 14px" }}>
        {status}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 18,
        }}
      >
        <Card label="14.A — POSTS" pad={0}>
          {posts.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: "var(--ink-3)" }}>
              No posts yet. Create one with + NEW POST.
            </div>
          ) : (
            posts.map((p, i) => (
              <div
                key={p.id}
                style={{
                  borderBottom:
                    i === posts.length - 1
                      ? "none"
                      : "1px dashed var(--rule-soft)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px 8px",
                    background: sel === i ? "var(--ink)" : "transparent",
                    color: sel === i ? "var(--bg)" : "var(--ink)",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      className="num"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.14em",
                        color:
                          sel === i
                            ? "rgba(255,255,255,0.55)"
                            : "var(--ink-3)",
                      }}
                    >
                      {p.date.toUpperCase()}
                    </span>
                    {p.published ? (
                      <Chip accent style={{ fontSize: 8, padding: "1px 6px" }}>
                        LIVE
                      </Chip>
                    ) : (
                      <Chip style={{ fontSize: 8, padding: "1px 6px" }}>
                        DRAFT
                      </Chip>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 3,
                      lineHeight: 1.35,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color:
                        sel === i
                          ? "rgba(255,255,255,0.55)"
                          : "var(--ink-3)",
                      marginTop: 3,
                    }}
                  >
                    {p.kind} · {p.read}
                  </div>
                </button>
                <div style={{ display: "flex", gap: 6, padding: "0 16px 10px" }}>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending || i === 0}
                    onClick={() => movePostFromIndex(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 24, padding: "0 8px", fontSize: 10 }}
                    disabled={isPending || i === posts.length - 1}
                    onClick={() => movePostFromIndex(i, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card
          label="14.B — EDIT"
          spec={
            cur?.published ? "PUBLISHED · SITE LISTING" : "DRAFT · NOT ON SITE"
          }
          pad={0}
        >
          {!cur ? (
            <div style={{ padding: 22, fontSize: 12, color: "var(--ink-3)" }}>
              Select or create a post to edit.
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: 22,
                  borderBottom: "1px dashed var(--rule)",
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 140px",
                  gap: 14,
                }}
              >
                <Field label="Title">
                  <input
                    className="fld"
                    value={cur.title}
                    onChange={(e) => patchCurrent({ title: e.target.value })}
                    style={{ fontSize: 14, fontWeight: 600 }}
                  />
                </Field>
                <Field label="Kind">
                  <input
                    className="fld"
                    value={cur.kind}
                    onChange={(e) => patchCurrent({ kind: e.target.value })}
                  />
                </Field>
                <Field label="Read time">
                  <input
                    className="fld"
                    value={cur.read}
                    onChange={(e) => patchCurrent({ read: e.target.value })}
                  />
                </Field>
              </div>
              <div
                style={{
                  padding: "0 22px 14px",
                  borderBottom: "1px dashed var(--rule)",
                }}
              >
                <Field label="Date (ISO)">
                  <input
                    className="fld"
                    value={cur.date}
                    onChange={(e) => patchCurrent({ date: e.target.value })}
                  />
                </Field>
              </div>
              <div
                style={{
                  padding: "8px 22px",
                  borderBottom: "1px dashed var(--rule)",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  letterSpacing: "0.12em",
                }}
              >
                EXCERPT · {excerptWords} WORDS (shown on portfolio devlog cards)
              </div>
              <textarea
                value={cur.excerpt}
                onChange={(e) => patchCurrent({ excerpt: e.target.value })}
                style={{
                  width: "100%",
                  minHeight: 400,
                  padding: 22,
                  background: "transparent",
                  border: 0,
                  fontFamily: "var(--mono)",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--ink)",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <div
                style={{
                  padding: 14,
                  borderTop: "1px dashed var(--rule)",
                  display: "flex",
                  gap: 8,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {cur.published ? (
                    <Chip accent>LIVE ON SITE</Chip>
                  ) : (
                    <Chip>DRAFT</Chip>
                  )}
                  <Chip>
                    SLUG · /
                    {cur.title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .slice(0, 28)}
                  </Chip>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                    disabled={isPending}
                    onClick={saveCurrent}
                  >
                    SAVE
                  </button>
                  {!cur.published ? (
                    <button
                      type="button"
                      className="btn primary"
                      style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await setDevlogPublished(cur.id, true);
                            await load();
                            setStatus("Published.");
                          } catch {
                            setStatus("Could not publish.");
                          }
                        })
                      }
                    >
                      PUBLISH
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn slash"
                      style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await setDevlogPublished(cur.id, false);
                            await load();
                            setStatus("Unpublished.");
                          } catch {
                            setStatus("Could not unpublish.");
                          }
                        })
                      }
                    >
                      UNPUBLISH
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ===== Media ===== */
export function Media() {
  return (
    <div>
      <PageHead
        code="15"
        sub="CONTENT — MEDIA"
        title="Media library"
        action={
          <button className="btn primary" style={{ height: 36 }}>
            ↑ UPLOAD
          </button>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              border: "1px dashed var(--rule)",
              position: "relative",
              padding: 6,
              fontSize: 9,
              color: "var(--ink-3)",
            }}
          >
            <Slash style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
            <div
              style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                right: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span className="num">IMG_{String(2840 + i)}</span>
              <span>{(120 + i * 14) % 320}KB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
