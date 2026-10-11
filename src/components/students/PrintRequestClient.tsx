"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPrintRequest, listPrintRequests } from "@/app/actions/prints";
import { useLocale } from "@/components/students/Locale";
import { Motif } from "@/components/students/Motif";
import { useStudentToast } from "@/components/students/StudentToast";
import { stageNames } from "@/lib/i18n";
import {
  PRINT_COST,
  START_POINTS,
  canAfford,
  earnRange,
  ledgerFor,
} from "@/lib/ledger";
import {
  MAX_PRINT_FILE_BYTES,
  PRINT_CUTS,
  PRINT_KINDS,
  PRINT_ORIGINS,
  formatMb,
  isValidEmail,
  kindMeta,
} from "@/lib/prints";
import { uploadPrintFile } from "@/lib/print-upload";
import {
  readStudentEmail,
  readStudentIdentity,
  writeStudentEmail,
  writeStudentIdentity,
} from "@/lib/student-session";
import { TEACHERS, teacherById } from "@/lib/teachers";
import type {
  FilamentColor,
  PrintCut,
  PrintKind,
  PrintOrigin,
  PrintRequest,
} from "@/lib/types";

type Props = { initialKind: PrintKind; colors: FilamentColor[] };

const label = "st-mono text-[10.5px] tracking-[0.16em] text-[#8c7a68]";
const input = "mt-[7px] box-border w-full border px-3 py-2.5 text-[18px]";

export function PrintRequestClient({ initialKind, colors }: Props) {
  const router = useRouter();
  const toast = useStudentToast();
  const { t } = useLocale();
  const F = t.form;
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fKind, setFKind] = useState<PrintKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [fColor, setFColor] = useState("red");
  const [fQty, setFQty] = useState(1);
  const [fCut, setFCut] = useState<PrintCut>("contour");
  const [fOrigin, setFOrigin] = useState<PrintOrigin | "">("");
  const [fTeacher, setFTeacher] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<PrintRequest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const kind = kindMeta(fKind);
  const K = F.kinds[fKind];
  const is3d = fKind === "3d";
  const isVinyl = !is3d;
  const isSchool = fOrigin === "school";

  // Only colours switched on are offered; fall back to the first if the pick was hidden.
  const onColors = colors.filter((c) => c.on);
  const color = onColors.some((c) => c.v === fColor) ? fColor : (onColors[0]?.v ?? "");

  useEffect(() => {
    const id = readStudentIdentity();
    const sess = readStudentEmail();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (id.name) setFName(id.name);
      if (sess || id.email) setFEmail(sess || id.email || "");
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStudentIdentity({ name: fName, email: fEmail, grade: "" });
  }, [fName, fEmail, hydrated]);

  const [seenKind, setSeenKind] = useState(initialKind);
  if (seenKind !== initialKind) {
    setSeenKind(initialKind);
    if (fKind !== initialKind) {
      setFKind(initialKind);
      setFile(null);
    }
  }

  const loadMine = useCallback(async (email: string) => {
    const my = ++seq.current;
    if (!isValidEmail(email)) {
      setMine([]);
      return;
    }
    try {
      const list = await listPrintRequests(email);
      if (seq.current === my) setMine(list);
    } catch {
      if (seq.current === my) setMine([]);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const tm = window.setTimeout(() => void loadMine(fEmail), 300);
    return () => window.clearTimeout(tm);
  }, [fEmail, hydrated, loadMine]);

  const who = fEmail.trim().toLowerCase();
  const emailOk = isValidEmail(who);
  const ledger = ledgerFor(mine, who);
  const balance = emailOk ? ledger.balance : START_POINTS;
  const broke = emailOk && !canAfford(balance, isSchool ? "school" : "found");

  const missing: string[] = [];
  if (!fName.trim()) missing.push(F.missing.name);
  if (!emailOk) missing.push(F.missing.email);
  if (!file) missing.push(K.missingFile);
  if (!fOrigin) missing.push(F.missing.origin);
  if (isSchool && !teacherById(fTeacher)) missing.push(F.missing.teacher);
  const ready = missing.length === 0;

  const teacher = teacherById(fTeacher);
  const cutMeta = F.cuts[fCut];
  const colorMeta = onColors.find((c) => c.v === color);
  const summary = broke
    ? F.brokeSummary(balance)
    : ready && file
      ? F.readyToSend +
        (is3d
          ? F.summary3d(file.name, (colorMeta?.label ?? color).toLowerCase())
          : F.summaryVinyl(fQty, file.name, K.label.toLowerCase(), cutMeta.label.toLowerCase())) +
        (isSchool ? F.summaryFree(teacher?.name ?? "") : F.summaryCost(balance - PRINT_COST))
      : F.stillNeeded(missing.join(", "));

  const walletColor = broke ? "#b5342c" : balance <= 10 ? "#9a6e06" : "#2f7d3f";
  const walletHint = !who
    ? F.walletNoEmail
    : isSchool
      ? F.walletSchool(balance)
      : broke
        ? F.walletBroke
        : ledger.pending
          ? F.walletPending(ledger.pending)
          : F.walletDefault;

  const canSubmit = ready && !broke;

  function pickKind(v: PrintKind) {
    if (v === fKind) return;
    setFKind(v);
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    toast(F.kinds[v].pickToast);
    router.replace(`/print?kind=${v}`, { scroll: false });
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!kind.re.test(f.name)) {
      toast(K.wrongFile, "err");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_PRINT_FILE_BYTES) {
      toast(F.tooBig, "err");
      e.target.value = "";
      return;
    }
    setFile(f);
    toast(
      F.attachedToast +
        f.name.toUpperCase() +
        (fKind === "sticker" && !/\.svg$/i.test(f.name) ? F.svgTip : ""),
    );
  }

  async function submit() {
    if (sending) return;
    if (broke) {
      toast(F.notEnoughToast, "err");
      return;
    }
    if (!ready || !file || !fOrigin) {
      setTried(true);
      toast(F.almost(missing.join(", ").toUpperCase()), "err");
      return;
    }
    setSending(true);
    const origin = fOrigin;
    const snapTeacher = teacher;
    try {
      const filePath = await uploadPrintFile(file);
      const result = await createPrintRequest({
        kind: fKind,
        origin,
        teacher: isSchool ? fTeacher : null,
        name: fName.trim(),
        email: who,
        fileName: file.name,
        filePath,
        color: is3d ? color : "vinyl",
        qty: is3d ? 1 : fQty,
        cut: is3d ? null : fCut,
      });
      if (!result.ok) {
        toast(result.error.toUpperCase(), "err");
        return;
      }
      writeStudentEmail(who);
      if (result.request) setMine((prev) => [result.request!, ...prev]);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setFQty(1);
      setFOrigin("");
      setFTeacher("");
      setTried(false);
      const [lo, hi] = earnRange(origin);
      toast(
        origin === "school"
          ? F.sentSchool(snapTeacher?.name ?? "")
          : origin === "mine"
            ? F.sentMine(lo, hi)
            : F.sentFound(balance - PRINT_COST),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast(/env|configured/i.test(msg) ? F.dbError : F.uploadFailed + msg.toUpperCase(), "err");
    } finally {
      setSending(false);
    }
  }

  const recent = mine.slice(0, 3);
  const emptyMsg = emailOk ? F.emptyUnder(fEmail.trim()) : F.emptyNoEmail;

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">{F.eyebrow}</p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">{K.title}</h1>
        </div>
        <div className="st-sway">
          <Motif name="smallPrinter" cell={8} speed={12} />
        </div>
      </section>

      <section className="st-grid-request mx-[5vw] mt-[18px] mb-14">
        <form
          className="st-fadeup-45 border border-[#e9dfd0] border-t-[4px] border-t-[#b5342c] bg-white p-6"
          style={{ animationDelay: ".1s" }}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <div className="st-form-grid">
            <div>
              <label className={label} htmlFor="st-name">
                {F.name}
              </label>
              <input
                id="st-name"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder={F.namePlaceholder}
                autoComplete="name"
                className={input}
                style={{ borderColor: tried && !fName.trim() ? "#b5342c" : "#e9dfd0" }}
              />
            </div>
            <div>
              <label className={label} htmlFor="st-email">
                {F.email}
              </label>
              <input
                id="st-email"
                type="email"
                value={fEmail}
                onChange={(e) => {
                  setFEmail(e.target.value);
                  writeStudentEmail(e.target.value);
                }}
                placeholder="olena.k@kis.edu"
                autoComplete="email"
                className={input}
                style={{ borderColor: tried && !emailOk ? "#b5342c" : "#e9dfd0" }}
              />
              <p className="mt-1 text-[14px] text-[#8c7a68]">{F.emailHint}</p>
            </div>

            {/* wallet strip */}
            <div
              className="st-span-2 flex flex-wrap items-center gap-4 border px-4 py-3 transition-all duration-300"
              style={{
                background: broke ? "#fdecea" : "#fbf6ee",
                borderColor: broke ? "#e7b6b1" : "#e9dfd0",
              }}
            >
              <span className="st-mono text-[10px] tracking-[0.16em] text-[#8c7a68]">{F.yourPoints}</span>
              <span className="st-mono text-[26px] leading-none font-bold" style={{ color: walletColor }}>
                {balance}
              </span>
              <span className="min-w-[180px] flex-1 text-[15.5px] leading-[1.4] text-[#5e5047]">{walletHint}</span>
              <span
                className="st-mono flex-none cursor-help text-[9.5px] tracking-[0.1em] text-[#b5342c]"
                title={F.pointsRules}
              >
                {F.howPointsWork}
              </span>
            </div>

            <div className="st-span-2">
              <p className={`${label} mb-2`}>{F.what}</p>
              <div className="st-kind-grid" role="radiogroup" aria-label={F.what}>
                {PRINT_KINDS.map((k) => {
                  const on = fKind === k.v;
                  return (
                    <button
                      key={k.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className="st-kind-tile"
                      data-on={on}
                      onClick={() => pickKind(k.v)}
                    >
                      <Motif key={on ? "on" : "off"} name={k.motif} cell={4} color={on ? "#b5342c" : "#c9b9a1"} speed={20} />
                      <span>
                        <span className="st-kind-label block text-[18px] leading-[1.1] font-semibold text-[#2a211c]">
                          {F.kinds[k.v].label}
                        </span>
                        <span
                          className="st-mono st-kind-hint mt-[3px] block text-[9.5px] tracking-[0.08em]"
                          style={{ color: on ? "#b5342c" : "#8c7a68" }}
                        >
                          {F.kinds[k.v].hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="st-span-2">
              <p className={label}>{K.fileLabel}</p>
              <label
                className="mt-2 flex cursor-pointer items-center gap-4 border-[1.5px] border-dashed px-[18px] py-4 transition-all duration-200"
                style={{
                  borderColor: file ? "#2f7d3f" : tried ? "#b5342c" : "#c9b9a1",
                  background: file ? "#eef6ef" : "#fbf6ee",
                }}
              >
                <Motif key={file ? "ok" : "none"} name="file" cell={4} color={file ? "#2f7d3f" : "#b5342c"} speed={20} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-semibold">{file ? file.name : K.choose}</span>
                  <span className="block text-[14.5px] text-[#8c7a68]">
                    {file ? F.attachedSub(formatMb(file.size)) : K.fileSub}
                  </span>
                </span>
                <input ref={fileInput} type="file" accept={kind.accept} onChange={onFile} className="hidden" />
              </label>
            </div>

            {isVinyl && (
              <div className="st-span-2 st-vinyl-grid">
                <div>
                  <p className={label}>{F.howMany}</p>
                  <div className="mt-[7px] flex items-center gap-3">
                    <button
                      type="button"
                      className="st-step-btn"
                      aria-label="−"
                      disabled={fQty <= 1}
                      style={{ borderColor: fQty > 1 ? "#2a211c" : "#e9dfd0" }}
                      onClick={() => setFQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span className="st-mono min-w-[40px] text-center text-[22px]" aria-live="polite">
                      {fQty}
                    </span>
                    <button
                      type="button"
                      className="st-step-btn"
                      aria-label="+"
                      disabled={fQty >= 50}
                      style={{ borderColor: fQty < 50 ? "#2a211c" : "#e9dfd0" }}
                      onClick={() => setFQty((q) => Math.min(50, q + 1))}
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-1 text-[14px] text-[#8c7a68]">
                    {fQty >= 20 ? F.bigBatch : fKind === "poster" ? F.posterCopies : F.identicalStickers}
                  </p>
                </div>
                <div>
                  <p className={`${label} mb-2`}>{F.cutStyle}</p>
                  <div className="st-cut-pills" role="radiogroup" aria-label={F.cutStyle}>
                    {PRINT_CUTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={fCut === c}
                        title={F.cuts[c].tip}
                        className="st-pill"
                        data-on={fCut === c}
                        onClick={() => setFCut(c)}
                      >
                        {F.cuts[c].label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[14px] text-[#8c7a68]">{cutMeta.hint}</p>
                </div>
              </div>
            )}

            {is3d && (
              <div className="st-span-2">
                <p className={`${label} mb-2`}>
                  {F.colour} · {F.inStock(onColors.length)}
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={F.colour}>
                  {onColors.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      role="radio"
                      aria-checked={color === c.v}
                      title={c.label}
                      className="st-swatch-chip"
                      data-on={color === c.v}
                      onClick={() => setFColor(c.v)}
                    >
                      <span className="st-diamond" style={{ background: c.hex }} />
                      <span
                        className="st-mono text-[11px] tracking-[0.08em]"
                        style={{ color: color === c.v ? "#2a211c" : "#8c7a68" }}
                      >
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* origin */}
            <div className="st-span-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={label}>{F.originQ}</p>
                <span className="st-mono cursor-help text-[9.5px] tracking-[0.1em] text-[#b5342c]" title={F.earnsTip}>
                  {F.earnsTag}
                </span>
              </div>
              <div className="st-origin-grid mt-2" role="radiogroup" aria-label={F.originQ}>
                {PRINT_ORIGINS.map((o) => {
                  const on = fOrigin === o;
                  const O = F.origins[o];
                  return (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className="st-origin-tile"
                      data-on={on}
                      data-err={tried && !fOrigin}
                      onClick={() => {
                        setFOrigin(o);
                        toast(O.toast);
                      }}
                    >
                      <span className="st-mono text-[9.5px] tracking-[0.08em]" style={{ color: on ? "#b5342c" : "#c9b9a1" }}>
                        {O.pts}
                      </span>
                      <span className="text-[17px] leading-[1.15] font-semibold text-[#2a211c]">{O.label}</span>
                      <span className="text-[14px] leading-[1.3] text-[#8c7a68]">{O.hint}</span>
                    </button>
                  );
                })}
              </div>
              {isSchool && (
                <div className="st-fadeup-4 mt-3 border border-[#e9dfd0] bg-[#fbf6ee] px-3.5 py-3" style={{ animationDuration: ".3s" }}>
                  <label className={label} htmlFor="st-teacher">
                    {F.teacherQ}
                  </label>
                  <select
                    id="st-teacher"
                    value={fTeacher}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFTeacher(v);
                      const tt = teacherById(v);
                      if (tt) toast(F.teacherToast(tt.name));
                    }}
                    className="mt-[7px] box-border w-full border px-3 py-2.5 text-[17px]"
                    style={{ borderColor: tried && isSchool && !teacherById(fTeacher) ? "#b5342c" : "#e9dfd0" }}
                  >
                    <option value="">{F.teacherPlaceholder}</option>
                    {TEACHERS.map((tt) => (
                      <option key={tt.v} value={tt.v}>
                        {tt.name} — {tt.subject}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[14px] text-[#8c7a68]">{F.teacherNote}</p>
                </div>
              )}
            </div>
          </div>

          <div
            className="mt-[18px] flex items-center gap-3 border-[1.5px] border-dashed px-4 py-3 transition-all duration-300"
            style={{
              borderColor: broke ? "#e7b6b1" : ready ? "#2f7d3f" : "#d9cdbb",
              background: broke ? "#fdecea" : ready ? "#eef6ef" : "#fbf6ee",
              color: broke ? "#b5342c" : ready ? "#2f7d3f" : "#8c7a68",
            }}
            aria-live="polite"
          >
            <span className="st-mono text-[14px]">×</span>
            <p className="text-[16.5px] leading-[1.4]">{summary}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3.5">
            <button
              type="submit"
              className="st-btn st-submit"
              aria-disabled={!canSubmit || sending}
              style={{
                background: canSubmit ? "#b5342c" : "#e9dfd0",
                color: canSubmit ? "#fbf6ee" : "#8c7a68",
                cursor: sending ? "progress" : canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "4px 4px 0 #2a211c" : "none",
              }}
            >
              {sending
                ? F.sending
                : broke
                  ? F.notEnough
                  : ready
                    ? isSchool
                      ? F.submitFree
                      : F.submitPaid
                    : F.finishSteps}
            </button>
            <p className="text-[15px] text-[#8c7a68]">{F.afterSubmit}</p>
          </div>
        </form>

        <aside className="st-fadeup-45" style={{ animationDelay: ".18s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[26px] font-semibold">{F.recent}</h2>
            <Link href="/requests" className="st-link-red">
              {F.seeAll}
            </Link>
          </div>
          {recent.length === 0 && (
            <p className="mt-3 border border-dashed border-[#d9cdbb] px-6 py-[30px] text-center text-[17px] leading-[1.5] text-[#8c7a68]">
              {emptyMsg}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2.5">
            {recent.map((r) => (
              <Link key={r.id} href="/requests" className="st-recent-row">
                <span className="st-mono shrink-0 bg-[#2a211c] px-[7px] py-[3px] text-[9px] tracking-[0.12em] text-[#fbf6ee]">
                  {F.kinds[r.kind].tag}
                </span>
                <span className="min-w-0 flex-1 truncate text-[18px] font-semibold">{r.file}</span>
                <span
                  className="st-mono shrink-0 text-[9.5px] tracking-[0.1em]"
                  style={{ color: r.status === 3 ? "#2f7d3f" : "#b5342c" }}
                >
                  {stageNames(t, r.kind)[r.status]}
                  {r.status === 3 ? " ✓" : ""}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
