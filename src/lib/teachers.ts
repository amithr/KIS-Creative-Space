/**
 * School teacher directory for school-project prints. Ids are stored on
 * print_requests.teacher, so keep them stable when refreshing the list.
 *
 * Teaching staff scraped from https://kyiv.qsi.org/discover/faculty-and-staff
 * on 2026-10-16 (46 of 62 listed staff; office, IT, business, nurse and
 * transport roles left out). Ids are `firstname-lastname`, names keep the
 * site's honorific, subjects are the listed roles with "Teacher" trimmed.
 * Mirror any change in the Flutter app's lib/data/ledger.dart `teacherNames`.
 */
export type TeacherEntry = { v: string; name: string; subject: string };

export const TEACHERS: TeacherEntry[] = [
  { v: "sergiy-berezhny", name: "Mr. Sergiy Berezhny", subject: "Languages Program Coordinator · French (LOE)" },
  { v: "maria-bizhyk", name: "Mrs. Maria Bizhyk", subject: "Ukrainian (LOE) · IB Coordinator" },
  { v: "irene-bykova", name: "Ms. Irene Bykova", subject: "Intensive English Coordinator" },
  { v: "oksana-chemerys", name: "Mrs. Oksana Chemerys", subject: "IB Math Analysis & Appr · Algebra" },
  { v: "daria-filatova", name: "Ms. Daria Filatova", subject: "Elementary Science · Cultural Studies" },
  { v: "helen-garbuz", name: "Mrs. Helen Garbuz", subject: "10 YO Core" },
  { v: "maria-glukhaya", name: "Ms. Maria Glukhaya", subject: "6 YO Core" },
  { v: "olga-golitsyna", name: "Mrs. Olga Golitsyna", subject: "Intensive English" },
  { v: "lily-gorbatenko", name: "Ms. Lily Gorbatenko", subject: "PE · Activities" },
  { v: "paul-hodgson", name: "Mr. Paul Hodgson", subject: "Middle School & Secondary Academic Coordinator" },
  { v: "dana-horbunova", name: "Mrs. Dana Horbunova", subject: "German (LOE)" },
  { v: "bob-hume", name: "Mr. Bob Hume", subject: "IB Business Management · IB TOK · Writing & Literature" },
  { v: "leanne-hume", name: "Mrs. Leanne Hume", subject: "IB English Lang & Lit · IB Art · Drama" },
  { v: "svitlana-ionova", name: "Mrs. Svitlana Ionova", subject: "Music" },
  { v: "theo-kourkov", name: "Mr. Theo Kourkov", subject: "9 YO Core" },
  { v: "natalia-kuzovleva", name: "Mrs. Natalia Kuzovleva", subject: "Elementary Science · Cultural Studies" },
  { v: "rachel-lehmann-ware", name: "Mrs. Rachel Lehmann-Ware", subject: "11 YO Core" },
  { v: "jonathan-logan", name: "Mr. Jonathan Logan", subject: "Reading & Writing · History" },
  { v: "andrew-mccartney", name: "Mr. Andrew McCartney", subject: "IB Computer Science · Algebra · Cultural Studies" },
  { v: "jake-mcgrew", name: "Mr. Jake McGrew", subject: "Elementary Academic Coordinator" },
  { v: "alla-mironenko", name: "Mrs. Alla Mironenko", subject: "5 YO Teaching Assistant" },
  { v: "kateryna-munteanu", name: "Mrs. Kateryna Munteanu", subject: "German (LOE)" },
  { v: "caren-musser", name: "Mrs. Caren Musser", subject: "5 YO Core" },
  { v: "rachel-musser", name: "Ms. Rachel Musser", subject: "7 YO Core" },
  { v: "olexandra-myronova", name: "Ms. Olexandra Myronova", subject: "Art" },
  { v: "hanna-oleksenko", name: "Ms. Hanna Oleksenko", subject: "IB Biology · IB Chemistry · IB Psychology" },
  { v: "lyubov-onyskevych", name: "Ms. Lyubov Onyskevych", subject: "6 YO Co-Teacher" },
  { v: "yulia-petrunyok", name: "Mrs. Yulia Petrunyok", subject: "2 YO" },
  { v: "olena-petrunyok", name: "Ms. Olena Petrunyok", subject: "4 YO Teaching Assistant" },
  { v: "anna-plakhotniuk", name: "Ms. Anna Plakhotniuk", subject: "7 YO Co-Teacher" },
  { v: "anatoly-prima", name: "Mr. Anatoly Prima", subject: "Athletics Coordinator / PE / Wellness" },
  { v: "julia-prima", name: "Mrs. Julia Prima", subject: "8 YO Core" },
  { v: "anastasiia-rabchun", name: "Ms. Anastasiia Rabchun", subject: "French (LOE)" },
  { v: "amith-ravindar", name: "Mr. Amith Ravindar", subject: "IB Economics · IB Business Management" },
  { v: "nataliya-rudenko", name: "Ms. Nataliya Rudenko", subject: "3 YO" },
  { v: "olena-shefner", name: "Mrs. Olena Shefner", subject: "4 YO" },
  { v: "olga-shliakhovska", name: "Mrs. Olga Shliakhovska", subject: "Swimming" },
  { v: "galina-shymanska", name: "Ms. Galina Shymanska", subject: "Learning Support" },
  { v: "olga-steblyanko", name: "Mrs. Olga Steblyanko", subject: "8 YO Co-Teacher" },
  { v: "liudmila-stetskova", name: "Mrs. Liudmila Stetskova", subject: "Intensive English" },
  { v: "alla-titova", name: "Mrs. Alla Titova", subject: "Middle School Writing & Literature" },
  { v: "yulia-vazhka", name: "Ms. Yulia Vazhka", subject: "Mathematics · Geometry · Media" },
  { v: "duncan-ware", name: "Mr. Duncan Ware", subject: "Middle School Science" },
  { v: "alla-yarmolenko", name: "Mrs. Alla Yarmolenko", subject: "Library" },
  { v: "kateryna-zakharova", name: "Ms. Kateryna Zakharova", subject: "Dance & PE" },
  { v: "olga-zinchenko", name: "Ms. Olga Zinchenko", subject: "Technology" },
];

export function teacherById(id: string | null | undefined) {
  return TEACHERS.find((t) => t.v === id) ?? null;
}

export function teacherName(id: string | null | undefined, fallback = "a teacher") {
  return teacherById(id)?.name ?? fallback;
}
