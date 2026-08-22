"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deleteStudentProject,
  ensureAdminProjectEditKey,
  restoreStudentProject,
  updateProjectSprintDue,
  updateProjectSprintStatus,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import {
  formatSprintDue,
  isSprintOverdue,
  nextOpenSprint,
  sprintProgress,
  todayIsoLocal,
} from "@/lib/projects";
import type { SprintStatus, StudentProject } from "@/lib/types";

type AdminProjectsPanelProps = {
  projects: StudentProject[];
  onDone: () => void;
};

const STATUS_OPTS: Array<{ v: SprintStatus; label: string }> = [
  { v: "todo", label: "TO DO" },
  { v: "doing", label: "IN PROGRESS" },
  { v: "done", label: "DONE" },
];

function statusStyle(v: SprintStatus, selected: boolean) {
  if (!selected) return { background: "#fff", color: "#b5afa1" };
  if (v === "doing") return { background: "#fdf4e3", color: "#9a6e06" };
  if (v === "done") return { background: "#dff2e3", color: "#2f7d3f" };
  return { background: "#eeece5", color: "#3f3b33" };
}

export function AdminProjectsPanel({
  projects: initial,
  onDone,
}: AdminProjectsPanelProps) {
  const [rows, setRows] = useState(initial);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const askConfirm = useConfirm();
  const { notify } = useAdminWrite();
  const today = todayIsoLocal();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  if (rows.length === 0) {
    return (
      <div className="no-print page-gutter mb-11 text-[14.5px] text-[#6d6759]">
        No student projects yet — teachers create them from the Projects page.
      </div>
    );
  }

  return (
    <div className="no-print page-gutter mb-11 space-y-4">
      {rows.map((p) => {
        const open = !!openIds[p.id];
        const prog = sprintProgress(p);
        const next = nextOpenSprint(p);
        const overdue = next ? isSprintOverdue(next, today) : false;
        return (
          <section
            key={p.id}
            className="border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white"
          >
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="shrink-0 bg-[#141414] px-2 py-1 font-mono text-[11px] text-white">
                {p.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{p.unit}</p>
                <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#98917f]">
                  {p.course.toUpperCase()} · {p.email.toUpperCase()} ·{" "}
                  {p.weeks.length} SPRINTS
                </p>
                <div className="mt-2 h-1.5 max-w-[240px] overflow-hidden bg-[#eeece5]">
                  <div
                    className="kis-bar h-full bg-[#c8102e]"
                    style={{ width: `${prog.pct}%` }}
                  />
                </div>
              </div>
              <span
                className="shrink-0 font-mono text-[10.5px]"
                style={{
                  color: overdue
                    ? "#c8102e"
                    : prog.done === prog.total
                      ? "#2f9e44"
                      : "#6d6759",
                }}
              >
                {prog.done === prog.total
                  ? "ALL DONE ✓"
                  : overdue && next
                    ? `OVERDUE · ${formatSprintDue(next.due)}`
                    : next
                      ? `NEXT ${formatSprintDue(next.due)}`
                      : ""}
              </span>
              <button
                type="button"
                title="Open drag-and-drop board"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(async () => {
                    const result = await ensureAdminProjectEditKey(p.id);
                    if (!result.ok || !result.editKey) {
                      notify(result.ok ? "Could not open board" : result.error, {
                        bg: "#141414",
                      });
                      return;
                    }
                    window.open(
                      `/projects?edit=${p.id}.${result.editKey}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                    notify("BOARD OPENED · DRAG CARDS BETWEEN COLUMNS", {
                      bg: "#141414",
                    });
                  });
                }}
                className="rounded-full border border-[#e3e0d8] px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] text-[#3f3b33] transition-colors hover:border-[#141414] hover:bg-[#141414] hover:text-white"
              >
                BOARD ↗
              </button>
              <button
                type="button"
                title="Remove project"
                disabled={pending}
                onClick={() =>
                  askConfirm({
                    title: "Remove this project?",
                    body: `${p.initials} · ${p.unit} — the board is deleted for the teacher.`,
                    action: "Remove project",
                    fn: async () => {
                      const snapshot = p;
                      const result = await deleteStudentProject(p.id);
                      if (!result.ok) throw new Error(result.error);
                      setRows((prev) => prev.filter((x) => x.id !== p.id));
                      notify("PROJECT REMOVED", {
                        bg: "#141414",
                        undo: async () => {
                          const restored = await restoreStudentProject(snapshot);
                          if (!restored.ok) return;
                          notify("PROJECT RESTORED ✓");
                          onDone();
                        },
                      });
                      onDone();
                    },
                  })
                }
                className="px-1 text-[18px] text-[#857e6e] hover:text-[#c8102e]"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpenIds((o) => ({ ...o, [p.id]: !open }))
                }
                className="border border-[#e3e0d8] px-3 py-1.5 text-[13px] font-semibold hover:border-[#141414]"
              >
                {open ? "▲" : "▼"}
              </button>
            </div>

            {open && (
              <div className="border-t border-[#eeece5] px-5 py-4">
                {p.summary && (
                  <p className="mb-4 text-[13.5px] text-[#6d6759]">{p.summary}</p>
                )}
                <div className="space-y-3">
                  {p.weeks.map((w) => {
                    const wOver = isSprintOverdue(w, today);
                    return (
                      <div
                        key={w.n}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <span className="shrink-0 bg-[#141414] px-1.5 py-0.5 font-mono text-[10px] text-white">
                          S{w.n}
                        </span>
                        <span
                          className="min-w-[140px] flex-1 text-[13.5px]"
                          style={{
                            color: w.status === "done" ? "#98917f" : "#3f3b33",
                          }}
                        >
                          {w.objective}
                        </span>
                        <input
                          type="date"
                          value={w.due}
                          disabled={pending}
                          onChange={(e) => {
                            const due = e.target.value;
                            startTransition(async () => {
                              const prev = w.due;
                              setRows((list) =>
                                list.map((proj) =>
                                  proj.id !== p.id
                                    ? proj
                                    : {
                                        ...proj,
                                        weeks: proj.weeks.map((s) =>
                                          s.n === w.n ? { ...s, due } : s,
                                        ),
                                      },
                                ),
                              );
                              const result = await updateProjectSprintDue(
                                p.id,
                                w.n,
                                due,
                              );
                              if (!result.ok) {
                                setRows((list) =>
                                  list.map((proj) =>
                                    proj.id !== p.id
                                      ? proj
                                      : {
                                          ...proj,
                                          weeks: proj.weeks.map((s) =>
                                            s.n === w.n
                                              ? { ...s, due: prev }
                                              : s,
                                          ),
                                        },
                                  ),
                                );
                                return;
                              }
                              notify(
                                `DUE DATE UPDATED · S${w.n} · ${formatSprintDue(due)}`,
                              );
                              onDone();
                            });
                          }}
                          className="w-[140px] border-0 border-b bg-transparent py-1 text-[13px] outline-none focus:border-[#141414]"
                          style={{
                            borderColor: wOver ? "#c8102e" : "#e3e0d8",
                          }}
                        />
                        <div className="flex shrink-0 overflow-hidden rounded-full border border-[#e3e0d8]">
                          {STATUS_OPTS.map((o) => {
                            const selected = w.status === o.v;
                            return (
                              <button
                                key={o.v}
                                type="button"
                                disabled={pending || selected}
                                onClick={() => {
                                  if (selected) return;
                                  startTransition(async () => {
                                    const prev = w.status;
                                    setRows((list) =>
                                      list.map((proj) =>
                                        proj.id !== p.id
                                          ? proj
                                          : {
                                              ...proj,
                                              weeks: proj.weeks.map((s) =>
                                                s.n === w.n
                                                  ? { ...s, status: o.v }
                                                  : s,
                                              ),
                                            },
                                      ),
                                    );
                                    const result =
                                      await updateProjectSprintStatus(
                                        p.id,
                                        w.n,
                                        o.v,
                                      );
                                    if (!result.ok) {
                                      setRows((list) =>
                                        list.map((proj) =>
                                          proj.id !== p.id
                                            ? proj
                                            : {
                                                ...proj,
                                                weeks: proj.weeks.map((s) =>
                                                  s.n === w.n
                                                    ? { ...s, status: prev }
                                                    : s,
                                                ),
                                              },
                                        ),
                                      );
                                      return;
                                    }
                                    notify(
                                      `SPRINT ${w.n} → ${o.label} · ${p.initials} · ${p.unit.toUpperCase()}`,
                                    );
                                    onDone();
                                  });
                                }}
                                className="px-[9px] py-[3px] font-mono text-[9.5px] tracking-[0.08em] enabled:hover:text-[#141414] disabled:cursor-default"
                                style={statusStyle(o.v, selected)}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
