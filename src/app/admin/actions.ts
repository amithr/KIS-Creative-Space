"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyQrCode } from "@/lib/qr";
import { generateUniqueSerialNumber } from "@/lib/serial";

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!teacher) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_teacher");
  }

  return { supabase, user };
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login?error=auth_failed");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!teacher) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_teacher");
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type EquipmentInput = {
  area: string;
  name: string;
  detail: string;
  quantity_available: number;
  quantity_total: number;
  qr_code?: string;
  sort_order?: number;
};

function revalidateInventory() {
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}

async function serialExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serial: string,
) {
  const { data } = await supabase
    .from("equipment_units")
    .select("id")
    .eq("serial_number", serial)
    .maybeSingle();
  return Boolean(data);
}

async function createEquipmentUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
  count: number,
) {
  if (count < 1) return;

  for (let i = 0; i < count; i++) {
    const serial_number = await generateUniqueSerialNumber((serial) =>
      serialExists(supabase, serial),
    );

    const { error } = await supabase.from("equipment_units").insert({
      equipment_id: equipmentId,
      serial_number,
    });

    if (error) throw new Error(error.message);
  }
}

async function syncEquipmentUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
  targetQuantity: number,
) {
  const { data: units, error } = await supabase
    .from("equipment_units")
    .select("id")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const current = units?.length ?? 0;

  if (targetQuantity > current) {
    await createEquipmentUnits(supabase, equipmentId, targetQuantity - current);
    return;
  }

  if (targetQuantity < current) {
    const toRemove = (units ?? []).slice(targetQuantity);
    for (const unit of toRemove) {
      const { error: deleteError } = await supabase
        .from("equipment_units")
        .delete()
        .eq("id", unit.id);
      if (deleteError) throw new Error(deleteError.message);
    }
  }
}

export async function createEquipment(input: EquipmentInput) {
  const { supabase } = await requireTeacher();

  const total = Math.max(0, input.quantity_total);
  const avail = Math.min(Math.max(0, input.quantity_available), total);
  const qrCode =
    (input.qr_code?.trim() || slugifyQrCode(input.name)) || crypto.randomUUID();

  const { data, error } = await supabase
    .from("equipment")
    .insert({
      area: input.area.trim(),
      name: input.name.trim(),
      detail: input.detail.trim(),
      quantity_available: avail,
      quantity_total: total,
      qr_code: qrCode,
      sort_order: input.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create equipment.");
  }

  await createEquipmentUnits(supabase, data.id, total);

  revalidateInventory();
}

export async function addEquipmentUnit(equipmentId: string) {
  const { supabase } = await requireTeacher();

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id, quantity_available, quantity_total")
    .eq("id", equipmentId)
    .maybeSingle();

  if (equipmentError || !equipment) {
    throw new Error("Equipment not found.");
  }

  await createEquipmentUnits(supabase, equipmentId, 1);

  const { error: updateError } = await supabase
    .from("equipment")
    .update({
      quantity_available: equipment.quantity_available + 1,
      quantity_total: (equipment.quantity_total ?? equipment.quantity_available) + 1,
    })
    .eq("id", equipmentId);

  if (updateError) throw new Error(updateError.message);

  revalidateInventory();
}

export async function updateEquipment(
  id: string,
  input: Partial<EquipmentInput>,
) {
  const { supabase } = await requireTeacher();

  const payload: Record<string, unknown> = {};
  if (input.area !== undefined) payload.area = input.area.trim();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.detail !== undefined) payload.detail = input.detail.trim();
  if (input.quantity_available !== undefined)
    payload.quantity_available = input.quantity_available;
  if (input.quantity_total !== undefined)
    payload.quantity_total = input.quantity_total;
  if (input.qr_code !== undefined) payload.qr_code = input.qr_code.trim();
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

  if (
    input.quantity_total !== undefined &&
    input.quantity_available === undefined
  ) {
    const { data: current } = await supabase
      .from("equipment")
      .select("quantity_available")
      .eq("id", id)
      .maybeSingle();
    if (current) {
      payload.quantity_available = Math.min(
        current.quantity_available,
        input.quantity_total,
      );
    }
  }

  const { error } = await supabase
    .from("equipment")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (input.quantity_total !== undefined) {
    await syncEquipmentUnits(supabase, id, input.quantity_total);
  }

  revalidateInventory();
  revalidatePath(`/equipment/${input.qr_code ?? ""}`);
}

export async function deleteEquipment(id: string) {
  const { supabase } = await requireTeacher();

  const { error } = await supabase.from("equipment").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateInventory();
}

export async function resetToSampleData() {
  const { supabase } = await requireTeacher();

  const { error: clearError } = await supabase
    .from("equipment")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (clearError) throw new Error(clearError.message);

  const samples = [
    { name: "LEGO Spike Prime kit", detail: "Includes hub, motors, sensors", area: "LEGO Play", quantity_available: 6, quantity_total: 8, qr_code: "spike", sort_order: 1 },
    { name: "LEGO Technic bins", detail: "Sorted by element type", area: "LEGO Play", quantity_available: 12, quantity_total: 12, qr_code: "technic", sort_order: 2 },
    { name: "mBot2 robot", detail: "Charged and ready", area: "Robotics", quantity_available: 4, quantity_total: 10, qr_code: "mbot", sort_order: 3 },
    { name: "Arduino starter kit", detail: "Breadboard, jumper set, sensor pack", area: "Robotics", quantity_available: 9, quantity_total: 15, qr_code: "arduino", sort_order: 4 },
    { name: "Soldering station", detail: "Teacher supervision required", area: "Robotics", quantity_available: 2, quantity_total: 3, qr_code: "solder", sort_order: 5 },
    { name: "Cutting mats & knives", detail: "Blades replaced weekly", area: "Art & Design", quantity_available: 14, quantity_total: 16, qr_code: "mats", sort_order: 6 },
    { name: "Acrylic paint set", detail: "Restock requested", area: "Art & Design", quantity_available: 3, quantity_total: 20, qr_code: "paint", sort_order: 7 },
    { name: "Meta Quest 3 headset", detail: "Wipe before return", area: "VR Lab", quantity_available: 5, quantity_total: 6, qr_code: "quest", sort_order: 8 },
    { name: "Prusa MK4 printer", detail: "PLA only", area: "3D Printing", quantity_available: 2, quantity_total: 4, qr_code: "prusa", sort_order: 9 },
    { name: "PLA filament (1 kg)", detail: "White, black, red in stock", area: "3D Printing", quantity_available: 7, quantity_total: 10, qr_code: "filament", sort_order: 10 },
  ];

  for (const sample of samples) {
    const { data, error } = await supabase
      .from("equipment")
      .insert(sample)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to seed sample.");
    await createEquipmentUnits(supabase, data.id, sample.quantity_total);
  }

  revalidateInventory();
}

export async function updateWeeklyNote(note: string) {
  const { supabase } = await requireTeacher();

  const { error } = await supabase.from("site_settings").upsert({
    key: "weekly_note",
    value: note,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateShowTelegram(show: boolean) {
  const { supabase } = await requireTeacher();

  const { error } = await supabase.from("site_settings").upsert({
    key: "show_telegram",
    value: show,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateMaxReservationDays(days: number) {
  const { supabase } = await requireTeacher();

  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error("Maximum reservation days must be between 1 and 365.");
  }

  const { error } = await supabase.from("site_settings").upsert({
    key: "max_reservation_days",
    value: days,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/checkout");
  revalidatePath("/admin");
}
