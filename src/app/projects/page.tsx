export const dynamic = "force-dynamic";

import { ProjectsClient } from "@/components/ProjectsClient";
import {
  getStudentProjectById,
  getStudentProjectsByEmail,
} from "@/lib/data";
import { publicProject } from "@/lib/projects";
import { getTeacherPortalEmail } from "@/lib/teacher-portal";

type PageProps = {
  searchParams: Promise<{ share?: string; edit?: string }>;
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const email = await getTeacherPortalEmail();

  const shareId = sp.share?.trim() || null;
  const editRaw = sp.edit?.trim() || null;

  if (editRaw) {
    const dot = editRaw.indexOf(".");
    const projectId = dot > 0 ? editRaw.slice(0, dot) : editRaw;
    const key = dot > 0 ? editRaw.slice(dot + 1) : "";
    const raw = await getStudentProjectById(projectId);
    const canEdit = !!(raw?.editKey && key && raw.editKey === key);
    return (
      <ProjectsClient
        signedInEmail={email}
        initialProjects={[]}
        link={{
          kind: "edit",
          projectId,
          editKey: canEdit ? key : null,
          canEdit,
          project: raw ? publicProject(raw) : null,
        }}
      />
    );
  }

  if (shareId) {
    const raw = await getStudentProjectById(shareId);
    return (
      <ProjectsClient
        signedInEmail={email}
        initialProjects={[]}
        link={{
          kind: "share",
          projectId: shareId,
          editKey: null,
          canEdit: false,
          project: raw ? publicProject(raw) : null,
        }}
      />
    );
  }

  const projects = email
    ? (await getStudentProjectsByEmail(email)).map(publicProject)
    : [];

  return (
    <ProjectsClient
      signedInEmail={email}
      initialProjects={projects}
      link={null}
    />
  );
}
