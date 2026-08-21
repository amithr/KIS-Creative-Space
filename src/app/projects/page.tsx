export const dynamic = "force-dynamic";

import { ProjectsClient } from "@/components/ProjectsClient";
import {
  getStudentProjectsByEmail,
} from "@/lib/data";
import { getTeacherPortalEmail } from "@/lib/teacher-portal";

export default async function ProjectsPage() {
  const email = await getTeacherPortalEmail();
  const projects = email ? await getStudentProjectsByEmail(email) : [];

  return (
    <ProjectsClient signedInEmail={email} initialProjects={projects} />
  );
}
