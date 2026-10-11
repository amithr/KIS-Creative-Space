import Link from "next/link";
import { DiamondRow, Motif, type MotifName } from "@/components/students/Motif";

const STEPS: {
  n: string;
  title: string;
  body: string;
  motif: MotifName;
  delay: number;
  speed: number;
}[] = [
  {
    n: "01",
    title: "Design it",
    body: "A 3D model (.STL/.3MF), or poster and sticker artwork (PDF, PNG, SVG).",
    motif: "cube",
    delay: 0,
    speed: 25,
  },
  {
    n: "02",
    title: "Send the file",
    body: "Fill in the short request form. Pick a colour, a size — or how many stickers.",
    motif: "file",
    delay: 300,
    speed: 25,
  },
  {
    n: "03",
    title: "We make it",
    body: "3D prints go slicing → printing; vinyl goes printing → cutting. Follow along on your list.",
    motif: "smallPrinter",
    delay: 600,
    speed: 20,
  },
  {
    n: "04",
    title: "Collect it",
    body: "My requests shows READY when it's done. Pick up at the Creativity Space.",
    motif: "check",
    delay: 900,
    speed: 40,
  },
];

export function StudentLanding() {
  return (
    <>
      <section className="st-grid-hero st-gutter pt-14 pb-9">
        <div className="st-fadeup">
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">
            × MAKE · BUILD · PRINT ×
          </p>
          <h1
            className="mt-3.5 text-[clamp(42px,6vw,76px)] leading-[1.02] font-semibold tracking-[-0.01em]"
            style={{ textWrap: "balance" }}
          >
            Stitch your idea into something real.
          </h1>
          <p
            className="mt-[18px] max-w-[520px] text-[20px] leading-[1.5] text-[#5e5047]"
            style={{ textWrap: "pretty" }}
          >
            The Creativity Space prints student work every week — 3D models,
            posters, and vinyl stickers cut to shape. Send us your file and
            we&apos;ll tell you when it&apos;s ready to collect.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/students/print?kind=3d" className="st-btn st-btn-red !text-[#fbf6ee]">
              REQUEST A 3D PRINT →
            </Link>
            <Link
              href="/students/print?kind=sticker"
              className="st-btn st-btn-ink !text-[#fbf6ee]"
            >
              POSTERS &amp; STICKERS →
            </Link>
            <Link href="/students/requests" className="st-btn st-btn-outline">
              CHECK MY PRINTS
            </Link>
          </div>
        </div>
        <div className="st-hero-motifs">
          <div className="st-sway">
            <Motif name="tree" className="st-hero-tree" speed={22} />
          </div>
          <div>
            <Motif name="printer" className="st-hero-printer" delay={400} speed={10} />
          </div>
          <div className="st-sway-7">
            <Motif name="bird" className="st-hero-bird" delay={900} speed={20} />
          </div>
        </div>
      </section>

      <DiamondRow />

      <section className="st-gutter pt-9 pb-5">
        <p className="st-mono text-[11px] tracking-[0.2em] text-[#8c7a68]">
          HOW IT WORKS · ЯК ЦЕ ПРАЦЮЄ
        </p>
        <div className="st-grid-steps mt-[18px]">
          {STEPS.map((st, i) => (
            <article
              key={st.n}
              className="st-step-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="st-mono text-[11px] tracking-[0.14em] text-[#b5342c]">
                  {st.n}
                </span>
                <Motif name={st.motif} cell={5} delay={st.delay} speed={st.speed} />
              </div>
              <h2 className="mt-2.5 text-[25px] leading-[1.15] font-semibold">
                {st.title}
              </h2>
              <p
                className="mt-2 text-[16.5px] leading-[1.5] text-[#5e5047]"
                style={{ textWrap: "pretty" }}
              >
                {st.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="st-grid-rules mx-[5vw] mt-6 mb-14 bg-[#2a211c] px-[30px] py-7 text-[#fbf6ee]">
        <div>
          <p className="st-mono text-[11px] tracking-[0.2em] text-[#e2b1ab]">
            BEFORE YOU SEND
          </p>
          <h2 className="mt-2 text-[30px] leading-[1.15] font-semibold">
            Three small things that make prints succeed
          </h2>
        </div>
        <ul className="flex flex-col gap-2.5 text-[17.5px] leading-[1.45]">
          <li className="flex gap-3">
            <span className="st-mono text-[#e2b1ab]">×</span>
            3D models: export .STL or .3MF, under 18 cm on every side.
          </li>
          <li className="flex gap-3">
            <span className="st-mono text-[#e2b1ab]">×</span>
            Posters &amp; stickers: a PDF, PNG or SVG at full size — SVG with a
            clean outline cuts best.
          </li>
          <li className="flex gap-3">
            <span className="st-mono text-[#e2b1ab]">×</span>
            Give us at least a week — big prints take a whole night.
          </li>
        </ul>
      </section>
    </>
  );
}
