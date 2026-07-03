import { Workspace } from "@/components/workspace/Workspace";
import categoriesData from "@/data/categories.json";
import membersData from "@/data/members.json";
import projectsData from "@/data/projects.json";
import workspaceData from "@/data/workspace.json";
import {
  categoriesSchema,
  membersSchema,
  projectsSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const categoriesResult = categoriesSchema.safeParse(categoriesData);
  const membersResult = membersSchema.safeParse(membersData);
  const projectsResult = projectsSchema.safeParse(projectsData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (
    !categoriesResult.success ||
    !membersResult.success ||
    !projectsResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !categoriesResult.success &&
        `categories.json: ${categoriesResult.error.issues[0]?.message}`,
      !membersResult.success &&
        `members.json: ${membersResult.error.issues[0]?.message}`,
      !projectsResult.success &&
        `projects.json: ${projectsResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialCategories={categoriesResult.data}
      initialMembers={membersResult.data}
      initialProjects={projectsResult.data}
      workspace={wsResult.data}
    />
  );
}
