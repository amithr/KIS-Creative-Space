"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPrintRequest } from "@/app/actions/prints";
import { useLocale } from "@/components/students/Locale";
import { Motif } from "@/components/students/Motif";
import { useStudentToast } from "@/components/students/StudentToast";
import {
  MAX_PRINT_FILE_BYTES,
  PRINT_CUTS,
  PRINT_KINDS,
  formatMb,
  isValidName,
  kindMeta,
  normalizeName,
} from "@/lib/prints";
import { uploadPrintFile } from "@/lib/print-upload";
import { readStudentName, writeStudentName } from "@/lib/student-session";
import type { FilamentColor, PrintCut, PrintKind } from "@/lib/types";

type Props = { initialKind: PrintKind; colors: FilamentColor[] };

const RED = "#b5342c";
const INK = "#2a211c";
const OK = "#2f7d3f";
const FAINT = "#8c7a68";
const DIS = "#c9b9a1";
const HAIR = "#e9dfd0";

/**
 * Print request — one continuous low-text form (handoff Part A §2): small mono
 * section labels, big tiles, one short hint per section, explanations behind
 * tooltips. No step numbering, no progress indicator.
 */
export function PrintRequestClient({ initialKind, colors }: Props) {
  const router = useRouter();
  const toast = useStudentToast();
  const { t } = useLocale();
  const F = t.form;
  const [fName, setFName] = useState("");
  const [fKind, setFKind] = useState<PrintKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [fColor, setFColor] = useState("red");
  const [fQty, setFQty] = useState(1);
  const [fCut, setFCut] = useState<PrintCut>("contour");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const kind = kindMeta(fKind);
  const K = F.kinds[fKind];
  const is3d = fKind === "3d";
  const isVinyl = !is3d;

  // Only colours switched on are offered; fall back to the first if the pick was hidden.
  const onColors = colors.filter((c) => c.on);
  const color = onColors.some((c) => c.v === fColor) ? fColor : (onColors[0]?.v ?? "");

  useEffect(() => {
    const sess = readStudentName();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled && sess) setFName(sess);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [seenKind, setSeenKind] = useState(initialKind);
  if (seenKind !== initialKind) {
    setSeenKind(initialKind);
    if (fKind !== initialKind) {
      setFKind(initialKind);
      setFile(null);
    }
  }

  const who = normalizeName(fName);
  const nameOk = isValidName(who);

  // "Still needed: …" lists everything missing, in form order.
  const missing: string[] = [];
  if (!file) missing.push(K.missingFile);
  if (!nameOk) missing.push(F.missing.name);
  const ready = missing.length === 0;
  const canSubmit = ready;

  const colorMeta = onColors.find((c) => c.v === color);
  const line =
    ready && file
      ? is3d
        ? F.readyLine3d(file.name, (colorMeta?.label ?? color).toLowerCase())
        : F.readyLineVinyl(fQty, file.name)
      : F.stillNeeded(missing.join(", "));
  const lineColor = ready ? OK : FAINT;

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
    if (!ready || !file) {
      setTried(true);
      toast(F.almost(missing.join(", ").toUpperCase()), "err");
      return;
    }
    setSending(true);
    try {
      const filePath = await uploadPrintFile(file);
      const result = await createPrintRequest({
        kind: fKind,
        name: who,
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
      writeStudentName(who);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setFQty(1);
      setTried(false);
      toast(F.sent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast(/env|configured/i.test(msg) ? F.dbError : F.uploadFailed + msg.toUpperCase(), "err");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[12px] tracking-[0.2em] text-[#b5342c]">{F.eyebrow}</p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">{K.title}</h1>
        </div>
        <div className="st-sway">
          <Motif name="smallPrinter" cell={8} speed={12} />
        </div>
      </section>

      <section className="st-grid-request mx-[5vw] mt-[18px] mb-14">
        <form
          className="st-fadeup-45 st-form-card border border-[#e9dfd0] border-t-[4px] border-t-[#b5342c] bg-white"
          style={{ animationDelay: ".1s" }}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          {/* WHAT ARE YOU MAKING? */}
          <div className="st-section-row">
            <h2 className="st-section-label">{F.sections.what}</h2>
          </div>
          <div className="st-kind-grid mt-2.5" role="radiogroup" aria-label={F.sections.what}>
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
                  title={F.kinds[k.v].hint}
                  onClick={() => pickKind(k.v)}
                >
                  <Motif key={on ? "on" : "off"} name={k.motif} cell={4} color={on ? RED : DIS} speed={20} />
                  <span className="text-[21px] leading-[1.1] font-semibold text-[#2a211c]">{F.kinds[k.v].label}</span>
                </button>
              );
            })}
          </div>

          {/* YOUR FILE */}
          <div className="st-section-row mt-[22px]">
            <h2 className="st-section-label">{F.sections.file}</h2>
            <span className="st-mono ml-auto text-[10.5px] tracking-[0.1em] text-[#8c7a68]">{K.hint}</span>
          </div>
          <label
            className="st-drop"
            style={{
              borderColor: file ? OK : tried ? RED : DIS,
              background: file ? "#eef6ef" : "#fbf6ee",
            }}
          >
            <Motif key={file ? "ok" : "none"} name="file" cell={4} color={file ? OK : RED} speed={20} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[20px] font-semibold">{file ? file.name : K.choose}</span>
              <span className="mt-0.5 block text-[16.5px] text-[#8c7a68]">
                {file ? F.attachedShort(formatMb(file.size)) : K.fileHint}
              </span>
            </span>
            <span className="st-drop-btn">{file ? F.swap : F.browse}</span>
            <input ref={fileInput} type="file" accept={kind.accept} onChange={onFile} className="hidden" />
          </label>

          {isVinyl && (
            <div className="st-vinyl-grid mt-3.5">
              <div className="flex items-center gap-3">
                <span className="st-mini-label">{F.howMany}</span>
                <button
                  type="button"
                  className="st-step-btn"
                  aria-label="−"
                  disabled={fQty <= 1}
                  style={{ borderColor: fQty > 1 ? INK : HAIR }}
                  onClick={() => setFQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="st-mono min-w-[36px] text-center text-[22px]" aria-live="polite">
                  {fQty}
                </span>
                <button
                  type="button"
                  className="st-step-btn"
                  aria-label="+"
                  disabled={fQty >= 50}
                  style={{ borderColor: fQty < 50 ? INK : HAIR }}
                  onClick={() => setFQty((q) => Math.min(50, q + 1))}
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={F.cut}>
                <span className="st-mini-label">{F.cut}</span>
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
            </div>
          )}

          {is3d && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={F.colour}>
              <span className="st-mini-label">{F.colour}</span>
              {onColors.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  role="radio"
                  aria-checked={color === c.v}
                  aria-label={c.label}
                  title={c.label}
                  className="st-swatch-sq"
                  data-on={color === c.v}
                  onClick={() => setFColor(c.v)}
                >
                  <span className="st-diamond" style={{ background: c.hex }} />
                </button>
              ))}
              <span className="st-mono ml-1 text-[11px] tracking-[0.1em] text-[#2a211c]">{colorMeta?.label ?? ""}</span>
            </div>
          )}

          {/* YOUR NAME */}
          <div className="st-section-row mt-[22px]">
            <h2 className="st-section-label">{F.sections.you}</h2>
          </div>
          <div className="st-you-grid">
            <input
              id="st-name"
              value={fName}
              onChange={(e) => {
                setFName(e.target.value);
                writeStudentName(e.target.value);
              }}
              placeholder={F.namePlaceholder}
              aria-label={F.sections.you}
              aria-describedby="st-name-hint"
              autoComplete="name"
              className="st-input-lg"
              style={{ borderColor: tried && !nameOk ? RED : HAIR }}
            />
            <p id="st-name-hint" className="st-field-hint">
              {F.nameHint}
            </p>
          </div>

          {/* go */}
          <div className="st-form-footer">
            <button
              type="submit"
              className="st-submit"
              aria-disabled={!canSubmit || sending}
              style={{
                background: canSubmit ? RED : HAIR,
                color: canSubmit ? "#fbf6ee" : FAINT,
                cursor: sending ? "progress" : canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? `4px 4px 0 ${INK}` : "none",
              }}
            >
              {sending ? F.sending : F.sendIt}
            </button>
            <p className="st-form-line" style={{ color: lineColor }} aria-live="polite">
              {line}
            </p>
          </div>
        </form>

        <aside
          className="st-fadeup-45 border border-[#e9dfd0] bg-white px-[22px] py-5"
          style={{ animationDelay: ".18s" }}
        >
          <p className="st-mono text-[12px] tracking-[0.2em] text-[#b5342c]">{F.next.title}</p>
          <p className="mt-2.5 text-[17px] leading-[1.5] text-[#5e5047]" style={{ textWrap: "pretty" }}>
            {F.next.lede}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-[15.5px] leading-[1.45] text-[#5e5047]">
            {F.next.glossary.map((g) => (
              <li key={g.term}>
                <span
                  className="st-mono text-[11px] tracking-[0.12em]"
                  style={{ color: g.ready ? OK : INK }}
                >
                  {g.term}
                </span>
                {g.text}
              </li>
            ))}
          </ul>
          <Link href="/board" className="st-live-line">
            <span className="st-live-dot" aria-hidden />
            {F.next.board}
          </Link>
        </aside>
      </section>
    </>
  );
}
