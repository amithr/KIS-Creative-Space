"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createArea, deleteArea } from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import { effectiveAreaNames, type Area } from "@/lib/areas";
import type { Equipment } from "@/lib/types";

type AreasPanelProps = {
  areas: Area[];
  equipment: Equipment[];
  onAreaAdded: (name: string) => void;
  onAreaRemoved: (name: string, remaining: string[]) => void;
};

export function AreasPanel({
  areas,
  equipment,
  onAreaAdded,
  onAreaRemoved,
}: AreasPanelProps) {
  const askConfirm = useConfirm();
  const { dbWrite } = useAdminWrite();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [popName, setPopName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of equipment) {
      const key = e.area.trim().toLowerCase();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [equipment]);

  const chips = useMemo(() => {
    const names = effectiveAreaNames(
      areas.map((a) => a.name),
      equipment.map((e) => e.area),
    );
    return names.map((name) => {
      const row = areas.find(
        (a) => a.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      const count = counts.get(name.trim().toLowerCase()) ?? 0;
      return {
        id: row?.id ?? null,
        name,
        count,
        canRemove: !!row?.id && count === 0 && areas.length > 1,
      };
    });
  }, [areas, equipment, counts]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const trimmed = draft.trim();
  const isDup =
    trimmed.length > 0 &&
    chips.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  function cancelAdd() {
    setAdding(false);
    setDraft("");
  }

  function submitAdd() {
    if (!trimmed || isDup) return;
    void dbWrite("ADD AREA", async () => {
      const result = await createArea(trimmed);
      if (!result.ok) throw new Error(result.error);
      const name = result.name ?? trimmed;
      setPopName(name);
      window.setTimeout(() => setPopName(null), 700);
      cancelAdd();
      onAreaAdded(name);
    });
  }

  function removeArea(chip: { id: string | null; name: string }) {
    if (!chip.id) return;
    askConfirm({
      title: "Remove this area?",
      body: `“${chip.name}” will disappear from every area list, including the public Resources page.`,
      action: "Remove area",
      fn: async () => {
        await dbWrite("REMOVE AREA", async () => {
          const result = await deleteArea(chip.id!);
          if (!result.ok) throw new Error(result.error);
          const remaining = chips
            .filter((c) => c.name.toLowerCase() !== chip.name.toLowerCase())
            .map((c) => c.name);
          onAreaRemoved(chip.name, remaining);
        });
      },
    });
  }

  return (
    <div className="no-print page-gutter mb-11">
      <div className="mb-1 flex flex-wrap items-baseline gap-3">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Areas</h2>
        <span className="font-mono text-[11px] tracking-[0.14em] text-[#857e6e]">
          {chips.length} AREAS
        </span>
      </div>
      <p className="mb-3.5 text-[13.5px] text-[#6d6759]">
        Areas group items here and on the public Resources page. Add a new one,
        then assign items to it below — an area can only be removed while it has
        no items.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        {chips.map((chip) => (
          <div
            key={chip.name}
            title={
              chip.count > 0
                ? `${chip.count} item${chip.count === 1 ? "" : "s"} — move or delete them to remove this area`
                : undefined
            }
            className={`flex items-center gap-2.5 rounded-full border border-[#e3e0d8] bg-white py-2 pr-3 pl-4 text-[13.5px] ${
              popName === chip.name ? "kis-pop" : ""
            }`}
          >
            <span className="font-semibold text-[#141414]">{chip.name}</span>
            <span
              className="font-mono text-[10.5px]"
              style={{ color: chip.count === 0 ? "#b6b0a3" : "#857e6e" }}
            >
              {chip.count === 0 ? "EMPTY" : chip.count}
            </span>
            {chip.canRemove && (
              <button
                type="button"
                title="Remove this area"
                onClick={() => removeArea(chip)}
                className="px-0.5 text-[15px] leading-none text-[#857e6e] transition-colors hover:text-[#c8102e]"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-[#b6b0a3] px-4 py-2 text-[13.5px] font-semibold text-[#6d6759] transition-colors hover:border-[#141414] hover:text-[#141414]"
          >
            + New area
          </button>
        ) : (
          <div className="kis-pop flex items-center gap-2 rounded-full border border-[#141414] py-1 pr-1 pl-4">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAdd();
                }
                if (e.key === "Escape") cancelAdd();
              }}
              placeholder="e.g. Textiles"
              className="w-[150px] border-0 bg-transparent py-1 text-[13.5px] outline-none"
            />
            <button
              type="button"
              disabled={!trimmed || isDup}
              onClick={submitAdd}
              className="rounded-full bg-[#c8102e] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#a50d26] disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              title="Cancel"
              onClick={cancelAdd}
              className="flex h-[26px] w-[26px] items-center justify-center text-[16px] text-[#857e6e] transition-colors hover:text-[#141414]"
            >
              ×
            </button>
          </div>
        )}

        {isDup && (
          <span className="text-[13px] text-[#c8102e]">
            “{trimmed}” already exists.
          </span>
        )}
      </div>
    </div>
  );
}
