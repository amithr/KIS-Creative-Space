"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  adminCheckInByCode,
  adminCheckOutByCode,
  createEquipment,
  deleteEquipment,
  resetToSampleData,
  resolveAdminItemCode,
  updateEquipment,
  type AdminCodeLookup,
} from "@/app/admin/actions";
import { AREA_OPTIONS } from "@/lib/constants";
import { isNewItem } from "@/lib/inventory";
import { dueBackLabel } from "@/lib/reservation-availability";
import type { EquipmentWithUnits, Reservation } from "@/lib/types";
import { SiteFooter } from "@/components/SiteFooter";
import { PrintQrLabelsPanel } from "@/components/admin/PrintQrLabelsPanel";

type AdminDashboardProps = {
  equipment: EquipmentWithUnits[];
  reservations: Reservation[];
};

export function AdminDashboard({
  equipment,
  reservations,
}: AdminDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    note: "",
    area: "LEGO Play",
    avail: 1,
    total: 1,
  });
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<AdminCodeLookup | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkoutBy, setCheckoutBy] = useState("");

  const openLoans = useMemo(() => {
    const byId = new Map(equipment.map((e) => [e.id, e]));
    return reservations
      .filter((r) => r.status === "out")
      .map((r) => ({
        reservation: r,
        item: byId.get(r.equipment_id),
      }))
      .filter((x) => x.item);
  }, [equipment, reservations]);

  const outByEquipment = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reservations) {
      if (r.status !== "out") continue;
      map.set(r.equipment_id, (map.get(r.equipment_id) ?? 0) + (r.out_qty || r.qty));
    }
    return map;
  }, [reservations]);

  const refresh = (msg: string) => {
    setMessage(msg);
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="no-print page-gutter flex flex-wrap items-end justify-between gap-4 pb-[26px] pt-11">
        <div>
          <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-[#6d6759]">
            ІНВЕНТАР · INVENTORY
          </p>
          <h1 className="font-display text-[34px] font-normal tracking-[-0.02em] md:text-[38px]">
            Manage inventory
          </h1>
        </div>
        <p className="pb-1.5 font-mono text-[11px] text-[#6d6759]">
          {equipment.length} ITEMS
        </p>
      </section>

      {message && (
        <div className="no-print page-gutter mb-4">
          <p className="border border-[#e3e0d8] px-4 py-3 text-sm">{message}</p>
        </div>
      )}

      {openLoans.length > 0 && (
        <div className="no-print page-gutter mb-6">
          <div className="border border-[#e0a010] bg-[#fdf8ec] px-5 py-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#9a6e06]">
                CURRENTLY CHECKED OUT
              </p>
              <p className="font-mono text-[10px] text-[#b39230]">
                UPDATED FROM APP
              </p>
            </div>
            <div className="space-y-2.5">
              {openLoans.map(({ reservation: r, item }) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 text-[13px]"
                >
                  <span className="rounded-full border border-[#e0a010] px-2 py-0.5 font-mono text-[9px] tracking-wide text-[#9a6e06]">
                    {r.out_qty || r.qty} OUT
                  </span>
                  <span className="text-[#3f3b33]">
                    <span className="font-semibold">{item!.name}</span>
                    {" — "}
                    {r.name} · due back {dueBackLabel(r)}
                  </span>
                  {r.out_at && (
                    <span className="ml-auto font-mono text-[10px] text-[#b39230]">
                      {new Date(r.out_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="no-print page-gutter mb-7 border border-[#141414] p-[18px_20px]">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] tracking-[0.16em] text-[#6d6759]">
            CHECK OUT / CHECK IN · ITEM CODE
          </span>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setLookup(null);
            }}
            onBlur={() => {
              if (!code.trim()) return;
              startTransition(async () => {
                const result = await resolveAdminItemCode(code);
                setLookup(result);
                if (result.ok && result.mode === "checkout") {
                  setCheckoutQty(1);
                }
              });
            }}
            placeholder="Code on the QR label, e.g. KIS-7F3K9Q"
            className="w-full border border-[#e3e0d8] bg-white px-3 py-[9px] font-mono text-[13.5px] uppercase outline-none focus:border-[#141414]"
          />
        </label>

        {lookup && !lookup.ok && (
          <p className="mt-3 text-[13px] text-[#c8102e]">{lookup.error}</p>
        )}

        {lookup?.ok && lookup.mode === "checkout" && (
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <Field label="HOW MANY">
              <input
                type="number"
                min={1}
                max={lookup.available}
                value={checkoutQty}
                onChange={(e) => setCheckoutQty(Number(e.target.value))}
                className="w-24 border border-[#e3e0d8] bg-white px-3 py-[9px] font-mono text-[13.5px] outline-none"
              />
            </Field>
            <Field label="WHO IS TAKING IT">
              <input
                value={checkoutBy}
                onChange={(e) => setCheckoutBy(e.target.value)}
                placeholder="Ms. Bondar, 7B"
                className="w-full min-w-[220px] border border-[#e3e0d8] bg-white px-3 py-[9px] text-[13.5px] outline-none"
              />
            </Field>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await adminCheckOutByCode({
                    code: lookup.code,
                    qty: checkoutQty,
                    by: checkoutBy,
                  });
                  if (!result.ok) {
                    setMessage(result.error);
                    return;
                  }
                  setCode("");
                  setLookup(null);
                  setCheckoutBy("");
                  refresh(`Checked out ${checkoutQty}× ${lookup.name}.`);
                })
              }
              className="bg-[#141414] px-5 py-[10px] text-[13px] font-semibold text-white transition-colors hover:bg-[#c8102e] disabled:opacity-60"
            >
              Check out →
            </button>
          </div>
        )}

        {lookup?.ok && lookup.mode === "checkin" && (
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] text-[#3f3b33]">
              {lookup.name} — {lookup.loan.out_qty || lookup.loan.qty} out with{" "}
              {lookup.loan.name} · due back {lookup.dueBack}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await adminCheckInByCode(lookup.code);
                  if (!result.ok) {
                    setMessage(result.error);
                    return;
                  }
                  setCode("");
                  setLookup(null);
                  refresh(`Checked in ${lookup.name}.`);
                })
              }
              className="bg-[#2f9e44] px-5 py-[10px] text-[13px] font-semibold text-white disabled:opacity-60"
            >
              Check in {lookup.loan.out_qty || lookup.loan.qty} ✓
            </button>
          </div>
        )}
      </div>

      <PrintQrLabelsPanel equipment={equipment} />

      <form
        className="no-print page-gutter mb-7 grid grid-cols-1 items-end gap-3 border border-[#141414] p-[18px_20px] md:grid-cols-[1.5fr_2fr_150px_80px_80px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          startTransition(async () => {
            await createEquipment({
              name: form.name,
              detail: form.note,
              area: form.area,
              quantity_available: form.avail,
              quantity_total: form.total,
            });
            setForm({ name: "", note: "", area: form.area, avail: 1, total: 1 });
            refresh("Item added.");
          });
        }}
      >
        <Field label="ITEM NAME">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Cricut machine"
            className="w-full border border-[#e3e0d8] bg-white px-3 py-[9px] text-[13.5px] outline-none focus:border-[#141414]"
          />
        </Field>
        <Field label="DESCRIPTION">
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Short note shown under"
            className="w-full border border-[#e3e0d8] bg-white px-3 py-[9px] text-[13.5px] outline-none focus:border-[#141414]"
          />
        </Field>
        <Field label="AREA">
          <select
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className="w-full border border-[#e3e0d8] bg-white px-2 py-[9px] text-[13.5px] outline-none"
          >
            {AREA_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="AVAIL">
          <input
            type="number"
            min={0}
            value={form.avail}
            onChange={(e) => setForm({ ...form, avail: Number(e.target.value) })}
            className="w-full border border-[#e3e0d8] bg-white px-2 py-[9px] text-[13.5px] outline-none"
          />
        </Field>
        <Field label="TOTAL">
          <input
            type="number"
            min={0}
            value={form.total}
            onChange={(e) => setForm({ ...form, total: Number(e.target.value) })}
            className="w-full border border-[#e3e0d8] bg-white px-2 py-[9px] text-[13.5px] outline-none"
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#c8102e] px-4 py-[10px] text-[13px] font-medium text-white hover:bg-[#a50d26] disabled:opacity-60"
        >
          + Add item
        </button>
      </form>

      <div className="no-print page-gutter mb-12 overflow-x-auto">
        <div className="hidden min-w-[900px] grid-cols-[40px_1.5fr_2fr_150px_132px_80px_40px] gap-3 border-b border-[#141414] py-3 font-mono text-[10px] tracking-[0.16em] text-[#6d6759] md:grid">
          <span />
          <span>ITEM</span>
          <span>DESCRIPTION</span>
          <span>AREA</span>
          <span>AVAILABLE</span>
          <span>TOTAL</span>
          <span />
        </div>

        <div className="min-w-[900px] space-y-0">
          {equipment.map((item, i) => (
            <AdminRow
              key={item.id}
              item={item}
              index={i}
              outQty={outByEquipment.get(item.id) ?? 0}
              disabled={pending}
              onChange={(patch) =>
                startTransition(async () => {
                  await updateEquipment(item.id, patch);
                  refresh("Saved.");
                })
              }
              onDelete={() => {
                if (!confirm(`Delete "${item.name}"?`)) return;
                startTransition(async () => {
                  await deleteEquipment(item.id);
                  refresh("Item deleted.");
                });
              }}
            />
          ))}
        </div>
      </div>

      <div className="no-print page-gutter mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Replace all inventory with sample data?")) return;
            startTransition(async () => {
              await resetToSampleData();
              refresh("Reset to sample data.");
            });
          }}
          className="text-[12px] text-[#6d6759] transition-colors hover:text-[#c8102e]"
        >
          Reset to sample data
        </button>
      </div>

      <div className="no-print">
        <SiteFooter showAdmin={false} />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] tracking-[0.16em] text-[#6d6759]">
        {label}
      </span>
      {children}
    </label>
  );
}

function AdminRow({
  item,
  index,
  outQty,
  disabled,
  onChange,
  onDelete,
}: {
  item: EquipmentWithUnits;
  index: number;
  outQty: number;
  disabled: boolean;
  onChange: (patch: {
    name?: string;
    detail?: string;
    area?: string;
    quantity_available?: number;
    quantity_total?: number;
  }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [detail, setDetail] = useState(item.detail);
  const [area, setArea] = useState(item.area);
  const avail = item.quantity_available;
  const total = item.quantity_total;

  return (
    <div className="grid grid-cols-[40px_1.5fr_2fr_150px_132px_80px_40px] items-center gap-3 border-b border-[#eeece5] py-3">
      <div>
        <span className="font-mono text-[11px] text-[#c8b9a0]">
          {String(index + 1).padStart(2, "0")}
        </span>
        {isNewItem(item) && (
          <div className="mt-1 font-mono text-[9px] tracking-wide text-[#c8102e]">
            NEW
          </div>
        )}
        {outQty > 0 && (
          <div className="mt-1 font-mono text-[8px] tracking-wide text-[#9a6e06]">
            {outQty} OUT
          </div>
        )}
      </div>
      <div>
        <input
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== item.name) onChange({ name });
          }}
          className="w-full border border-transparent bg-transparent px-1 py-1 text-[14px] font-semibold outline-none hover:border-[#e3e0d8] focus:border-[#141414]"
        />
        <p className="px-1 font-mono text-[10px] tracking-wide text-[#98917f]">
          {item.qr_code}
        </p>
      </div>
      <input
        value={detail}
        disabled={disabled}
        onChange={(e) => setDetail(e.target.value)}
        onBlur={() => {
          if (detail !== item.detail) onChange({ detail });
        }}
        className="w-full border border-transparent bg-transparent px-1 py-1 text-[13px] text-[#3f3b33] outline-none hover:border-[#e3e0d8] focus:border-[#141414]"
      />
      <select
        value={area}
        disabled={disabled}
        onChange={(e) => {
          setArea(e.target.value);
          onChange({ area: e.target.value });
        }}
        className="w-full border border-[#e3e0d8] bg-white px-2 py-1.5 text-[13px] outline-none"
      >
        {AREA_OPTIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || avail <= 0}
          onClick={() =>
            onChange({ quantity_available: Math.max(0, avail - 1) })
          }
          className="flex h-[26px] w-[26px] items-center justify-center border border-[#e3e0d8] text-[14px] transition-colors hover:bg-[#141414] hover:text-white disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-[13px]">{avail}</span>
        <button
          type="button"
          disabled={disabled || avail >= total}
          onClick={() =>
            onChange({ quantity_available: Math.min(total, avail + 1) })
          }
          className="flex h-[26px] w-[26px] items-center justify-center border border-[#e3e0d8] text-[14px] transition-colors hover:bg-[#141414] hover:text-white disabled:opacity-40"
        >
          +
        </button>
      </div>
      <input
        type="number"
        min={0}
        value={total}
        disabled={disabled}
        onChange={(e) => {
          const t = Math.max(0, Number(e.target.value) || 0);
          onChange({
            quantity_total: t,
            quantity_available: Math.min(avail, t),
          });
        }}
        className="w-full border border-[#e3e0d8] bg-white px-2 py-1.5 text-center font-mono text-[13px] outline-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="text-[16px] text-[#98917f] transition-colors hover:text-[#c8102e]"
        aria-label={`Delete ${item.name}`}
      >
        ×
      </button>
    </div>
  );
}
