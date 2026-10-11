"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPrintRequest, listPrintRequests } from "@/app/actions/prints";
import { Motif } from "@/components/students/Motif";
import { useStudentToast } from "@/components/students/StudentToast";
import {
  MAX_PRINT_FILE_BYTES,
  PRINT_COLORS,
  PRINT_CUTS,
  PRINT_GRADES,
  PRINT_KINDS,
  daysUntil,
  formatDueShort,
  formatMb,
  isValidEmail,
  kindMeta,
  sizesFor,
  stageLabel,
} from "@/lib/prints";
import { uploadPrintFile } from "@/lib/print-upload";
import {
  readStudentEmail,
  readStudentIdentity,
  writeStudentEmail,
  writeStudentIdentity,
} from "@/lib/student-session";
import type { PrintColor, PrintCut, PrintKind, PrintRequest } from "@/lib/types";

type Props = { initialKind: PrintKind };

const label = "st-mono text-[10.5px] tracking-[0.16em] text-[#8c7a68]";
const input =
  "mt-[7px] box-border w-full border px-3 py-2.5 text-[18px]";

export function PrintRequestClient({ initialKind }: Props) {
  const router = useRouter();
  const toast = useStudentToast();
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fGrade, setFGrade] = useState("");
  const [fKind, setFKind] = useState<PrintKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [fColor, setFColor] = useState<PrintColor>("red");
  const [fSize, setFSize] = useState(kindMeta(initialKind).defaultSize);
  const [fQty, setFQty] = useState(1);
  const [fCut, setFCut] = useState<PrintCut>("contour");
  const [fDue, setFDue] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<PrintRequest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const kind = kindMeta(fKind);
  const is3d = fKind === "3d";
  const isVinyl = !is3d;

  // Identity remembered for the session (name, email, grade) — applied after
  // hydration so the server-rendered form matches.
  useEffect(() => {
    const id = readStudentIdentity();
    const sess = readStudentEmail();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (id.name) setFName(id.name);
      if (id.grade) setFGrade(id.grade);
      if (sess || id.email) setFEmail(sess || id.email || "");
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStudentIdentity({ name: fName, email: fEmail, grade: fGrade });
  }, [fName, fEmail, fGrade, hydrated]);

  // Landing links can switch kind after mount (?kind=sticker).
  const [seenKind, setSeenKind] = useState(initialKind);
  if (seenKind !== initialKind) {
    setSeenKind(initialKind);
    if (fKind !== initialKind) {
      setFKind(initialKind);
      setFSize(kindMeta(initialKind).defaultSize);
      setFile(null);
    }
  }

  const loadRecent = useCallback(async (email: string) => {
    const mine = ++seq.current;
    if (!isValidEmail(email)) {
      setRecent([]);
      return;
    }
    try {
      const list = await listPrintRequests(email);
      if (seq.current === mine) setRecent(list.slice(0, 3));
    } catch {
      if (seq.current === mine) setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => void loadRecent(fEmail), 300);
    return () => window.clearTimeout(t);
  }, [fEmail, hydrated, loadRecent]);

  const emailOk = isValidEmail(fEmail);
  const missing: string[] = [];
  if (!fName.trim()) missing.push("your name");
  if (!emailOk) missing.push("your email");
  if (!fGrade) missing.push("your grade");
  if (!file) missing.push(is3d ? "a 3D file" : "your artwork");
  const ready = missing.length === 0;

  const dueDays = fDue ? daysUntil(fDue) : null;
  const dueHint =
    dueDays === null
      ? "Optional — leave blank if there's no rush."
      : dueDays < 7
        ? "That's soon — we'll try, but a week is safer."
        : "Plenty of time ✓";
  const dueColor =
    dueDays === null ? "#8c7a68" : dueDays < 7 ? "#b5342c" : "#2f7d3f";

  const cutMeta = PRINT_CUTS.find((c) => c.v === fCut) ?? PRINT_CUTS[0];
  const summary = ready && file
    ? "Ready to send ✓ · " +
      (is3d
        ? `${file.name} in ${fColor}, size ${fSize}`
        : `${fQty} × ${file.name} · ${kind.label.toLowerCase()} · ${fSize} · ${cutMeta.label.toLowerCase()}`) +
      (fDue ? `, by ${formatDueShort(fDue)}` : "")
    : `Still needed — add ${missing.join(", ")}.`;

  function pickKind(v: PrintKind) {
    if (v === fKind) return;
    const meta = kindMeta(v);
    setFKind(v);
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setFSize(meta.defaultSize);
    toast(meta.pickToast);
    router.replace(`/print?kind=${v}`, { scroll: false });
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!kind.re.test(f.name)) {
      toast(kind.wrongFileToast, "err");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_PRINT_FILE_BYTES) {
      toast("THAT FILE IS OVER 50 MB — EXPORT A SMALLER ONE", "err");
      e.target.value = "";
      return;
    }
    setFile(f);
    toast(
      `FILE ATTACHED ✓ · ${f.name.toUpperCase()}` +
        (fKind === "sticker" && !/\.svg$/i.test(f.name)
          ? " · TIP: SVG CUTS CLEANER"
          : ""),
    );
  }

  async function submit() {
    if (sending) return;
    if (!ready || !file) {
      setTried(true);
      toast(`ALMOST — ADD ${missing.join(", ").toUpperCase()}`, "err");
      return;
    }
    setSending(true);
    const email = fEmail.trim().toLowerCase();
    const snapshot = { file, qty: fQty };
    try {
      const filePath = await uploadPrintFile(file);
      const result = await createPrintRequest({
        kind: fKind,
        name: fName.trim(),
        email,
        grade: fGrade,
        fileName: file.name,
        filePath,
        color: is3d ? fColor : "vinyl",
        size: fSize,
        qty: is3d ? 1 : fQty,
        cut: is3d ? null : fCut,
        due: fDue || null,
        notes: fNotes.trim(),
      });
      if (!result.ok) {
        toast(result.error.toUpperCase(), "err");
        return;
      }
      writeStudentEmail(email);
      if (result.request) {
        setRecent((prev) => [result.request!, ...prev].slice(0, 3));
      }
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setFNotes("");
      setFDue("");
      setFQty(1);
      setTried(false);
      toast(
        `REQUEST SENT ✓ · ${is3d ? "" : `${snapshot.qty} × `}${snapshot.file.name.toUpperCase()} · TRACK IT UNDER MY REQUESTS`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast(
        /env|configured/i.test(msg)
          ? "DATABASE NOT CONFIGURED — ASK THE CREATIVITY SPACE"
          : `UPLOAD FAILED — ${msg.toUpperCase()}`,
        "err",
      );
    } finally {
      setSending(false);
    }
  }

  const emptyMsg = emailOk
    ? `Nothing yet under ${fEmail.trim()} — your first request will appear here the moment you send it.`
    : "Enter your KIS email in the form and your prints will show up here.";

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">
            × PRINT REQUEST ×
          </p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">
            {kind.title}
          </h1>
        </div>
        <div className="st-sway">
          <Motif name="smallPrinter" cell={8} speed={12} />
        </div>
      </section>

      <section className="st-grid-request mx-[5vw] mt-[18px] mb-14">
        {/* form */}
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
                YOUR NAME
              </label>
              <input
                id="st-name"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="Olena K."
                autoComplete="name"
                className={input}
                style={{ borderColor: tried && !fName.trim() ? "#b5342c" : "#e9dfd0" }}
              />
            </div>
            <div>
              <label className={label} htmlFor="st-email">
                KIS EMAIL
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
              <p className="mt-1 text-[14px] text-[#8c7a68]">
                It&apos;s how we match your prints to you.
              </p>
            </div>

            <div className="st-span-2">
              <p className={`${label} mb-2`}>GRADE</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Grade">
                {PRINT_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={fGrade === g}
                    className="st-pill st-pill-grade"
                    data-on={fGrade === g}
                    data-err={tried && !fGrade}
                    onClick={() => setFGrade(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="st-span-2">
              <p className={`${label} mb-2`}>WHAT ARE WE MAKING?</p>
              <div className="st-kind-grid" role="radiogroup" aria-label="What are we making">
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
                      <Motif
                        key={on ? "on" : "off"}
                        name={k.motif}
                        cell={4}
                        color={on ? "#b5342c" : "#c9b9a1"}
                        speed={20}
                      />
                      <span>
                        <span className="st-kind-label block text-[18px] leading-[1.1] font-semibold text-[#2a211c]">
                          {k.label}
                        </span>
                        <span
                          className="st-mono st-kind-hint mt-[3px] block text-[9.5px] tracking-[0.08em]"
                          style={{ color: on ? "#b5342c" : "#8c7a68" }}
                        >
                          {k.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="st-span-2">
              <p className={label}>{kind.fileLabel}</p>
              <label
                className="mt-2 flex cursor-pointer items-center gap-4 border-[1.5px] border-dashed px-[18px] py-4 transition-all duration-200"
                style={{
                  borderColor: file ? "#2f7d3f" : tried ? "#b5342c" : "#c9b9a1",
                  background: file ? "#eef6ef" : "#fbf6ee",
                }}
              >
                <Motif
                  key={file ? "ok" : "none"}
                  name="file"
                  cell={4}
                  color={file ? "#2f7d3f" : "#b5342c"}
                  speed={20}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-semibold">
                    {file
                      ? file.name
                      : is3d
                        ? "Choose your 3D file"
                        : "Choose your artwork"}
                  </span>
                  <span className="block text-[14.5px] text-[#8c7a68]">
                    {file ? `${formatMb(file.size)} · tap to swap it` : kind.fileSub}
                  </span>
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={kind.accept}
                  onChange={onFile}
                  className="hidden"
                />
              </label>
            </div>

            {isVinyl && (
              <div className="st-span-2 st-vinyl-grid">
                <div>
                  <p className={label}>HOW MANY?</p>
                  <div className="mt-[7px] flex items-center gap-3">
                    <button
                      type="button"
                      className="st-step-btn"
                      aria-label="Fewer"
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
                      aria-label="More"
                      disabled={fQty >= 50}
                      style={{ borderColor: fQty < 50 ? "#2a211c" : "#e9dfd0" }}
                      onClick={() => setFQty((q) => Math.min(50, q + 1))}
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-1 text-[14px] text-[#8c7a68]">
                    {fQty >= 20
                      ? "Big batch — allow an extra day."
                      : fKind === "poster"
                        ? "Copies of the poster."
                        : "Identical stickers."}
                  </p>
                </div>
                <div>
                  <p className={`${label} mb-2`}>CUT STYLE</p>
                  <div className="st-cut-pills" role="radiogroup" aria-label="Cut style">
                    {PRINT_CUTS.map((c) => (
                      <button
                        key={c.v}
                        type="button"
                        role="radio"
                        aria-checked={fCut === c.v}
                        title={c.tip}
                        className="st-pill"
                        data-on={fCut === c.v}
                        onClick={() => setFCut(c.v)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[14px] text-[#8c7a68]">{cutMeta.hint}</p>
                </div>
              </div>
            )}

            {is3d && (
              <div className="st-span-2">
                <p className={`${label} mb-2`}>FILAMENT COLOUR</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filament colour">
                  {PRINT_COLORS.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      role="radio"
                      aria-checked={fColor === c.v}
                      title={c.label}
                      className="st-swatch-chip"
                      data-on={fColor === c.v}
                      onClick={() => setFColor(c.v)}
                    >
                      <span className="st-diamond" style={{ background: c.swatch }} />
                      <span
                        className="st-mono text-[11px] tracking-[0.08em]"
                        style={{ color: fColor === c.v ? "#2a211c" : "#8c7a68" }}
                      >
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={`${label} mb-2`}>SIZE</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
                {sizesFor(fKind).map((z) => (
                  <button
                    key={z.v}
                    type="button"
                    role="radio"
                    aria-checked={fSize === z.v}
                    className="st-pill"
                    data-on={fSize === z.v}
                    onClick={() => setFSize(z.v)}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label} htmlFor="st-due">
                NEEDED BY
              </label>
              <input
                id="st-due"
                type="date"
                value={fDue}
                onChange={(e) => setFDue(e.target.value)}
                className="mt-[7px] box-border w-full border border-[#e9dfd0] px-3 py-[9px] text-[17px]"
              />
              <p className="mt-1 text-[14px]" style={{ color: dueColor }}>
                {dueHint}
              </p>
            </div>

            <div className="st-span-2">
              <label className={label} htmlFor="st-notes">
                WHAT IS IT FOR? · OPTIONAL
              </label>
              <textarea
                id="st-notes"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder={kind.notes}
                maxLength={500}
                className="mt-[7px] box-border min-h-[64px] w-full resize-y border border-[#e9dfd0] px-3 py-2.5 text-[17px] leading-[1.5]"
              />
            </div>
          </div>

          {/* live summary */}
          <div
            className="mt-[18px] flex items-center gap-3 border-[1.5px] border-dashed px-4 py-3 transition-all duration-300"
            style={{
              borderColor: ready ? "#2f7d3f" : "#d9cdbb",
              background: ready ? "#eef6ef" : "#fbf6ee",
              color: ready ? "#2f7d3f" : "#8c7a68",
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
              aria-disabled={!ready || sending}
              style={{
                background: ready ? "#b5342c" : "#e9dfd0",
                color: ready ? "#fbf6ee" : "#8c7a68",
                cursor: sending ? "progress" : ready ? "pointer" : "not-allowed",
                boxShadow: ready ? "4px 4px 0 #2a211c" : "none",
              }}
            >
              {sending
                ? "SENDING…"
                : ready
                  ? "SEND MY PRINT REQUEST →"
                  : "FINISH THE STEPS ABOVE"}
            </button>
            <p className="text-[15px] text-[#8c7a68]">
              You&apos;ll see it appear in your list straight away.
            </p>
          </div>
        </form>

        {/* recent, compact */}
        <aside className="st-fadeup-45" style={{ animationDelay: ".18s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[26px] font-semibold">Your recent requests</h2>
            <Link href="/requests" className="st-link-red">
              SEE ALL →
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
                  {kindMeta(r.kind).tag}
                </span>
                <span className="min-w-0 flex-1 truncate text-[18px] font-semibold">
                  {r.file}
                </span>
                <span
                  className="st-mono shrink-0 text-[9.5px] tracking-[0.1em]"
                  style={{ color: r.status === 3 ? "#2f7d3f" : "#b5342c" }}
                >
                  {stageLabel(r)}
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
