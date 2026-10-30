import type { PrintCut, PrintKind } from "@/lib/types";

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

export type Strings = {
  nav: { home: string; print: string; board: string };
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
    how: string;
    steps: { n: string; title: string; body: string }[];
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
    /** Inline 3D preview on a row. */
    view: string;
    close: string;
    viewer: { loading: string; failed: string; hint: string; over: (cm: number) => string };
  };
  form: {
    eyebrow: string;
    /** Small mono section labels (one continuous form, no step numbering). */
    sections: { what: string; file: string; you: string };
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
    namePlaceholder: string;
    /** Short hint under the name field — why we ask. */
    nameHint: string;
    missing: { name: string };
    stillNeeded: (list: string) => string;
    readyLine3d: (file: string, color: string) => string;
    readyLineVinyl: (qty: number, file: string) => string;
    sendIt: string;
    sending: string;
    almost: (list: string) => string;
    sent: string;
    dbError: string;
    uploadFailed: string;
    /** Side panel: what happens after sending, and where to watch it. */
    next: {
      title: string;
      lede: string;
      glossary: { term: string; text: string; ready?: boolean }[];
      board: string;
    };
  };
  stages: Record<"3d" | "vinyl", string[]>;
};

const en: Strings = {
  nav: { home: "HOME", print: "PRINT REQUEST", board: "ON THE PRINTERS" },
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
    how: "HOW IT WORKS · ЯК ЦЕ ПРАЦЮЄ",
    steps: [
      { n: "01", title: "Design it", body: "A 3D model (.STL/.3MF), or poster and sticker artwork (PDF, PNG, SVG)." },
      { n: "02", title: "Send the file", body: "Fill in the short request form. Pick a colour — or how many stickers." },
      { n: "03", title: "We make it", body: "3D prints go slicing → printing; vinyl goes printing → cutting. Watch it move along on the On the Printers board." },
      { n: "04", title: "Collect it", body: "The board shows READY when it's done. Pick up at the Design Studio." },
    ],
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
    lede: "Everything on the printers and cutters right now. First names only.",
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
    footer: "Updates on its own as the studio team moves jobs along. Yours shows up here the moment you send it.",
    footerLink: "Send a print →",
    openToast: (n) => `LIVE · ${n} JOBS ON THE GO`,
    view: "VIEW 3D",
    close: "CLOSE",
    viewer: {
      loading: "LOADING MODEL…",
      failed: "COULDN'T SHOW THIS FILE",
      hint: "DRAG TO SPIN · PINCH OR SCROLL TO ZOOM",
      over: (cm) => `OVER ${cm} CM`,
    },
  },
  form: {
    eyebrow: "× PRINT REQUEST ×",
    sections: { what: "WHAT ARE YOU MAKING?", file: "YOUR FILE", you: "YOUR NAME" },
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
    namePlaceholder: "First name and surname",
    nameHint: "Shown on the On the Printers board as first name and last initial.",
    missing: { name: "your name" },
    stillNeeded: (list) => `Still needed: ${list}.`,
    readyLine3d: (file, color) => `✓ ${file} in ${color}`,
    readyLineVinyl: (qty, file) => `✓ ${qty} × ${file}`,
    sendIt: "SEND IT →",
    sending: "SENDING…",
    almost: (list) => `ALMOST — ADD ${list}`,
    sent: "REQUEST SENT ✓ · WATCH IT ON THE PRINTERS",
    dbError: "DATABASE NOT CONFIGURED — ASK THE DESIGN STUDIO",
    uploadFailed: "UPLOAD FAILED — ",
    next: {
      title: "WHAT HAPPENS NEXT",
      lede: "Your request goes straight onto the public On the Printers board — no login, just look for your name. Changed your mind? Ask at the Design Studio.",
      glossary: [
        { term: "RECEIVED", text: " — we've got your file and it's in the queue." },
        { term: "SLICING / PRINTING", text: " — it's being prepared or is on the machine." },
        { term: "CUTTING", text: " — stickers and posters are going through the vinyl cutter." },
        { term: "READY", text: " — come and collect it from the Design Studio. Bring your student card.", ready: true },
      ],
      board: "SEE WHAT'S ON THE PRINTERS →",
    },
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
  nav: { home: "ГОЛОВНА", print: "ЗАМОВИТИ ДРУК", board: "НА ПРИНТЕРАХ" },
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
    how: "ЯК ЦЕ ПРАЦЮЄ · HOW IT WORKS",
    steps: [
      { n: "01", title: "Створіть дизайн", body: "3D-модель (.STL/.3MF) або макет постера чи наліпки (PDF, PNG, SVG)." },
      { n: "02", title: "Надішліть файл", body: "Заповніть коротку форму. Оберіть колір — або кількість наліпок." },
      { n: "03", title: "Ми виготовляємо", body: "3D-друк: нарізка → друк; вініл: друк → різання. Стежте за статусом на табло «На принтерах»." },
      { n: "04", title: "Заберіть", body: "На табло з'явиться ГОТОВО. Заберіть у Дизайн-студії." },
    ],
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
    lede: "Усе, що зараз на принтерах і різаках. Лише імена.",
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
    footer: "Оновлюється сама, коли команда студії просуває роботи. Ваше замовлення з'явиться тут одразу після надсилання.",
    footerLink: "Надіслати друк →",
    openToast: (n) => `НАЖИВО · ${n} ${ukJobs(n)} У РОБОТІ`,
    view: "3D-ПЕРЕГЛЯД",
    close: "ЗАКРИТИ",
    viewer: {
      loading: "ЗАВАНТАЖУЄМО МОДЕЛЬ…",
      failed: "НЕ ВДАЛОСЯ ПОКАЗАТИ ФАЙЛ",
      hint: "ТЯГНІТЬ, ЩОБ ОБЕРТАТИ · ЩИПОК АБО СКРОЛ — МАСШТАБ",
      over: (cm) => `БІЛЬШЕ ${cm} СМ`,
    },
  },
  form: {
    eyebrow: "× ЗАМОВЛЕННЯ ДРУКУ ×",
    sections: { what: "ЩО ВИ РОБИТЕ?", file: "ВАШ ФАЙЛ", you: "ВАШЕ ІМ'Я" },
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
    namePlaceholder: "Ім'я та прізвище",
    nameHint: "На табло «На принтерах» показуємо ім'я та першу літеру прізвища.",
    missing: { name: "ваше ім'я" },
    stillNeeded: (list) => `Ще потрібно: ${list}.`,
    readyLine3d: (file, color) => `✓ ${file}, колір ${color}`,
    readyLineVinyl: (qty, file) => `✓ ${qty} × ${file}`,
    sendIt: "НАДІСЛАТИ →",
    sending: "НАДСИЛАЄМО…",
    almost: (list) => `МАЙЖЕ — ДОДАЙТЕ ${list}`,
    sent: "ЗАМОВЛЕННЯ НАДІСЛАНО ✓ · СТЕЖТЕ НА ТАБЛО «НА ПРИНТЕРАХ»",
    dbError: "БАЗА ДАНИХ НЕ НАЛАШТОВАНА — ЗВЕРНІТЬСЯ ДО ДИЗАЙН-СТУДІЇ",
    uploadFailed: "НЕ ВДАЛОСЯ ЗАВАНТАЖИТИ — ",
    next: {
      title: "ЩО ДАЛІ",
      lede: "Замовлення одразу з'являється на спільному табло «На принтерах» — без входу, просто знайдіть своє ім'я. Передумали? Зверніться до Дизайн-студії.",
      glossary: [
        { term: "ОТРИМАНО", text: " — файл у нас і стоїть у черзі." },
        { term: "НАРІЗКА / ДРУК", text: " — готується або вже на верстаті." },
        { term: "РІЗАННЯ", text: " — наліпки й постери проходять через плотер." },
        { term: "ГОТОВО", text: " — приходьте забрати в Дизайн-студію. Візьміть учнівський квиток.", ready: true },
      ],
      board: "ЩО ЗАРАЗ НА ПРИНТЕРАХ →",
    },
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
