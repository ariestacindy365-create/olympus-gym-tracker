import { redirect } from "next/navigation";

// Movements are added from the program editor now; the member log list
// fills itself from the program, so this page is gone.
export default function CoachExercisesPage() {
  redirect("/coach/programs");
}
