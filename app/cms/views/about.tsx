"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AboutContent } from "@/app/components/data";
import { MarkdownBody } from "@/app/components/MarkdownBody";
import { Card, Field, PageHead } from "../shell";
import {
  createAboutCurrentlyItem,
  deleteAboutCurrentlyItem,
  getAboutEditorData,
  reorderAboutCurrentlyItems,
  updateAbout,
  updateAboutCurrentlyItem,
  type AboutCurrentlyItemRecord,
  type AboutSectionRecord,
} from "@/lib/cms/actions/about";

function sectionFromAboutContent(a: AboutContent): AboutSectionRecord {
  return {
    headCode: a.headCode,
    headLabel: a.headLabel,
    headTitle: a.headTitle,
    contentMd: a.contentMd ?? "",
    paragraph1: a.paragraph1,
    paragraph2Prefix: a.paragraph2Prefix,
    paragraph2Highlight: a.paragraph2Highlight,
    paragraph2Mid: a.paragraph2Mid,
    paragraph2Emphasis: a.paragraph2Emphasis,
    paragraph2Suffix: a.paragraph2Suffix,
    paragraph3: a.paragraph3,
    frameLabel: a.frameLabel,
    frameSpec: a.frameSpec,
  };
}

/** One-time migration into the markdown editor: rebuild the old split
 *  paragraphs as markdown so nothing is lost when switching over. */
function legacyToMarkdown(s: AboutSectionRecord): string {
  const p2 = [
    s.paragraph2Prefix,
    s.paragraph2Highlight ? `**${s.paragraph2Highlight}**` : "",
    s.paragraph2Mid,
    s.paragraph2Emphasis ? `*${s.paragraph2Emphasis}*` : "",
    s.paragraph2Suffix,
  ]
    .join("")
    .trim();
  return [s.paragraph1, p2, s.paragraph3].filter(Boolean).join("\n\n");
}

export function AboutEditor({ initialAbout }: { initialAbout: AboutContent }) {
  const router = useRouter();
  const [section, setSection] = useState<AboutSectionRecord>(() =>
    sectionFromAboutContent(initialAbout),
  );
  const [items, setItems] = useState<AboutCurrentlyItemRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("Loading…");

  const load = async () => {
    try {
      const data = await getAboutEditorData();
      const sec = { ...data.section };
      if (!sec.contentMd.trim()) {
        sec.contentMd = legacyToMarkdown(sec);
      }
      setSection(sec);
      setItems(data.items);
      setStatus("Loaded.");
      return data;
    } catch {
      setStatus("Could not load about section.");
      return null;
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  const patchSection = (patch: Partial<AboutSectionRecord>) => {
    setSection((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchItem = (index: number, patch: Partial<AboutCurrentlyItemRecord>) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const saveSection = () => {
    if (!section) return;
    startTransition(async () => {
      try {
        await updateAbout(section);
        setStatus("About section published.");
        router.refresh();
      } catch {
        setStatus("Save failed. Title and body are required.");
      }
    });
  };

  const moveItem = (index: number, offset: number) => {
    const to = index + offset;
    if (to < 0 || to >= items.length) return;
    const ordered = [...items];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);

    startTransition(async () => {
      try {
        await reorderAboutCurrentlyItems(ordered.map((r) => r.id));
        setStatus("Currently list order saved.");
      } catch {
        await load();
        setStatus("Reorder failed. Restored order.");
      }
    });
  };

  const saveItem = (index: number) => {
    const row = items[index];
    if (!row) return;
    startTransition(async () => {
      try {
        await updateAboutCurrentlyItem(row.id, {
          title: row.title,
          description: row.description,
        });
        setStatus("Row saved.");
      } catch {
        setStatus("Row save failed.");
      }
    });
  };

  return (
    <div>
      <PageHead
        code="10A"
        sub="CONTENT — ABOUT"
        title="About — story + currently"
        action={
          <button
            type="button"
            className="btn primary"
            style={{ height: 36 }}
            disabled={isPending}
            onClick={saveSection}
          >
            {isPending ? "SAVING…" : "SAVE & PUBLISH"}
          </button>
        }
      />
      <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 14px" }}>
        {status}
      </p>

      <Card label="10A.01" spec="SECTION" style={{ marginBottom: 16 }}>
        <Field label="Section title" hint="the big heading above the story">
          <input
            className="fld"
            value={section.headTitle}
            onChange={(e) => patchSection({ headTitle: e.target.value })}
          />
        </Field>
      </Card>

      <div className="cms-grid-2" style={{ marginBottom: 16 }}>
        <Card label="10A.02 — STORY" spec="MARKDOWN">
          <textarea
            className="fld"
            rows={16}
            value={section.contentMd}
            placeholder={
              "Write your story in markdown…\n\n**bold** renders as the accent highlight, *italics* as emphasis. Blank line = new paragraph. Lists, links, and tables work too."
            }
            onChange={(e) => patchSection({ contentMd: e.target.value })}
            style={{
              minHeight: 320,
              resize: "vertical",
              fontFamily: "var(--mono)",
              lineHeight: 1.6,
            }}
          />
          <p style={{ fontSize: 10.5, color: "var(--ink-3)", margin: "10px 0 0", lineHeight: 1.5 }}>
            One field, full markdown: <b>**highlight**</b>, <i>*emphasis*</i>,
            [links](https://…), lists, `code`, tables. Paragraphs are separated
            by a blank line.
          </p>
        </Card>

        <Card label="10A.03 — PREVIEW" spec="AS RENDERED LIVE">
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: "var(--ink-2)",
              minHeight: 320,
            }}
          >
            {section.contentMd.trim() ? (
              <MarkdownBody>{section.contentMd}</MarkdownBody>
            ) : (
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Start typing to see the live preview.
              </span>
            )}
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--ink-3)" }}>
            CURRENTLY — LIST (RIGHT FRAME)
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
            {items.length} rows
          </div>
        </div>
        <button
          type="button"
          className="btn primary"
          style={{ height: 36 }}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await createAboutCurrentlyItem();
                await load();
                setStatus("New row added.");
              } catch {
                setStatus("Could not add row.");
              }
            })
          }
        >
          + ROW
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((row, i) => (
          <Card key={row.id} label={`10A.${String(20 + i).padStart(2, "0")}`} spec="CURRENTLY">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 26, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || i === 0}
                  onClick={() => moveItem(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 26, padding: "0 8px", fontSize: 10 }}
                  disabled={isPending || i === items.length - 1}
                  onClick={() => moveItem(i, 1)}
                >
                  ↓
                </button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ height: 28, fontSize: 11 }}
                  disabled={isPending}
                  onClick={() => saveItem(i)}
                >
                  SAVE ROW
                </button>
                <button
                  type="button"
                  className="btn slash"
                  style={{ height: 28, fontSize: 11 }}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteAboutCurrentlyItem(row.id);
                        await load();
                        setStatus("Row deleted.");
                      } catch {
                        setStatus("Delete failed.");
                      }
                    })
                  }
                >
                  DELETE
                </button>
              </div>
            </div>
            <Field label="Title (upper)">
              <input
                className="fld"
                value={row.title}
                onChange={(e) => patchItem(i, { title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="fld"
                rows={2}
                value={row.description}
                onChange={(e) => patchItem(i, { description: e.target.value })}
                style={{ minHeight: 52, resize: "vertical" }}
              />
            </Field>
          </Card>
        ))}
      </div>
    </div>
  );
}
