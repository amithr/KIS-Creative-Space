import type { PrintCut, PrintKind, PrintOrigin, PrintRequest } from "@/lib/types";

export type Lang = "en" | "uk";
export const LANG_STORAGE_KEY = "kis-student-lang";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "uk";
}

type KindStrings = {
  label: string;
  tag: string;
  /** Accepted types, shown as the right-aligned mono hint on step 2. */
  hint: string;
  title: string;
  /** One short line under the drop-box title. */
  fileHint: string;
  choose: string;
  pickToast: string;
  wrongFile: string;
  missingFile: string;
};

type CutStrings = { label: string; tip: string };
type OriginStrings = {
  /** Full wording — tooltip on the tile. */
  label: string;
  hint: string;
  /** Tile copy: big mono glyph, short label, cost line. */
  big: string;
  short: string;
  cost: string;
  pts: string;
  toast: string;
  tag: string;
};
type RankStrings = { name: string; short: string; blurb: string };

export type Strings = {
  nav: { home: string; print: string; track: string; board: string };
  brandSub: string;
  footer: string;
  footerMark: string;
  footerSecretTip: string;
  langLabel: string;
  game: {
    eyebrow: string;
    title: string;
    tagline: string;
    best: string;
    close: string;
    hintKeys: string;
    hintSpeed: string;
    idle: string;
    snagged: (n: number) => string;
    rethread: string;
  };
  landing: {
    eyebrow: string;
    headline: string;
    body: string;
    btn3d: string;
    btnVinyl: string;
    btnTrack: string;
    how: string;
    steps: { n: string; title: string; body: string }[];
    teaserEyebrow: string;
    teaserTitle: string;
    teaserBody: string;
    boardEyebrow: string;
    boardMeta: (n: number) => string;
    boardRow: (rank: string, stitches: number, own: number) => string;
    rulesEyebrow: string;
    rulesTitle: string;
    rules: string[];
    /** Mono live line under the hero buttons, linking to the board. */
    liveNow: (n: number) => string;
    liveQueue: (n: number) => string;
    liveSee: string;
  };
  /** ON THE PRINTERS — public live board (names only). */
  board: {
    eyebrow: string;
    headlinePrinting: (n: number) => string;
    headlineOne: string;
    headlineQueue: (n: number) => string;
    headlineReady: string;
    headlineQuiet: string;
    lede: string;
    counters: { queued: string; printing: string; ready: string };
    groups: Record<"ready" | "machines" | "prepared" | "queue", string>;
    jobs: (n: number) => string;
    kindTag: Record<PrintKind, string>;
    by: (name: string) => string;
    someone: string;
    ago: Record<"min" | "h" | "d", (n: number) => string>;
    emptyPre: string;
    emptyLink: string;
    emptyPost: string;
    footer: string;
    footerLink: string;
    openToast: (n: number) => string;
  };
  form: {
    eyebrow: string;
    /** Small mono section labels (one continuous form, no step numbering). */
    sections: { what: string; file: string; who: string; you: string };
    kinds: Record<PrintKind, KindStrings>;
    browse: string;
    swap: string;
    attachedShort: (mb: string) => string;
    attachedToast: string;
    svgTip: string;
    tooBig: string;
    howMany: string;
    cut: string;
    cuts: Record<PrintCut, CutStrings>;
    colour: string;
    pointsQ: string;
    pointsTip: string;
    origins: Record<PrintOrigin, OriginStrings>;
    teacherPlaceholder: string;
    teacherToast: (name: string) => string;
    points: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    missing: { name: string; email: string; origin: string; teacher: string };
    stillNeeded: (list: string) => string;
    brokeLine: (balance: number) => string;
    readyLine3d: (file: string, color: string) => string;
    readyLineVinyl: (qty: number, file: string) => string;
    readyFor: (teacher: string) => string;
    readyLeft: (left: number) => string;
    sendIt: string;
    sendPaid: string;
    sendFree: string;
    notEnough: string;
    notEnoughToast: string;
    sending: string;
    almost: (list: string) => string;
    sentSchool: (teacher: string) => string;
    sentMine: (lo: number, hi: number) => string;
    sentFound: (left: number) => string;
    dbError: string;
    uploadFailed: string;
    recent: string;
    seeAll: string;
    emptyUnder: (email: string) => string;
    emptyNoEmail: string;
  };
  track: {
    eyebrow: string;
    title: string;
    email: string;
    help: string;
    stagesTitle: string;
    glossary: { term: string; text: string; ready?: boolean }[];
    newRequest: string;
    yourPrints: string;
    typeAbove: string;
    nudge: string;
    readyNotice: string;
    cancelled: (file: string) => string;
    refunded: string;
    cancelTitle: string;
    metaVinyl: string;
    metaCut: (cut: string) => string;
    rushnyk: string;
    level: (n: number) => string;
    pointsToSpend: string;
    pending: string;
    pendingTip: string;
    explainer: string;
    stitches: (n: number) => string;
    toNext: (n: number, rank: string) => string;
    topRank: string;
    ownDesigns: string;
    schoolProjects: string;
    found: string;
    bandStitched: (rank: string) => string;
    bandLocked: (rank: string, min: number) => string;
    ranks: RankStrings[];
    chipOwn: string;
    chipFound: string;
    chipSchool: (teacher: string) => string;
    chipPending: string;
    chipFree: string;
    tipSchool: string;
    tipPaid: string;
    tipPaidRated: string;
    tipPending: string;
    levelUp: (rank: string) => string;
  };
  stages: Record<"3d" | "vinyl", string[]>;
};

const en: Strings = {
  nav: { home: "HOME", print: "PRINT REQUEST", track: "MY REQUESTS", board: "ON THE PRINTERS" },
  brandSub: "FOR STUDENTS · ДЛЯ УЧНІВ",
  footer: "KIS Design Studio · prints run Tuesday–Thursday · collect within a week",
  footerMark: "ТВОРЧИЙ ПРОСТІР",
  footerSecretTip: "psst — try typing the word for what we do",
  game: {
    eyebrow: "× SECRET ×",
    title: "Stitch Run",
    tagline: "The needle must not snag.",
    best: "BEST",
    close: "ESC · CLOSE",
    hintKeys: "SPACE / ↑ / TAP — JUMP · ↓ — DUCK",
    hintSpeed: "EVERY 100 STITCHES THE THREAD RUNS FASTER",
    idle: "PRESS SPACE OR TAP TO START STITCHING",
    snagged: (n) => `SNAGGED · ${n} STITCHES`,
    rethread: "SPACE OR TAP TO RE-THREAD",
  },
  langLabel: "Language",
  landing: {
    eyebrow: "× MAKE · BUILD · PRINT ×",
    headline: "Turn your ideas into something real.",
    body: "The Design Studio prints student work every week — 3D models, posters, and vinyl stickers cut to shape. Send us your file and we'll tell you when it's ready to collect.",
    btn3d: "REQUEST A 3D PRINT →",
    btnVinyl: "POSTERS & STICKERS →",
    btnTrack: "CHECK MY PRINTS",
    how: "HOW IT WORKS · ЯК ЦЕ ПРАЦЮЄ",
    steps: [
      { n: "01", title: "Design it", body: "A 3D model (.STL/.3MF), or poster and sticker artwork (PDF, PNG, SVG)." },
      { n: "02", title: "Send the file", body: "Fill in the short request form. Pick a colour — or how many stickers." },
      { n: "03", title: "We make it", body: "3D prints go slicing → printing; vinyl goes printing → cutting. Follow along on your list." },
      { n: "04", title: "Collect it", body: "My requests shows READY when it's done. Pick up at the Design Studio." },
    ],
    teaserEyebrow: "× YOUR RUSHNYK · РУШНИК ×",
    teaserTitle: "Every print stitches a band onto your rushnyk",
    teaserBody: "You start with 30 points and every print costs 10. Found files earn nothing back. Design your own and earn up to 30 — the better the print, the more you get. Prints for a school project are free. Points earned stitch bands onto your rushnyk, from Thread to Master Embroiderer.",
    boardEyebrow: "× MASTER EMBROIDERERS · THIS YEAR ×",
    boardMeta: (n) => `${n} MAKERS · RANKED BY STITCHES EARNED`,
    boardRow: (rank, stitches, own) => `${rank} · ${stitches} STITCHES · ${own} OWN DESIGNS`,
    rulesEyebrow: "BEFORE YOU SEND",
    rulesTitle: "Three small things that make prints succeed",
    rules: [
      "3D models: export .STL or .3MF, under 18 cm on every side.",
      "Posters & stickers: a PDF, PNG or SVG at full size — SVG with a clean outline cuts best.",
      "Give us at least a week — big prints take a whole night.",
    ],
    liveNow: (n) => `LIVE · ${n} ON THE PRINTERS RIGHT NOW →`,
    liveQueue: (n) => `LIVE · ${n} IN THE QUEUE →`,
    liveSee: "SEE WHAT'S ON THE PRINTERS →",
  },
  board: {
    eyebrow: "× LIVE FROM THE STUDIO ×",
    headlinePrinting: (n) => `${n} things are being made right now`,
    headlineOne: "One thing is being made right now",
    headlineQueue: (n) => `Warming up — ${n} in the queue`,
    headlineReady: "All done — come and collect",
    headlineQuiet: "The printers are quiet",
    lede: "Everything on the printers and cutters right now. Names only — no emails.",
    counters: { queued: "QUEUED", printing: "PRINTING", ready: "READY" },
    groups: {
      ready: "READY TO COLLECT",
      machines: "ON THE MACHINES",
      prepared: "BEING PREPARED",
      queue: "IN THE QUEUE",
    },
    jobs: (n) => (n === 1 ? "1 JOB" : `${n} JOBS`),
    kindTag: { "3d": "3D", poster: "POSTER", sticker: "STKR" },
    by: (name) => `BY ${name.toUpperCase()}`,
    someone: "Someone",
    ago: {
      min: (n) => `${n} MIN AGO`,
      h: (n) => `${n} H AGO`,
      d: (n) => `${n} D AGO`,
    },
    emptyPre: "The printers are quiet — ",
    emptyLink: "send the first print",
    emptyPost: " and it'll show up here.",
    footer: "Updates on its own as the studio team moves jobs along. Looking for yours?",
    footerLink: "My requests →",
    openToast: (n) => `LIVE · ${n} JOBS ON THE GO`,
  },
  form: {
    eyebrow: "× PRINT REQUEST ×",
    sections: { what: "WHAT ARE YOU MAKING?", file: "YOUR FILE", who: "WHO DESIGNED IT?", you: "ABOUT YOU" },
    kinds: {
      "3d": {
        label: "3D print", tag: "3D", hint: ".STL · .3MF", title: "Tell us about your print",
        fileHint: ".stl or .3mf file", choose: "Choose your 3D file",
        pickToast: "3D PRINT · ATTACH AN .STL OR .3MF", wrongFile: "THAT ISN'T A 3D FILE — EXPORT AS .STL OR .3MF", missingFile: "a 3D file",
      },
      poster: {
        label: "Poster", tag: "POSTER", hint: "PDF · PNG · SVG", title: "Tell us about your poster",
        fileHint: "Full size, as you want it printed", choose: "Choose your artwork",
        pickToast: "POSTER · PRINTED ON ADHESIVE VINYL", wrongFile: "THAT FILE TYPE WON'T PRINT — USE PDF · PNG · SVG", missingFile: "your artwork file",
      },
      sticker: {
        label: "Stickers", tag: "STICKERS", hint: "SVG · PNG · CUT TO SHAPE", title: "Tell us about your stickers",
        fileHint: "SVG cuts the cleanest", choose: "Choose your artwork",
        pickToast: "STICKERS · PRINTED ON VINYL, THEN CUT TO SHAPE", wrongFile: "THAT FILE TYPE WON'T PRINT — USE SVG · PNG", missingFile: "your artwork file",
      },
    },
    browse: "BROWSE",
    swap: "SWAP",
    attachedShort: (mb) => `${mb} MB · tap to swap`,
    attachedToast: "FILE ATTACHED ✓ · ",
    svgTip: " · TIP: SVG CUTS CLEANER",
    tooBig: "THAT FILE IS OVER 50 MB — EXPORT A SMALLER ONE",
    howMany: "HOW MANY",
    cut: "CUT",
    cuts: {
      contour: { label: "CUT AROUND", tip: "Cut tightly around the outline of your design" },
      border: { label: "WITH BORDER", tip: "A small white border around the design" },
      square: { label: "SQUARE", tip: "Simple square or rectangle" },
    },
    colour: "COLOUR",
    pointsQ: "POINTS ?",
    pointsTip: "Start with 30 points. A print costs 10. Your own design earns 20–30 back when it's ready. School projects are free. Found files earn nothing.",
    origins: {
      mine: { label: "I designed it", hint: "Modelled or drawn by you, from scratch.", big: "×××", short: "I made it", cost: "−10 · EARN 20–30", pts: "COSTS 10 · EARNS 15–30", toast: "OWN DESIGN · COSTS 10, EARNS 15–30 BACK WHEN READY", tag: "OWN DESIGN" },
      school: { label: "It's for a school project", hint: "Set by a teacher — pick who it's for.", big: "★", short: "For a teacher", cost: "FREE", pts: "FREE · NO POINTS", toast: "SCHOOL PROJECT · FREE · NOW PICK THE TEACHER", tag: "SCHOOL PROJECT" },
      found: { label: "I found it", hint: "Downloaded as-is. Costs points, earns none.", big: "↓", short: "I found it", cost: "−10", pts: "COSTS 10 · EARNS 0", toast: "FOUND · COSTS 10, EARNS NOTHING BACK · THANKS FOR BEING HONEST", tag: "FOUND" },
    },
    teacherPlaceholder: "Which teacher is it for?",
    teacherToast: (name) => `FOR ${name.toUpperCase()} · FREE PRINT · WE'LL LET THEM KNOW`,
    points: "POINTS",
    namePlaceholder: "Your name",
    emailPlaceholder: "Your KIS email",
    missing: { name: "your name", email: "your email", origin: "who designed it", teacher: "the teacher it's for" },
    stillNeeded: (list) => `Still needed: ${list}.`,
    brokeLine: (b) => `Only ${b} points — ask the studio for a top-up, or pick “For a teacher”.`,
    readyLine3d: (file, color) => `✓ ${file} in ${color}`,
    readyLineVinyl: (qty, file) => `✓ ${qty} × ${file}`,
    readyFor: (teacher) => ` · for ${teacher}`,
    readyLeft: (left) => ` · you'll have ${left} points left`,
    sendIt: "SEND IT →",
    sendPaid: "SEND IT · −10 →",
    sendFree: "SEND IT · FREE →",
    notEnough: "NOT ENOUGH POINTS",
    notEnoughToast: "NOT ENOUGH POINTS · ASK THE STUDIO TEAM FOR A TOP-UP",
    sending: "SENDING…",
    almost: (list) => `ALMOST — ADD ${list}`,
    sentSchool: (teacher) => `REQUEST SENT ✓ · FREE SCHOOL PRINT · ${teacher.toUpperCase()} WILL BE TOLD`,
    sentMine: (lo, hi) => `REQUEST SENT ✓ · −10 POINTS · EARN ${lo}–${hi} BACK WHEN IT'S READY`,
    sentFound: (left) => `REQUEST SENT ✓ · −10 POINTS · ${left} POINTS LEFT`,
    dbError: "DATABASE NOT CONFIGURED — ASK THE DESIGN STUDIO",
    uploadFailed: "UPLOAD FAILED — ",
    recent: "Your recent requests",
    seeAll: "SEE ALL →",
    emptyUnder: (email) => `Nothing yet under ${email} — your first request will appear here the moment you send it.`,
    emptyNoEmail: "Enter your KIS email in the form and your prints will show up here.",
  },
  track: {
    eyebrow: "× MY REQUESTS ×",
    title: "Where are my prints?",
    email: "YOUR KIS EMAIL",
    help: "Type the email you used on your request — your list updates as you type. No password needed.",
    stagesTitle: "WHAT THE STAGES MEAN",
    glossary: [
      { term: "RECEIVED", text: " — we've got your file and it's in the queue." },
      { term: "SLICING / PRINTING", text: " — it's being prepared or is on the machine." },
      { term: "CUTTING", text: " — stickers and posters are going through the vinyl cutter." },
      { term: "READY", text: " — come and collect it from the Design Studio.", ready: true },
    ],
    newRequest: "+ NEW REQUEST",
    yourPrints: "Your prints",
    typeAbove: "TYPE YOUR EMAIL ABOVE",
    nudge: "TYPE YOUR KIS EMAIL TO SEE YOUR PRINTS",
    readyNotice: "Ready to collect from the Design Studio — bring your student card.",
    cancelled: (file) => `REQUEST CANCELLED · ${file}`,
    refunded: " · 10 POINTS REFUNDED",
    cancelTitle: "Cancel this request",
    metaVinyl: "VINYL",
    metaCut: (cut) => `${cut.toUpperCase()} CUT`,
    rushnyk: "YOUR RUSHNYK · РУШНИК",
    level: (n) => `LEVEL ${n}`,
    pointsToSpend: "POINTS TO SPEND",
    pending: "PENDING",
    pendingTip: "Points you'll receive when the studio marks these prints READY and rates them",
    explainer: "Each print costs 10. Design your own to earn more back than you spend.",
    stitches: (n) => `${n} ${n === 1 ? "STITCH" : "STITCHES"}`,
    toNext: (n, rank) => `${n} TO ${rank.toUpperCase()}`,
    topRank: "TOP RANK ✓",
    ownDesigns: "OWN DESIGNS",
    schoolProjects: "SCHOOL PROJECTS",
    found: "FOUND",
    bandStitched: (rank) => `${rank} band · stitched`,
    bandLocked: (rank, min) => `${rank} band · unlocks at ${min} stitches`,
    ranks: [
      { name: "Thread", short: "THREAD", blurb: "Everyone starts with a single thread. Design and print something to begin your rushnyk." },
      { name: "Needle", short: "NEEDLE", blurb: "Your first band is stitched. Keep designing — quality earns bonus stitches." },
      { name: "Stitcher", short: "STITCHER", blurb: "Two bands down. You're a regular at the Design Studio now." },
      { name: "Weaver", short: "WEAVER", blurb: "Patterns on patterns. Teachers notice weavers — ask about mentoring younger makers." },
      { name: "Master Embroiderer", short: "MASTER", blurb: "The whole rushnyk is yours. Your name goes on the wall by the printers." },
    ],
    chipOwn: "OWN DESIGN",
    chipFound: "FOUND",
    chipSchool: (teacher) => `SCHOOL PROJECT · ${teacher.toUpperCase()} · FREE`,
    chipPending: "PENDING",
    chipFree: "FREE",
    tipSchool: "Free print for a school project — no points spent or earned.",
    tipPaid: "Points earned back for this print",
    tipPaidRated: "Points earned back for this print · quality rated by the studio",
    tipPending: "Points come back when the studio marks it READY and rates the quality.",
    levelUp: (rank) => `LEVEL UP ✓ · YOU'RE A ${rank.toUpperCase()} · NEW BAND STITCHED`,
  },
  stages: {
    "3d": ["RECEIVED", "SLICING", "PRINTING", "READY"],
    vinyl: ["RECEIVED", "PRINTING", "CUTTING", "READY"],
  },
};

/** Ukrainian plural forms: 1 → one, 2–4 → few, else many (12–14 are many). */
function ukPlural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const ukThings = (n: number) => ukPlural(n, "річ", "речі", "речей");
const ukJobs = (n: number) => ukPlural(n, "РОБОТА", "РОБОТИ", "РОБІТ");

const uk: Strings = {
  nav: { home: "ГОЛОВНА", print: "ЗАМОВИТИ ДРУК", track: "МОЇ ЗАМОВЛЕННЯ", board: "НА ПРИНТЕРАХ" },
  brandSub: "ДЛЯ УЧНІВ · FOR STUDENTS",
  footer: "KIS Design Studio · друкуємо вівторок–четвер · заберіть протягом тижня",
  footerMark: "DESIGN STUDIO",
  footerSecretTip: "псст — спробуй набрати англійське слово для того, що ми робимо",
  game: {
    eyebrow: "× СЕКРЕТ ×",
    title: "Stitch Run",
    tagline: "Голка не має зачепитися.",
    best: "РЕКОРД",
    close: "ESC · ЗАКРИТИ",
    hintKeys: "ПРОБІЛ / ↑ / ТАП — СТРИБОК · ↓ — ПРИГНУТИСЬ",
    hintSpeed: "КОЖНІ 100 СТІБКІВ НИТКА БІЖИТЬ ШВИДШЕ",
    idle: "НАТИСНИ ПРОБІЛ АБО ТАП, ЩОБ ПОЧАТИ ШИТИ",
    snagged: (n) => `ЗАЧЕПИЛОСЬ · ${n} СТІБКІВ`,
    rethread: "ПРОБІЛ АБО ТАП — ПРОТЯГНУТИ НИТКУ ЗНОВУ",
  },
  langLabel: "Мова",
  landing: {
    eyebrow: "× ТВОРИ · БУДУЙ · ДРУКУЙ ×",
    headline: "Перетворіть свої ідеї на щось справжнє.",
    body: "Дизайн-студія щотижня друкує учнівські роботи — 3D-моделі, постери та вінілові наліпки, вирізані за контуром. Надішліть файл, і ми повідомимо, коли його можна забрати.",
    btn3d: "ЗАМОВИТИ 3D-ДРУК →",
    btnVinyl: "ПОСТЕРИ Й НАЛІПКИ →",
    btnTrack: "МОЇ ВІДБИТКИ",
    how: "ЯК ЦЕ ПРАЦЮЄ · HOW IT WORKS",
    steps: [
      { n: "01", title: "Створіть дизайн", body: "3D-модель (.STL/.3MF) або макет постера чи наліпки (PDF, PNG, SVG)." },
      { n: "02", title: "Надішліть файл", body: "Заповніть коротку форму. Оберіть колір — або кількість наліпок." },
      { n: "03", title: "Ми виготовляємо", body: "3D-друк: нарізка → друк; вініл: друк → різання. Стежте за статусом у своєму списку." },
      { n: "04", title: "Заберіть", body: "У «Моїх замовленнях» з'явиться ГОТОВО. Заберіть у Дизайн-студії." },
    ],
    teaserEyebrow: "× ВАШ РУШНИК · YOUR RUSHNYK ×",
    teaserTitle: "Кожен відбиток вишиває смугу на вашому рушнику",
    teaserBody: "Ви починаєте з 30 балів, кожен друк коштує 10. Знайдені файли нічого не повертають. Створіть власний дизайн і заробіть до 30 — що кращий відбиток, то більше балів. Друк для шкільного проєкту безкоштовний. Зароблені бали вишивають смуги на вашому рушнику — від Нитки до Майстра вишивки.",
    boardEyebrow: "× МАЙСТРИ ВИШИВКИ · ЦЬОГО РОКУ ×",
    boardMeta: (n) => `${n} МАЙСТРІВ · ЗА ЗАРОБЛЕНИМИ СТІБКАМИ`,
    boardRow: (rank, stitches, own) => `${rank} · ${stitches} СТІБКІВ · ${own} ВЛАСНИХ ДИЗАЙНІВ`,
    rulesEyebrow: "ПЕРЕД НАДСИЛАННЯМ",
    rulesTitle: "Три дрібниці, завдяки яким друк вдається",
    rules: [
      "3D-моделі: експортуйте .STL або .3MF, не більше 18 см з кожного боку.",
      "Постери й наліпки: PDF, PNG або SVG у повному розмірі — SVG з чистим контуром ріжеться найкраще.",
      "Дайте нам щонайменше тиждень — великі відбитки друкуються цілу ніч.",
    ],
    liveNow: (n) => `НАЖИВО · ${n} НА ПРИНТЕРАХ ПРОСТО ЗАРАЗ →`,
    liveQueue: (n) => `НАЖИВО · ${n} У ЧЕРЗІ →`,
    liveSee: "ЩО ЗАРАЗ НА ПРИНТЕРАХ →",
  },
  board: {
    eyebrow: "× НАЖИВО ЗІ СТУДІЇ ×",
    headlinePrinting: (n) => `Зараз виготовляється ${n} ${ukThings(n)}`,
    headlineOne: "Зараз виготовляється одна річ",
    headlineQueue: (n) => `Розігріваємось — ${n} у черзі`,
    headlineReady: "Усе готово — приходьте забирати",
    headlineQuiet: "Принтери мовчать",
    lede: "Усе, що зараз на принтерах і різаках. Лише імена — без електронних адрес.",
    counters: { queued: "У ЧЕРЗІ", printing: "ДРУК", ready: "ГОТОВО" },
    groups: {
      ready: "ГОТОВО ДО ВИДАЧІ",
      machines: "НА МАШИНАХ",
      prepared: "ГОТУЄТЬСЯ",
      queue: "У ЧЕРЗІ",
    },
    jobs: (n) => `${n} ${ukJobs(n)}`,
    kindTag: { "3d": "3D", poster: "ПОСТЕР", sticker: "НАЛІП" },
    by: (name) => `ВІД ${name.toUpperCase()}`,
    someone: "Хтось",
    ago: {
      min: (n) => `${n} ХВ ТОМУ`,
      h: (n) => `${n} ГОД ТОМУ`,
      d: (n) => `${n} ДН ТОМУ`,
    },
    emptyPre: "Принтери мовчать — ",
    emptyLink: "надішліть перший друк",
    emptyPost: ", і він з'явиться тут.",
    footer: "Оновлюється сама, коли команда студії просуває роботи. Шукаєте свою?",
    footerLink: "Мої замовлення →",
    openToast: (n) => `НАЖИВО · ${n} ${ukJobs(n)} У РОБОТІ`,
  },
  form: {
    eyebrow: "× ЗАМОВЛЕННЯ ДРУКУ ×",
    sections: { what: "ЩО ВИ РОБИТЕ?", file: "ВАШ ФАЙЛ", who: "ХТО ЦЕ СТВОРИВ?", you: "ПРО ВАС" },
    kinds: {
      "3d": {
        label: "3D-друк", tag: "3D", hint: ".STL · .3MF", title: "Розкажіть про свій 3D-друк",
        fileHint: "файл .stl або .3mf", choose: "Оберіть 3D-файл",
        pickToast: "3D-ДРУК · ДОДАЙТЕ .STL АБО .3MF", wrongFile: "ЦЕ НЕ 3D-ФАЙЛ — ЕКСПОРТУЙТЕ ЯК .STL АБО .3MF", missingFile: "ваш 3D-файл",
      },
      poster: {
        label: "Постер", tag: "ПОСТЕР", hint: "PDF · PNG · SVG", title: "Розкажіть про свій постер",
        fileHint: "У повному розмірі, як має бути надруковано", choose: "Оберіть макет",
        pickToast: "ПОСТЕР · ДРУК НА САМОКЛЕЙНОМУ ВІНІЛІ", wrongFile: "ТАКИЙ ФАЙЛ НЕ НАДРУКУЄТЬСЯ — ВИКОРИСТАЙТЕ PDF · PNG · SVG", missingFile: "ваш макет",
      },
      sticker: {
        label: "Наліпки", tag: "НАЛІПКИ", hint: "SVG · PNG · ЗА КОНТУРОМ", title: "Розкажіть про свої наліпки",
        fileHint: "SVG ріжеться найчистіше", choose: "Оберіть макет",
        pickToast: "НАЛІПКИ · ДРУК НА ВІНІЛІ, ПОТІМ РІЗАННЯ ЗА КОНТУРОМ", wrongFile: "ТАКИЙ ФАЙЛ НЕ НАДРУКУЄТЬСЯ — ВИКОРИСТАЙТЕ SVG · PNG", missingFile: "ваш макет",
      },
    },
    browse: "ОБРАТИ",
    swap: "ЗАМІНИТИ",
    attachedShort: (mb) => `${mb} МБ · торкніться, щоб замінити`,
    attachedToast: "ФАЙЛ ДОДАНО ✓ · ",
    svgTip: " · ПОРАДА: SVG РІЖЕТЬСЯ ЧИСТІШЕ",
    tooBig: "ФАЙЛ БІЛЬШИЙ ЗА 50 МБ — ЕКСПОРТУЙТЕ МЕНШИЙ",
    howMany: "СКІЛЬКИ",
    cut: "РІЗАННЯ",
    cuts: {
      contour: { label: "ЗА КОНТУРОМ", tip: "Вирізаємо впритул до контуру дизайну" },
      border: { label: "З РАМКОЮ", tip: "Невелика біла рамка навколо дизайну" },
      square: { label: "КВАДРАТ", tip: "Простий квадрат або прямокутник" },
    },
    colour: "КОЛІР",
    pointsQ: "БАЛИ ?",
    pointsTip: "Починаєте з 30 балів. Друк коштує 10. Власний дизайн повертає 20–30, коли готово. Шкільні проєкти безкоштовні. Знайдені файли нічого не заробляють.",
    origins: {
      mine: { label: "Я створив(ла) сам(а)", hint: "Змодельовано чи намальовано вами з нуля.", big: "×××", short: "Я зробив(ла)", cost: "−10 · ЗАРОБИ 20–30", pts: "КОШТУЄ 10 · ЗАРОБЛЯЄ 15–30", toast: "ВЛАСНИЙ ДИЗАЙН · КОШТУЄ 10, ПОВЕРТАЄ 15–30, КОЛИ ГОТОВО", tag: "ВЛАСНИЙ ДИЗАЙН" },
      school: { label: "Це для шкільного проєкту", hint: "Задав учитель — оберіть, для кого це.", big: "★", short: "Для вчителя", cost: "БЕЗКОШТОВНО", pts: "БЕЗКОШТОВНО · БЕЗ БАЛІВ", toast: "ШКІЛЬНИЙ ПРОЄКТ · БЕЗКОШТОВНО · ТЕПЕР ОБЕРІТЬ УЧИТЕЛЯ", tag: "ШКІЛЬНИЙ ПРОЄКТ" },
      found: { label: "Я знайшов(ла) це", hint: "Завантажено як є. Коштує бали, нічого не заробляє.", big: "↓", short: "Я знайшов(ла)", cost: "−10", pts: "КОШТУЄ 10 · ЗАРОБЛЯЄ 0", toast: "ЗНАЙДЕНО · КОШТУЄ 10, НІЧОГО НЕ ПОВЕРТАЄ · ДЯКУЄМО ЗА ЧЕСНІСТЬ", tag: "ЗНАЙДЕНО" },
    },
    teacherPlaceholder: "Для якого вчителя?",
    teacherToast: (name) => `ДЛЯ ${name.toUpperCase()} · БЕЗКОШТОВНИЙ ДРУК · МИ ПОВІДОМИМО`,
    points: "БАЛИ",
    namePlaceholder: "Ваше ім'я",
    emailPlaceholder: "Ваша KIS-пошта",
    missing: { name: "ваше ім'я", email: "вашу пошту", origin: "хто це створив", teacher: "учителя, для якого це" },
    stillNeeded: (list) => `Ще потрібно: ${list}.`,
    brokeLine: (b) => `Лише ${b} балів — попросіть студію про поповнення або оберіть «Для вчителя».`,
    readyLine3d: (file, color) => `✓ ${file}, колір ${color}`,
    readyLineVinyl: (qty, file) => `✓ ${qty} × ${file}`,
    readyFor: (teacher) => ` · для ${teacher}`,
    readyLeft: (left) => ` · залишиться ${left} балів`,
    sendIt: "НАДІСЛАТИ →",
    sendPaid: "НАДІСЛАТИ · −10 →",
    sendFree: "НАДІСЛАТИ · БЕЗКОШТОВНО →",
    notEnough: "НЕ ВИСТАЧАЄ БАЛІВ",
    notEnoughToast: "НЕ ВИСТАЧАЄ БАЛІВ · ПОПРОСІТЬ КОМАНДУ СТУДІЇ ПРО ПОПОВНЕННЯ",
    sending: "НАДСИЛАЄМО…",
    almost: (list) => `МАЙЖЕ — ДОДАЙТЕ ${list}`,
    sentSchool: (teacher) => `ЗАМОВЛЕННЯ НАДІСЛАНО ✓ · БЕЗКОШТОВНИЙ ШКІЛЬНИЙ ДРУК · ${teacher.toUpperCase()} ДІЗНАЄТЬСЯ`,
    sentMine: (lo, hi) => `ЗАМОВЛЕННЯ НАДІСЛАНО ✓ · −10 БАЛІВ · ПОВЕРНЕТЬСЯ ${lo}–${hi}, КОЛИ ГОТОВО`,
    sentFound: (left) => `ЗАМОВЛЕННЯ НАДІСЛАНО ✓ · −10 БАЛІВ · ЗАЛИШИЛОСЯ ${left}`,
    dbError: "БАЗА ДАНИХ НЕ НАЛАШТОВАНА — ЗВЕРНІТЬСЯ ДО ДИЗАЙН-СТУДІЇ",
    uploadFailed: "НЕ ВДАЛОСЯ ЗАВАНТАЖИТИ — ",
    recent: "Ваші останні замовлення",
    seeAll: "УСІ →",
    emptyUnder: (email) => `Поки нічого для ${email} — перше замовлення з'явиться тут одразу після надсилання.`,
    emptyNoEmail: "Введіть свою KIS-пошту у формі, і ваші відбитки з'являться тут.",
  },
  track: {
    eyebrow: "× МОЇ ЗАМОВЛЕННЯ ×",
    title: "Де мої відбитки?",
    email: "ВАША KIS-ПОШТА",
    help: "Введіть пошту, яку вказали в замовленні — список оновлюється під час введення. Пароль не потрібен.",
    stagesTitle: "ЩО ОЗНАЧАЮТЬ ЕТАПИ",
    glossary: [
      { term: "ОТРИМАНО", text: " — файл у нас і стоїть у черзі." },
      { term: "НАРІЗКА / ДРУК", text: " — готується або вже на верстаті." },
      { term: "РІЗАННЯ", text: " — наліпки й постери проходять через плотер." },
      { term: "ГОТОВО", text: " — приходьте забрати в Дизайн-студію.", ready: true },
    ],
    newRequest: "+ НОВЕ ЗАМОВЛЕННЯ",
    yourPrints: "Ваші відбитки",
    typeAbove: "ВВЕДІТЬ ПОШТУ ВИЩЕ",
    nudge: "ВВЕДІТЬ KIS-ПОШТУ, ЩОБ ПОБАЧИТИ СВОЇ ВІДБИТКИ",
    readyNotice: "Можна забрати в Дизайн-студії — візьміть учнівський квиток.",
    cancelled: (file) => `ЗАМОВЛЕННЯ СКАСОВАНО · ${file}`,
    refunded: " · 10 БАЛІВ ПОВЕРНУТО",
    cancelTitle: "Скасувати це замовлення",
    metaVinyl: "ВІНІЛ",
    metaCut: (cut) => uk.form.cuts[cut as PrintCut]?.label ?? cut.toUpperCase(),
    rushnyk: "ВАШ РУШНИК · YOUR RUSHNYK",
    level: (n) => `РІВЕНЬ ${n}`,
    pointsToSpend: "БАЛИ ДЛЯ ВИТРАТ",
    pending: "ОЧІКУЮТЬ",
    pendingTip: "Бали, які ви отримаєте, коли студія позначить ці відбитки ГОТОВО та оцінить їх",
    explainer: "Кожен друк коштує 10. Створюйте власні дизайни, щоб заробляти більше, ніж витрачаєте.",
    stitches: (n) => `${n} СТІБКІВ`,
    toNext: (n, rank) => `${n} ДО РІВНЯ ${rank.toUpperCase()}`,
    topRank: "НАЙВИЩИЙ РІВЕНЬ ✓",
    ownDesigns: "ВЛАСНИХ ДИЗАЙНІВ",
    schoolProjects: "ШКІЛЬНИХ ПРОЄКТІВ",
    found: "ЗНАЙДЕНО",
    bandStitched: (rank) => `Смуга «${rank}» · вишита`,
    bandLocked: (rank, min) => `Смуга «${rank}» · відкриється на ${min} стібках`,
    ranks: [
      { name: "Нитка", short: "НИТКА", blurb: "Усі починають з однієї нитки. Створіть і надрукуйте щось, щоб почати свій рушник." },
      { name: "Голка", short: "ГОЛКА", blurb: "Першу смугу вишито. Продовжуйте створювати — якість дає бонусні стібки." },
      { name: "Вишивальник", short: "ВИШИВАЛЬНИК", blurb: "Дві смуги позаду. Ви вже постійний гість Дизайн-студії." },
      { name: "Ткач", short: "ТКАЧ", blurb: "Візерунок на візерунку. Учителі помічають ткачів — запитайте про менторство молодших." },
      { name: "Майстер вишивки", short: "МАЙСТЕР", blurb: "Увесь рушник ваш. Ваше ім'я — на стіні біля принтерів." },
    ],
    chipOwn: "ВЛАСНИЙ ДИЗАЙН",
    chipFound: "ЗНАЙДЕНО",
    chipSchool: (teacher) => `ШКІЛЬНИЙ ПРОЄКТ · ${teacher.toUpperCase()} · БЕЗКОШТОВНО`,
    chipPending: "ОЧІКУЄ",
    chipFree: "БЕЗКОШТОВНО",
    tipSchool: "Безкоштовний друк для шкільного проєкту — бали не витрачено й не зароблено.",
    tipPaid: "Бали, повернуті за цей відбиток",
    tipPaidRated: "Бали, повернуті за цей відбиток · якість оцінила студія",
    tipPending: "Бали повернуться, коли студія позначить ГОТОВО та оцінить якість.",
    levelUp: (rank) => `НОВИЙ РІВЕНЬ ✓ · ВИ — ${rank.toUpperCase()} · НОВУ СМУГУ ВИШИТО`,
  },
  stages: {
    "3d": ["ОТРИМАНО", "НАРІЗКА", "ДРУК", "ГОТОВО"],
    vinyl: ["ОТРИМАНО", "ДРУК", "РІЗАННЯ", "ГОТОВО"],
  },
};

export const STRINGS: Record<Lang, Strings> = { en, uk };

export function stageNames(t: Strings, kind: PrintKind) {
  return kind === "3d" ? t.stages["3d"] : t.stages.vinyl;
}

/** Meta line under a job on the tracker: colour | qty × VINYL · cut. */
export function localizedMetaLine(r: PrintRequest, t: Strings, colorLabel: string) {
  if (r.kind === "3d") return colorLabel.toUpperCase();
  return `${r.qty} × ${t.track.metaVinyl}${r.cut ? ` · ${t.track.metaCut(r.cut)}` : ""}`;
}
