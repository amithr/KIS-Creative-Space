import { STUDENT_EMAIL_SESSION_KEY } from "@/lib/prints";

const IDENTITY_KEY = "kis-student-identity";

export type StudentIdentity = { name: string; email: string; grade: string };

/** Email remembered for the tab session (prototype: `kis-student-email`). */
export function readStudentEmail(): string {
  try {
    return sessionStorage.getItem(STUDENT_EMAIL_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStudentEmail(email: string) {
  try {
    const v = email.trim();
    if (v) sessionStorage.setItem(STUDENT_EMAIL_SESSION_KEY, v);
    else sessionStorage.removeItem(STUDENT_EMAIL_SESSION_KEY);
  } catch {
    // Private mode / blocked storage — the page still works.
  }
}

export function readStudentIdentity(): Partial<StudentIdentity> {
  try {
    const raw = sessionStorage.getItem(IDENTITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StudentIdentity>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStudentIdentity(id: StudentIdentity) {
  try {
    sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
  } catch {
    // ignore
  }
}
