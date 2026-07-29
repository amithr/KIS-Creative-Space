import Link from "next/link";
import { AREAS } from "@/lib/constants";
import { SiteFooter } from "@/components/SiteFooter";

const MARQUEE =
  "LEGO PLAY ● ROBOTICS ● ART & DESIGN ● VR LAB ● 3D PRINTING ● ";

export function AboutContent() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="page-gutter pb-16 pt-[76px]">
        <p className="animate-fade-up mb-5 font-mono text-[11px] tracking-[0.2em] text-[#6d6759]">
          ПРО ПРОСТІР · ABOUT THE SPACE
        </p>
        <h1 className="animate-fade-up-delay-1 max-w-[720px] font-display text-[34px] font-normal leading-[1.04] tracking-[-0.02em] md:text-[62px]">
          A room where the whole school comes to{" "}
          <span className="font-semibold text-[#c8102e]">make things</span>.
        </h1>
        <p className="animate-fade-up-delay-2 mt-[26px] max-w-[520px] text-[17px] leading-[1.7] text-[#3f3b33]">
          The KIS Creativity Space is open to every student, teacher and class.
          Come with an idea — or come find one. Build, code, paint, print, and
          explore across five hands-on areas.
        </p>
      </section>

      <div className="overflow-hidden border-y border-[#141414] py-[13px]">
        <div className="animate-marquee flex w-max gap-11 whitespace-nowrap font-mono text-[12px] tracking-[0.18em]">
          <span>
            {MARQUEE.split("●").map((part, i, arr) => (
              <span key={`a-${i}`}>
                {part}
                {i < arr.length - 1 && (
                  <span className="text-[#c8102e]"> ● </span>
                )}
              </span>
            ))}
          </span>
          <span aria-hidden>
            {MARQUEE.split("●").map((part, i, arr) => (
              <span key={`b-${i}`}>
                {part}
                {i < arr.length - 1 && (
                  <span className="text-[#c8102e]"> ● </span>
                )}
              </span>
            ))}
          </span>
        </div>
      </div>

      <section className="page-gutter py-10">
        <div className="flex h-[220px] items-end border border-[#e3e0d8] bg-[#eeece5] p-5 md:h-[380px]">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#6d6759]">
            THE SPACE · ROOM 214
          </p>
        </div>
      </section>

      <section className="page-gutter">
        {AREAS.map((area, i) => {
          const reverse = i % 2 === 1;
          return (
            <div
              key={area.num}
              className={`flex flex-col gap-8 border-t border-[#eeece5] py-9 md:items-center md:gap-12 ${
                reverse ? "md:flex-row-reverse" : "md:flex-row"
              }`}
            >
              <div className="flex-1">
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-[#c8102e]">
                    {area.num}
                  </span>
                  <h2 className="text-[28px] font-medium md:text-[30px]">
                    {area.name}
                  </h2>
                </div>
                <p className="max-w-[460px] text-[15.5px] leading-[1.75] text-[#3f3b33]">
                  {area.body}
                </p>
                <p className="mt-4 font-mono text-[10.5px] tracking-[0.14em] text-[#6d6759]">
                  {area.meta}
                </p>
              </div>
              <div className="h-[200px] flex-1 border border-[#e3e0d8] bg-[#eeece5] transition-transform duration-[350ms] ease-out hover:-translate-y-1.5 md:h-[260px]" />
            </div>
          );
        })}
      </section>

      <section className="page-gutter relative my-12 overflow-hidden bg-[#141414] px-8 py-11 text-[#f5f3ee] md:px-11">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full bg-[#c8102e]" />
        <p className="relative font-mono text-[11px] tracking-[0.2em] text-[#c8102e]">
          FOR TEACHERS
        </p>
        <h2 className="relative mt-3 max-w-xl text-[28px] font-normal md:text-[34px]">
          Bring your class. Book a period. Borrow what you need.
        </h2>
        <p className="relative mt-4 max-w-lg text-[15px] leading-relaxed text-[#c9c3b6]">
          Schedule the Creativity Space for a lesson, or reserve equipment for a
          project. Teachers manage inventory from the admin panel.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link
            href="/schedule"
            className="bg-[#c8102e] px-5 py-3 text-[13px] text-white transition-colors hover:bg-[#a50d26] hover:text-white"
          >
            Schedule the space →
          </Link>
          <Link
            href="/"
            className="border border-[#f5f3ee] px-5 py-3 text-[13px] text-[#f5f3ee] hover:text-white"
          >
            See resources →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
