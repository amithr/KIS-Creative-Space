export function DayTypeLegend() {
  return (
    <>
      <span className="hidden h-4 w-px bg-[#e3e0d8] md:inline-block" />
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-[4px]"
          style={{ border: "1.5px solid #c8102e" }}
        />{" "}
        Red day
      </span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-[4px]"
          style={{ border: "1.5px solid #141414" }}
        />{" "}
        Black day
      </span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-[4px]"
          style={{ border: "1.5px solid #2fbf2f" }}
        />{" "}
        Green day
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-[4px] bg-[#f2f0ea]" />{" "}
        No school
      </span>
    </>
  );
}
