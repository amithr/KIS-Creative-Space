import { STUDENT_NAME_SESSION_KEY } from "@/lib/prints";

/**
 * The student's name, remembered for the tab session so the form is prefilled
 * for a second request. sessionStorage on purpose: shared school laptops
 * must not carry one student's name over to the next.
 */
export function readStudentName(): string {
  try {
    return sessionStorage.getItem(STUDENT_NAME_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStudentName(name: string) {
  try {
    const v = name.trim();
    if (v) sessionStorage.setItem(STUDENT_NAME_SESSION_KEY, v);
    else sessionStorage.removeItem(STUDENT_NAME_SESSION_KEY);
  } catch {
    // Private mode / blocked storage — the page still works.
  }
}
