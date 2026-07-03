"use client";

import type { TaskProgressSummary } from "@/lib/computed/projects";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";

export function TaskProgressBar({
  title,
  summary,
}: {
  title: string;
  summary: TaskProgressSummary;
}) {
  return (
    <Progress
      value={summary.percent}
      aria-label={`${title}の進捗率 ${summary.percent}%`}
    >
      <ProgressLabel>進捗</ProgressLabel>
      <ProgressValue>{() => `${summary.percent}%`}</ProgressValue>
    </Progress>
  );
}
