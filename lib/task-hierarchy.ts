export const DEFAULT_LARGE_TASK_TITLE = "未分類";

export function getDefaultLargeTaskId(projectId: string): string {
  return `default-large-${projectId}`;
}
