"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelPrintRequest, listPrintRequests } from "@/app/actions/prints";
import { JobCard, TrackTitleMotif } from "@/components/students/JobCard";
import { useLocale } from "@/components/students/Locale";
import { RushnykCard } from "@/components/students/RushnykCard";
import { useStudentToast } from "@/components/students/StudentToast";
import { PRINT_COST, costOf, ledgerFor, rankFor } from "@/lib/ledger";
import { isValidEmail } from "@/lib/prints";
import { readStudentEmail, writeStudentEmail } from "@/lib/student-session";
import type { FilamentColor, PrintRequest } from "@/lib/types";

const label = "st-mono text-[10.5px] tracking-[0.14em] text-[#8c7a68]";
const RANK_KEY = "kis-last-rank:";

function readLastRank(email: string): number | null {
  try {
    const v = localStorage.getItem(RANK_KEY + email);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function writeLastRank(email: string, rank: number) {
  try {
    localStorage.setItem(RANK_KEY + email, String(rank));
  } catch {
    // ignore
  }
}

export function MyRequestsClient({ colors }: { colors: FilamentColor[] }) {
  const toast = useStudentToast();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [celebrate, setCelebrate] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async (value: string) => {
    const needle = value.trim().toLowerCase();
    const mine = ++seq.current;
    if (!isValidEmail(needle)) {
      setRequests([]);
      return;
    }
    try {
      const list = await listPrintRequests(needle);
      if (seq.current === mine) setRequests(list);
    } catch {
      if (seq.current === mine) setRequests([]);
    }
  }, []);

  // Session email → prefill (after hydration, so SSR markup matches); otherwise nudge.
  useEffect(() => {
    const sess = readStudentEmail();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEmail(sess);
      setHydrated(true);
    });
    const timer = sess ? null : window.setTimeout(() => toast(t.track.nudge), 200);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [toast, t.track.nudge]);

  useEffect(() => {
    if (!hydrated) return;
    const tm = window.setTimeout(() => void load(email), 250);
    return () => window.clearTimeout(tm);
  }, [email, hydrated, load]);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load(email);
    };
    const id = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [email, hydrated, load]);

  const sess = email.trim().toLowerCase();
  const emailOk = isValidEmail(sess);
  const ledger = ledgerFor(requests, sess);

  // Level-up moment: fires the first time the student sees a higher rank.
  const rank = rankFor(ledger.earned);
  useEffect(() => {
    if (!emailOk || requests.length === 0) return;
    const last = readLastRank(sess);
    if (last !== null && rank > last) {
      const tm = window.setTimeout(() => {
        setCelebrate((n) => n + 1);
        toast(t.track.levelUp(t.track.ranks[rank].name));
      }, 400);
      writeLastRank(sess, rank);
      return () => window.clearTimeout(tm);
    }
    if (last === null || rank !== last) writeLastRank(sess, rank);
  }, [emailOk, requests.length, rank, sess, toast, t.track]);

  function onEmail(v: string) {
    setEmail(v);
    writeStudentEmail(v);
  }

  async function cancel(r: PrintRequest) {
    const result = await cancelPrintRequest(r.id, sess);
    if (!result.ok) {
      toast(result.error.toUpperCase(), "err");
      void load(sess);
      return;
    }
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
    toast(t.track.cancelled(r.file.toUpperCase()) + (costOf(r) ? t.track.refunded : ""));
  }

  const walletColor =
    ledger.balance < PRINT_COST ? "#b5342c" : ledger.balance <= 10 ? "#9a6e06" : "#2f7d3f";
  const emptyMsg = emailOk ? t.form.emptyUnder(sess) : t.form.emptyNoEmail;

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">{t.track.eyebrow}</p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">{t.track.title}</h1>
        </div>
        <div className="st-sway">
          <TrackTitleMotif />
        </div>
      </section>

      <section className="st-grid-track mx-[5vw] mt-[18px] mb-14">
        <div
          className="st-fadeup-45 border border-[#e9dfd0] border-t-[4px] border-t-[#2a211c] bg-white px-6 py-[22px]"
          style={{ animationDelay: ".1s" }}
        >
          <label className={label} htmlFor="st-track-email">
            {t.track.email}
          </label>
          <input
            id="st-track-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder="olena.k@kis.edu"
            className="mt-[7px] box-border w-full border border-[#e9dfd0] px-[13px] py-[11px] text-[16px]"
          />
          <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#8c7a68]">{t.track.help}</p>
          <div className="mt-[18px] border-t border-[#eee5d8] pt-3.5">
            <p className={label}>{t.track.stagesTitle}</p>
            <dl className="mt-2.5 flex flex-col gap-2 text-[16px] leading-[1.4]">
              {t.track.glossary.map((g) => (
                <div key={g.term}>
                  <dt
                    className="st-mono inline text-[10px] tracking-[0.1em]"
                    style={{ color: g.ready ? "#2f7d3f" : "#b5342c" }}
                  >
                    {g.term}
                  </dt>
                  <dd className="inline">{g.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link href="/print" className="st-btn st-btn-red st-btn-small mt-[18px] !text-[#fbf6ee]">
            {t.track.newRequest}
          </Link>
        </div>

        <div className="st-fadeup-45" style={{ animationDelay: ".18s" }}>
          {emailOk && (
            <RushnykCard ledger={ledger} celebrate={celebrate} walletColor={walletColor} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[26px] font-semibold">{t.track.yourPrints}</h2>
            <span className="st-mono text-[10.5px] tracking-[0.12em] text-[#8c7a68]">
              {sess ? sess.toUpperCase() : t.track.typeAbove}
            </span>
          </div>
          {requests.length === 0 && (
            <p className="mt-3 border border-dashed border-[#d9cdbb] px-6 py-[30px] text-center text-[15px] leading-[1.5] text-[#8c7a68]">
              {emptyMsg}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3">
            {requests.map((r, i) => (
              <JobCard key={r.id} request={r} colors={colors} index={i} onCancel={cancel} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
