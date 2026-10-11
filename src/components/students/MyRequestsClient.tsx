"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelPrintRequest, listPrintRequests } from "@/app/actions/prints";
import { JobCard, TrackTitleMotif } from "@/components/students/JobCard";
import { useStudentToast } from "@/components/students/StudentToast";
import { isValidEmail } from "@/lib/prints";
import { readStudentEmail, writeStudentEmail } from "@/lib/student-session";
import type { PrintRequest } from "@/lib/types";

const label = "st-mono text-[10.5px] tracking-[0.16em] text-[#8c7a68]";

export function MyRequestsClient() {
  const toast = useStudentToast();
  const [email, setEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const seq = useRef(0);

  const load = useCallback(async (value: string) => {
    const needle = value.trim();
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
    const t = sess
      ? null
      : window.setTimeout(
          () => toast("TYPE YOUR KIS EMAIL TO SEE YOUR PRINTS"),
          200,
        );
    return () => {
      cancelled = true;
      if (t) window.clearTimeout(t);
    };
  }, [toast]);

  // Live filter as you type (debounced), and keep fresh while the tab is open.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => void load(email), 250);
    return () => window.clearTimeout(t);
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

  const sess = email.trim();
  const emailOk = isValidEmail(sess);

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
    toast(`REQUEST CANCELLED · ${r.file.toUpperCase()}`);
  }

  const emptyMsg = emailOk
    ? `Nothing yet under ${sess} — your first request will appear here the moment you send it.`
    : "Enter your KIS email in the form and your prints will show up here.";

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">
            × MY REQUESTS ×
          </p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">
            Where are my prints?
          </h1>
        </div>
        <div className="st-sway">
          <TrackTitleMotif />
        </div>
      </section>

      <section className="st-grid-track mx-[5vw] mt-[18px] mb-14">
        <div className="st-fadeup-45 border border-[#e9dfd0] border-t-[4px] border-t-[#2a211c] bg-white px-6 py-[22px]" style={{ animationDelay: ".1s" }}>
          <label className={label} htmlFor="st-track-email">
            YOUR KIS EMAIL
          </label>
          <input
            id="st-track-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder="olena.k@kis.edu"
            className="mt-[7px] box-border w-full border border-[#e9dfd0] px-[13px] py-[11px] text-[18px]"
          />
          <p className="mt-1.5 text-[15px] leading-[1.45] text-[#8c7a68]">
            Type the email you used on your request — your list updates as you
            type. No password needed.
          </p>
          <div className="mt-[18px] border-t border-[#eee5d8] pt-3.5">
            <p className={label}>WHAT THE STAGES MEAN</p>
            <dl className="mt-2.5 flex flex-col gap-2 text-[16px] leading-[1.4]">
              <div>
                <dt className="st-mono inline text-[10px] tracking-[0.1em] text-[#b5342c]">
                  RECEIVED
                </dt>
                <dd className="inline"> — we&apos;ve got your file and it&apos;s in the queue.</dd>
              </div>
              <div>
                <dt className="st-mono inline text-[10px] tracking-[0.1em] text-[#b5342c]">
                  SLICING / PRINTING
                </dt>
                <dd className="inline"> — it&apos;s being prepared or is on the machine.</dd>
              </div>
              <div>
                <dt className="st-mono inline text-[10px] tracking-[0.1em] text-[#b5342c]">
                  CUTTING
                </dt>
                <dd className="inline"> — stickers and posters are going through the vinyl cutter.</dd>
              </div>
              <div>
                <dt className="st-mono inline text-[10px] tracking-[0.1em] text-[#2f7d3f]">
                  READY
                </dt>
                <dd className="inline"> — come and collect it from the Creativity Space.</dd>
              </div>
            </dl>
          </div>
          <Link
            href="/students/print"
            className="st-btn st-btn-red st-btn-small mt-[18px] !text-[#fbf6ee]"
          >
            + NEW REQUEST
          </Link>
        </div>

        <div className="st-fadeup-45" style={{ animationDelay: ".18s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[26px] font-semibold">Your prints</h2>
            <span className="st-mono text-[10.5px] tracking-[0.12em] text-[#8c7a68]">
              {sess ? sess.toUpperCase() : "TYPE YOUR EMAIL ABOVE"}
            </span>
          </div>
          {requests.length === 0 && (
            <p className="mt-3 border border-dashed border-[#d9cdbb] px-6 py-[30px] text-center text-[17px] leading-[1.5] text-[#8c7a68]">
              {emptyMsg}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3">
            {requests.map((r, i) => (
              <JobCard key={r.id} request={r} index={i} onCancel={cancel} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
