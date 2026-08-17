"use client";

import {
  BOOKING_WEEKS,
  formatWeekRange,
  weekPagerCaption,
} from "@/lib/school-calendar";

type WeekPagerProps = {
  weekIndex: number;
  days: Date[];
  onChange: (weekIndex: number) => void;
};

export function WeekPager({ weekIndex, days, onChange }: WeekPagerProps) {
  const canPrev = weekIndex > 0;
  const canNext = weekIndex < BOOKING_WEEKS - 1;

  return (
    <div className="flex items-center gap-3.5 pb-1">
      <PagerArrow
        label="←"
        disabled={!canPrev}
        onClick={() => {
          if (canPrev) onChange(weekIndex - 1);
        }}
      />
      <div className="min-w-[150px] text-center">
        <p className="font-mono text-[12px] tracking-[0.14em]">
          {formatWeekRange(days)}
        </p>
        <p className="mt-[3px] font-mono text-[10px] tracking-[0.14em] text-[#98917f]">
          {weekPagerCaption(weekIndex)}
        </p>
      </div>
      <PagerArrow
        label="→"
        disabled={!canNext}
        onClick={() => {
          if (canNext) onChange(weekIndex + 1);
        }}
      />
    </div>
  );
}

function PagerArrow({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label === "←" ? "Previous week" : "Next week"}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[14px] transition-colors disabled:cursor-default"
      style={{
        border: disabled ? "1px solid #e3e0d8" : "1px solid #141414",
        color: disabled ? "#d5d1c8" : "#141414",
      }}
    >
      {label}
    </button>
  );
}
