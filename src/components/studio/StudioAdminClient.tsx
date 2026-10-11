"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import {
  studioAddColor,
  studioAdjust,
  studioRemove,
  studioRemoveColor,
  studioRestore,
  studioSetColorOn,
  studioSetOrigin,
  studioSetQuality,
  studioSetStatus,
  studioSignIn,
  studioUpsertColor,
} from "@/app/actions/studio";
import { Motif } from "@/components/students/Motif";
import { useStudentToast } from "@/components/students/StudentToast";
import { STRINGS } from "@/lib/i18n";
import { earnOf, ledgerFor, originRule, rankFor } from "@/lib/ledger";
import {
  colorLabel,
  filterPrints,
  sortAdminPrints,
  stagesFor,
  swatchOf,
  type PrintFilter,
} from "@/lib/prints";
import { teacherName } from "@/lib/teachers";
import type { FilamentColor, PrintOrigin, PrintQuality, PrintRequest } from "@/lib/types";

const EN = STRINGS.en;
const mono = "st-mono";

// ---------------------------------------------------------------- gate

export function StudioGate({ openCount, configured }: { openCount: number; configured: boolean }) {
  const router = useRouter();
  const toast = useStudentToast();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    startTransition(async () => {
      const result = await studioSignIn(pw);
      if (!result.ok) {
        if (result.error !== "wrong") toast(result.error.toUpperCase(), "err");
        setError(true);
        setShake((n) => n + 1);
        return;
      }
      setPw("");
      toast(`WELCOME BACK · ${openCount} JOBS OPEN`);
      router.refresh();
    });
  }

  return (
    <section className="st-gutter flex flex-1 items-start justify-center py-[60px]">
      <div
        key={shake}
        className={`w-[440px] max-w-full border border-[#e9dfd0] border-t-[4px] border-t-[#2a211c] bg-white px-[30px] py-7 ${shake ? "st-shake" : "st-fadeup-4"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`${mono} text-[10px] tracking-[0.18em] text-[#b5342c]`}>× STUDIO TEAM ONLY ×</p>
            <h1 className="mt-1 text-[28px] leading-[1.1] font-semibold">Open the print queue</h1>
          </div>
          <div className="st-sway">
            <Motif name="smallPrinter" cell={7} speed={14} />
          </div>
        </div>
        <label className={`${mono} mt-[18px] block text-[10.5px] tracking-[0.16em] text-[#8c7a68]`} htmlFor="st-pw">
          ADMIN PASSWORD
        </label>
        <input
          id="st-pw"
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Password"
          autoComplete="current-password"
          className="mt-1.5 box-border w-full border px-[13px] py-[11px] text-[18px] tracking-[0.12em]"
          style={{ borderColor: error ? "#b5342c" : "#e9dfd0" }}
        />
        {error && (
          <p className="mt-2 text-[15px] text-[#b5342c]">That&apos;s not it — try again, or ask the coordinator.</p>
        )}
        {!configured && (
          <p className="mt-2 text-[14px] text-[#8c7a68]">STUDIO_ADMIN_PW is not set on the server yet.</p>
        )}
        <button
          type="button"
          onClick={submit}
          className="st-btn st-btn-red mt-[18px] w-full !text-[12px] !text-[#fbf6ee]"
          style={{ opacity: pending ? 0.7 : 1 }}
        >
          OPEN THE QUEUE →
        </button>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- queue

type Confirm = { title: string; body: string; action: string; fn: () => void };

export function StudioQueue({ requests, colors }: { requests: PrintRequest[]; colors: FilamentColor[] }) {
  const router = useRouter();
  const toast = useStudentToast();
  const [rows, setRows] = useState(requests);
  const [seenRows, setSeenRows] = useState(requests);
  const [cols, setCols] = useState(colors);
  const [seenCols, setSeenCols] = useState(colors);
  const [filter, setFilter] = useState<PrintFilter>("open");
  const [justId, setJustId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#888888");
  const [, startTransition] = useTransition();

  if (seenRows !== requests) {
    setSeenRows(requests);
    setRows(requests);
  }
  if (seenCols !== colors) {
    setSeenCols(colors);
    setCols(colors);
  }

  const open = rows.filter((r) => r.status < 3).length;
  const visible = sortAdminPrints(filterPrints(rows, filter));
  const title =
    open === 0 ? "Nothing waiting — the printers are quiet" : open === 1 ? "One job waiting" : `${open} jobs waiting`;

  function flash(id: string) {
    setJustId(id);
    window.setTimeout(() => setJustId((c) => (c === id ? null : c)), 900);
  }
  function replace(updated: PrintRequest) {
    setRows((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }
  function fail(msg: string) {
    toast(msg.toUpperCase(), "err");
    router.refresh();
  }

  /** Optimistic patch + server call + undo toast. */
  function change(
    r: PrintRequest,
    optimistic: Partial<PrintRequest>,
    call: () => Promise<{ ok: true; value?: PrintRequest } | { ok: false; error: string }>,
    msg: string,
    undo: () => Promise<{ ok: true; value?: PrintRequest } | { ok: false; error: string }>,
    undoMsg: string,
  ) {
    const prev = r;
    replace({ ...r, ...optimistic });
    flash(r.id);
    startTransition(async () => {
      const res = await call();
      if (!res.ok) {
        replace(prev);
        fail(res.error);
        return;
      }
      if (res.value) replace(res.value);
      toast(msg, {
        undo: async () => {
          replace(prev);
          const back = await undo();
          if (!back.ok) {
            fail(back.error);
            return;
          }
          if (back.value) replace(back.value);
          flash(r.id);
          toast(undoMsg);
        },
      });
    });
  }

  const ORIGIN_OPTS: { v: PrintOrigin; label: string; bg: string; fg: string }[] = [
    { v: "mine", label: "OWN", bg: "#fdecea", fg: "#b5342c" },
    { v: "school", label: "SCHOOL · FREE", bg: "#e6edf4", fg: "#3b6285" },
    { v: "found", label: "FOUND", bg: "#f1ebe0", fg: "#2a211c" },
  ];

  // ---- colours
  function toggleColor(c: FilamentColor) {
    const next = { ...c, on: !c.on };
    setCols((list) => list.map((x) => (x.v === c.v ? next : x)));
    startTransition(async () => {
      const res = await studioSetColorOn(c.v, next.on);
      if (!res.ok) {
        setCols((list) => list.map((x) => (x.v === c.v ? c : x)));
        fail(res.error);
        return;
      }
      toast(c.label + (c.on ? " HIDDEN FROM STUDENTS" : " BACK ON OFFER ✓"), {
        undo: async () => {
          setCols((list) => list.map((x) => (x.v === c.v ? c : x)));
          const back = await studioSetColorOn(c.v, c.on);
          if (!back.ok) fail(back.error);
          else toast("COLOURS RESTORED ✓");
        },
      });
    });
  }
  function removeColor(c: FilamentColor) {
    setCols((list) => list.filter((x) => x.v !== c.v));
    startTransition(async () => {
      const res = await studioRemoveColor(c.v);
      if (!res.ok) {
        setCols((list) => [...list, c]);
        fail(res.error);
        return;
      }
      toast(`${c.label} REMOVED`, {
        undo: async () => {
          const back = await studioUpsertColor(c);
          if (!back.ok) fail(back.error);
          else {
            setCols((list) => [...list.filter((x) => x.v !== c.v), back.value ?? c]);
            toast(`${c.label} RESTORED ✓`);
          }
        },
      });
    });
  }
  function addColor() {
    const name = newName.trim();
    if (!name) {
      toast("GIVE THE COLOUR A NAME FIRST", "err");
      return;
    }
    startTransition(async () => {
      const res = await studioAddColor(name, newHex, cols.length);
      if (!res.ok) {
        if (res.error === "duplicate") toast(`${name.toUpperCase()} IS ALREADY ON THE LIST`, "err");
        else fail(res.error);
        return;
      }
      const added = res.value!;
      setCols((list) => [...list, added]);
      setNewName("");
      setNewHex("#888888");
      toast(`${added.label} ADDED · STUDENTS CAN PICK IT NOW`, {
        undo: async () => {
          const back = await studioRemoveColor(added.v);
          if (!back.ok) fail(back.error);
          else {
            setCols((list) => list.filter((x) => x.v !== added.v));
            toast(`${added.label} REMOVED ✓`);
          }
        },
      });
    });
  }

  const sel = (on: boolean) => ({
    background: on ? "#2a211c" : "#fff",
    color: on ? "#fbf6ee" : "#5e5047",
    borderColor: on ? "#2a211c" : "#e9dfd0",
  });

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className={`${mono} text-[11px] tracking-[0.2em] text-[#b5342c]`}>× PRINT QUEUE ×</p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter">
          {(
            [
              ["open", `OPEN · ${open}`],
              ["ready", "READY"],
              ["vinyl", "VINYL ONLY"],
              ["all", `ALL · ${rows.length}`],
            ] as [PrintFilter, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={filter === v}
              onClick={() => setFilter(v)}
              className="st-nav-tab !text-[11px] !tracking-[0.1em]"
              style={sel(filter === v)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* colours */}
      <section className="st-fadeup-45 mx-[5vw] mt-[18px] border border-[#e9dfd0] bg-white px-[22px] py-[18px]" style={{ animationDelay: ".08s" }}>
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[22px] font-semibold">Filament colours on offer</h2>
          <p className="text-[15px] text-[#8c7a68]">
            Students only see colours that are switched on. Turn one off when a spool runs out.
          </p>
          <span className="flex-1" />
          <span className={`${mono} text-[10px] tracking-[0.12em] text-[#8c7a68]`}>
            {cols.filter((c) => c.on).length} OF {cols.length} ON
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cols.map((c) => (
            <span
              key={c.v}
              role="button"
              tabIndex={0}
              className="st-colour-chip"
              data-on={c.on}
              title={c.on ? "On offer — click to hide from students" : "Hidden from students — click to offer again"}
              onClick={() => toggleColor(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleColor(c);
              }}
            >
              <span className="st-diamond !h-[18px] !w-[18px]" style={{ background: c.hex }} />
              <span
                className={`st-colour-label ${mono} text-[10.5px] tracking-[0.08em]`}
                style={{ color: c.on ? "#2a211c" : "#8c7a68" }}
              >
                {c.label}
              </span>
              <button
                type="button"
                className="st-colour-x"
                title="Remove this colour"
                aria-label={`Remove ${c.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeColor(c);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <span className="flex items-center gap-1.5 border-[1.5px] border-dashed border-[#c9b9a1] py-1 pr-1.5 pl-2.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addColor();
              }}
              placeholder="New colour, e.g. Green"
              className="w-[160px] !border-0 bg-transparent text-[16px]"
            />
            <input
              type="color"
              value={newHex}
              onChange={(e) => setNewHex(e.target.value)}
              title="Pick the swatch"
              className="h-[26px] w-[26px] cursor-pointer !border-0 bg-transparent p-0"
            />
            <button
              type="button"
              onClick={addColor}
              className={`${mono} bg-[#2a211c] px-2.5 py-[7px] text-[10px] tracking-[0.1em] text-[#fbf6ee] hover:bg-[#b5342c]`}
            >
              + ADD
            </button>
          </span>
        </div>
      </section>

      {/* jobs */}
      {visible.length === 0 && (
        <p className="mx-[5vw] mt-[18px] border border-dashed border-[#d9cdbb] px-6 py-9 text-center text-[17px] leading-[1.5] text-[#8c7a68]">
          {rows.length === 0 ? "No print requests yet — students send them from the student site." : "Nothing in this view."}
        </p>
      )}
      <section className="mx-[5vw] mt-[18px] mb-14 flex flex-col gap-3">
        {visible.map((r) => {
          const stages = stagesFor(r.kind);
          const led = ledgerFor(rows, r.email);
          const rule = originRule(r.origin);
          const earn = earnOf(r);
          const rankShort = EN.track.ranks[rankFor(led.earned)].short;
          const spec =
            r.kind === "3d"
              ? colorLabel(r.color, cols)
              : `${r.qty} × VINYL${r.cut ? ` · ${r.cut.toUpperCase()} CUT` : ""}`;
          const meta = [
            r.name.toUpperCase(),
            r.email.toUpperCase(),
            r.origin === "school" ? `FOR ${teacherName(r.teacher).toUpperCase()} · FREE` : null,
            rankShort,
            `${led.earned} ST`,
            `BALANCE ${led.balance}`,
            spec,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <article
              key={r.id}
              className={`border border-[#e9dfd0] bg-white px-5 py-4 ${justId === r.id ? "st-rowflash" : ""}`}
              style={{ borderTop: `4px solid ${r.status === 3 ? "#2f7d3f" : "#2a211c"}` }}
            >
              <div className="flex flex-wrap items-center gap-3.5">
                <span className={`${mono} shrink-0 bg-[#2a211c] px-[7px] py-[3px] text-[9px] tracking-[0.12em] text-[#fbf6ee]`}>
                  {EN.form.kinds[r.kind].tag}
                </span>
                <span className="st-diamond" style={{ background: swatchOf(r.color, cols) }} aria-hidden />
                <div className="min-w-[220px] flex-1">
                  <p className="text-[21px] leading-[1.15] font-semibold">{r.file}</p>
                  <p className={`${mono} mt-1 text-[9.5px] leading-[1.6] tracking-[0.08em] text-[#8c7a68]`}>{meta}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="st-seg" title="Who designed it — drives the student's points. Change if a claim looks wrong." role="radiogroup">
                    {ORIGIN_OPTS.map((o) => {
                      const cur = r.origin === o.v;
                      return (
                        <button
                          key={o.v}
                          type="button"
                          role="radio"
                          aria-checked={cur}
                          style={{ background: cur ? o.bg : "#fff", color: cur ? o.fg : "#c9b9a1" }}
                          onClick={() => {
                            if (cur) return;
                            const nextEarn = earnOf({ origin: o.v, quality: r.quality });
                            change(
                              r,
                              { origin: o.v },
                              () => studioSetOrigin(r.id, o.v),
                              `${r.file.toUpperCase()} · ORIGIN → ${o.label}${o.v === "school" ? " · 10 POINTS REFUNDED" : ` · NOW EARNS +${nextEarn}`}`,
                              () => studioSetOrigin(r.id, r.origin),
                              "ORIGIN RESTORED ✓",
                            );
                          }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  {r.origin === "mine" && (
                    <div
                      className="flex flex-none items-center gap-[3px]"
                      title="Quality rating — sets how many points the student earns back (paid when READY)"
                    >
                      {[1, 2, 3].map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="st-star"
                          aria-label={`Quality ${q}`}
                          style={{ color: r.quality >= q ? "#b5342c" : "#e9dfd0" }}
                          onClick={() => {
                            if (r.quality === q) return;
                            const nextEarn = earnOf({ origin: r.origin, quality: q as PrintQuality });
                            change(
                              r,
                              { quality: q as 1 | 2 | 3 },
                              () => studioSetQuality(r.id, q),
                              `${r.file.toUpperCase()} · QUALITY ${"×".repeat(q)} · EARNS +${nextEarn}`,
                              () => studioSetQuality(r.id, r.quality),
                              "RATING RESTORED ✓",
                            );
                          }}
                        >
                          ×
                        </button>
                      ))}
                      <span className={`${mono} ml-1 text-[9.5px] tracking-[0.06em] text-[#8c7a68]`}>
                        +{earn}
                        {r.status === 3 ? " PAID" : " ON READY"}
                      </span>
                    </div>
                  )}
                  <div className="st-seg" role="radiogroup" aria-label={`Stage for ${r.file}`}>
                    {stages.map((label, i) => {
                      const cur = r.status === i;
                      const tone =
                        i === 3
                          ? { bg: "#eef6ef", fg: "#2f7d3f" }
                          : i === 0
                            ? { bg: "#f1ebe0", fg: "#2a211c" }
                            : { bg: "#fdf4e3", fg: "#9a6e06" };
                      return (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={cur}
                          style={{ background: cur ? tone.bg : "#fff", color: cur ? tone.fg : "#c9b9a1" }}
                          onClick={() => {
                            if (cur) return;
                            change(
                              r,
                              { status: i as 0 | 1 | 2 | 3 },
                              () => studioSetStatus(r.id, i),
                              `${r.file.toUpperCase()} → ${label}${i === 3 && earn ? ` · +${earn} POINTS PAID TO ${r.name.toUpperCase()}` : ""}`,
                              () => studioSetStatus(r.id, r.status),
                              "STAGE RESTORED ✓",
                            );
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="st-ghost-btn"
                    title="Give this student +10 points"
                    onClick={() =>
                      change(
                        r,
                        { adjust: r.adjust + 10 },
                        () => studioAdjust(r.id, 10),
                        `${r.name.toUpperCase()} · +10 POINTS · BALANCE NOW ${led.balance + 10}`,
                        () => studioAdjust(r.id, -10),
                        "TOP-UP REVERSED ✓",
                      )
                    }
                  >
                    +10 TOP UP
                  </button>
                  <button
                    type="button"
                    className="st-cancel !text-[20px] !text-[#c9b9a1]"
                    title="Remove request"
                    aria-label={`Remove ${r.file}`}
                    onClick={() =>
                      setConfirm({
                        title: "Remove this request?",
                        body: `${r.file} from ${r.name} — the student will no longer see it${rule.free ? "." : ", and their 10 points come back."}`,
                        action: "REMOVE IT",
                        fn: () => {
                          setRows((list) => list.filter((x) => x.id !== r.id));
                          startTransition(async () => {
                            const res = await studioRemove(r.id);
                            if (!res.ok) {
                              setRows((list) => [r, ...list]);
                              fail(res.error);
                              return;
                            }
                            const snap = res.value ?? r;
                            toast("REQUEST REMOVED", {
                              undo: async () => {
                                const back = await studioRestore(snap);
                                if (!back.ok) fail(back.error);
                                else {
                                  const restored = back.value ?? snap;
                                  setRows((list) => [restored, ...list.filter((x) => x.id !== restored.id)]);
                                  flash(restored.id);
                                  toast("REQUEST RESTORED ✓");
                                }
                              },
                            });
                          });
                        },
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {confirm && (
        <div className="st-confirm-backdrop" onClick={() => setConfirm(null)} role="presentation">
          <div className="st-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className={`${mono} text-[10px] tracking-[0.18em] text-[#b5342c]`}>× ARE YOU SURE ×</p>
            <h2 className="mt-1.5 text-[26px] leading-[1.15] font-semibold">{confirm.title}</h2>
            <p className="mt-2 text-[16.5px] leading-[1.5] text-[#5e5047]">{confirm.body}</p>
            <div className="mt-[18px] flex gap-2.5">
              <button
                type="button"
                className={`${mono} flex-1 bg-[#b5342c] py-[13px] text-center text-[11.5px] tracking-[0.12em] text-[#fbf6ee] hover:bg-[#9a2c25]`}
                onClick={() => {
                  const fn = confirm.fn;
                  setConfirm(null);
                  fn();
                }}
              >
                {confirm.action}
              </button>
              <button
                type="button"
                className={`${mono} border border-[#2a211c] px-[18px] py-3 text-[11.5px] tracking-[0.12em] text-[#2a211c] hover:bg-[#2a211c] hover:text-[#fbf6ee]`}
                onClick={() => setConfirm(null)}
              >
                KEEP IT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
