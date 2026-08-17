import { redirect } from "next/navigation";

/** Book Ahead unified flow was superseded by three-week Schedule + Training. */
export default function BookPage() {
  redirect("/schedule");
}
