export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getEquipmentByQrCode } from "@/lib/data";
import { equipmentQrUrl } from "@/lib/qr";
import { stockStatus, statusDotColor } from "@/lib/inventory";

type PageProps = {
  params: Promise<{ qrCode: string }>;
};

export default async function EquipmentQrPage({ params }: PageProps) {
  const { qrCode } = await params;
  const item = await getEquipmentByQrCode(qrCode);

  if (!item) notFound();

  const status = stockStatus(item.quantity_available, item.quantity_total);

  return (
    <div className="page-gutter py-14">
      <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-[#6d6759]">
        {item.area}
      </p>
      <h1 className="font-display text-5xl font-normal">{item.name}</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#3f3b33]">
        {item.detail}
      </p>
      <p className="mt-8 flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-[#6d6759]">
        <span
          className="inline-block h-[7px] w-[7px] rounded-full"
          style={{ background: statusDotColor(status) }}
        />
        {item.quantity_available}/{item.quantity_total} · {status}
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/"
          className="bg-[#141414] px-5 py-3 text-sm text-white hover:text-white"
        >
          See resources →
        </Link>
        <Link href="/schedule" className="border border-[#141414] px-5 py-3 text-sm">
          Schedule the space
        </Link>
      </div>

      <p className="mt-10 text-sm text-[#6d6759]">
        Scanned from {equipmentQrUrl(item.qr_code)}.
      </p>
    </div>
  );
}
