"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AboutContent } from "@/app/components/data";
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
      setSection(data.section);
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
        setStatus("About copy saved.");
        router.refresh();
      } catch {
        setStatus("Save failed. Check required fields.");
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
            SAVE SECTION
          </button>
        }
      />
      <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 14px" }}>
        {status}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card label="10A.01" spec="SECTION HEAD">
          <Field label="Code">
            <input
              className="fld"
              value={section.headCode}
              onChange={(e) => patchSection({ headCode: e.target.value })}
            />
          </Field>
          <Field label="Label">
            <input
              className="fld"
              value={section.headLabel}
              onChange={(e) => patchSection({ headLabel: e.target.value })}
            />
          </Field>
          <Field label="Title">
            <input
              className="fld"
              value={section.headTitle}
              onChange={(e) => patchSection({ headTitle: e.target.value })}
            />
          </Field>
        </Card>
        <Card label="10A.02" spec="FRAME (RIGHT COLUMN)">
          <Field label="Frame label">
            <input
              className="fld"
              value={section.frameLabel}
              onChange={(e) => patchSection({ frameLabel: e.target.value })}
            />
          </Field>
          <Field label="Frame spec">
            <input
              className="fld"
              value={section.frameSpec}
              onChange={(e) => patchSection({ frameSpec: e.target.value })}
            />
          </Field>
        </Card>
      </div>

      <Card label="10A.03" spec="BODY" style={{ marginBottom: 16 }}>
        <Field label="Paragraph 1">
          <textarea
            className="fld"
            rows={4}
            value={section.paragraph1}
            onChange={(e) => patchSection({ paragraph1: e.target.value })}
            style={{ minHeight: 88, resize: "vertical" }}
          />
        </Field>
        <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "0 0 8px" }}>
          Paragraph 2 is split so the highlight (mark) and stack line (emphasis) stay styled without raw HTML.
        </p>
        <Field label="P2 — before highlight">
          <input
            className="fld"
            value={section.paragraph2Prefix}
            onChange={(e) => patchSection({ paragraph2Prefix: e.target.value })}
          />
        </Field>
        <Field label="P2 — highlight (mark)">
          <input
            className="fld"
            value={section.paragraph2Highlight}
            onChange={(e) => patchSection({ paragraph2Highlight: e.target.value })}
          />
        </Field>
        <Field label="P2 — after highlight, before emphasis">
          <textarea
            className="fld"
            rows={2}
            value={section.paragraph2Mid}
            onChange={(e) => patchSection({ paragraph2Mid: e.target.value })}
            style={{ minHeight: 52, resize: "vertical" }}
          />
        </Field>
        <Field label="P2 — emphasis (stack line)">
          <input
            className="fld"
            value={section.paragraph2Emphasis}
            onChange={(e) => patchSection({ paragraph2Emphasis: e.target.value })}
          />
        </Field>
        <Field label="P2 — after emphasis">
          <input
            className="fld"
            value={section.paragraph2Suffix}
            onChange={(e) => patchSection({ paragraph2Suffix: e.target.value })}
          />
        </Field>
        <Field label="Paragraph 3">
          <textarea
            className="fld"
            rows={3}
            value={section.paragraph3}
            onChange={(e) => patchSection({ paragraph3: e.target.value })}
            style={{ minHeight: 72, resize: "vertical" }}
          />
        </Field>
      </Card>

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
            CURRENTLY — LIST
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
