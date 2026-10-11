/**
 * School teacher directory for school-project prints. Replace with the real
 * list (or a table) when available — ids are stored on print_requests.teacher.
 */
export type TeacherEntry = { v: string; name: string; subject: string };

export const TEACHERS: TeacherEntry[] = [
  { v: "m.bondar", name: "Ms. Bondar", subject: "Robotics" },
  { v: "o.melnyk", name: "Mr. Melnyk", subject: "Design & Technology" },
  { v: "k.shevchuk", name: "Ms. Shevchuk", subject: "Art & Design" },
  { v: "d.kovalenko", name: "Mr. Kovalenko", subject: "Computer Science" },
  { v: "i.tkachenko", name: "Ms. Tkachenko", subject: "Science" },
  { v: "a.rudenko", name: "Mr. Rudenko", subject: "Grade 6 STEM" },
];

export function teacherById(id: string | null | undefined) {
  return TEACHERS.find((t) => t.v === id) ?? null;
}

export function teacherName(id: string | null | undefined, fallback = "a teacher") {
  return teacherById(id)?.name ?? fallback;
}
