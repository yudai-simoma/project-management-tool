"use client";

/**
 * 全体ダッシュボード: GlobalHeader のビュー切替で「ダッシュボード」を選んだときに
 * Pane2〜4 のエリアを丸ごと差し替えて表示する、プロジェクト横断の俯瞰画面。
 */

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

import type { Member, Project, ProjectStatusKey } from "@/lib/schema";
import {
  type PortfolioMemberWorkload,
  type PortfolioProjectSummary,
  type PortfolioRiskLevel,
  type PortfolioTaskSummary,
  getPortfolioDashboardSummary,
} from "@/lib/computed/projects";
import {
  DEADLINE_RISK_LABEL,
  PORTFOLIO_DASHBOARD_TITLE,
  STATUS_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type PortfolioDashboardPaneProps = {
  projects: Project[];
  members: Member[];
  onOpenProject: (projectId: string) => void;
  onOpenTask: (projectId: string, taskId: string) => void;
};

const RISK_BADGE_VARIANT: Record<
  PortfolioRiskLevel,
  "destructive" | "warning" | "success"
> = {
  danger: "destructive",
  warning: "warning",
  success: "success",
};

const RISK_SURFACE_CLASS: Record<PortfolioRiskLevel, string> = {
  danger: "border-destructive/40 bg-destructive/5",
  warning: "border-chart-3/40 bg-chart-3/5",
  success: "border-chart-2/40 bg-chart-2/5",
};

const RISK_INTERACTIVE_CLASS: Record<PortfolioRiskLevel, string> = {
  danger: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
  warning: "border-chart-3/40 bg-chart-3/5 hover:bg-chart-3/10",
  success: "border-chart-2/40 bg-chart-2/5 hover:bg-chart-2/10",
};

export function PortfolioDashboardPane({
  projects,
  members,
  onOpenProject,
  onOpenTask,
}: PortfolioDashboardPaneProps) {
  const summary = useMemo(
    () => getPortfolioDashboardSummary(projects, members),
    [members, projects],
  );
  const progressRisk = getAverageProgressRisk(summary.averageProgress);

  const kpis: {
    label: string;
    value: number;
    suffix: string;
    riskLevel: PortfolioRiskLevel;
  }[] = [
    {
      label: "期限超過プロジェクト",
      value: summary.overdueProjectCount,
      suffix: "件",
      riskLevel: "danger" as const,
    },
    {
      label: "期限間近プロジェクト",
      value: summary.dueSoonProjectCount,
      suffix: "件",
      riskLevel: "warning" as const,
    },
    {
      label: "期限超過タスク",
      value: summary.overdueTaskCount,
      suffix: "件",
      riskLevel: "danger" as const,
    },
    {
      label: "期限間近タスク",
      value: summary.dueSoonTaskCount,
      suffix: "件",
      riskLevel: "warning" as const,
    },
    {
      label: "平均進捗",
      value: summary.averageProgress,
      suffix: "%",
      riskLevel: progressRisk,
    },
    {
      label: "未完了タスク",
      value: summary.openTaskCount,
      suffix: "件",
      riskLevel: summary.openTaskCount > 0 ? "warning" : "success",
    },
  ];

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {PORTFOLIO_DASHBOARD_TITLE}
        </h2>
      </header>
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => (
              <Card key={kpi.label} size="sm">
                <CardHeader>
                  <CardTitle>{kpi.label}</CardTitle>
                  <CardAction>
                    <RiskBadge riskLevel={kpi.riskLevel} />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-semibold text-foreground tabular-nums">
                      {kpi.value}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">
                      {kpi.suffix}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>プロジェクト一覧</CardTitle>
                <CardDescription>リスク順・期限順</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {summary.projectSummaries.map((projectSummary) => (
                    <ProjectRiskRow
                      key={projectSummary.project.id}
                      summary={projectSummary}
                      onOpen={() => onOpenProject(projectSummary.project.id)}
                    />
                  ))}
                  {summary.projectSummaries.length === 0 && (
                    <EmptyText>プロジェクトがありません</EmptyText>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>直近期限タスク</CardTitle>
                  <CardDescription>未完了・期限順</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {summary.upcomingTasks.map((taskSummary, index) => (
                      <TaskRiskRow
                        key={`${taskSummary.project.id}:${taskSummary.task.id}`}
                        summary={taskSummary}
                        showSeparator={index > 0}
                        onOpen={() =>
                          onOpenTask(
                            taskSummary.project.id,
                            taskSummary.task.id,
                          )
                        }
                      />
                    ))}
                    {summary.upcomingTasks.length === 0 && (
                      <EmptyText>期限つきの未完了タスクはありません</EmptyText>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>メンバー別ワークロード</CardTitle>
                  <CardDescription>担当中の未完了タスク</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {summary.memberWorkloads.map((workload) => (
                      <MemberWorkloadRow
                        key={workload.memberId}
                        workload={workload}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ステータス内訳</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.statusCounts).map(
                      ([status, count]) => (
                        <Badge key={status} variant="outline">
                          {STATUS_LABELS[status as ProjectStatusKey]} {count}
                        </Badge>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

function ProjectRiskRow({
  summary,
  onOpen,
}: {
  summary: PortfolioProjectSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col gap-3 rounded-lg border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        RISK_INTERACTIVE_CLASS[summary.riskLevel],
      )}
    >
      <span className="flex min-w-0 items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {summary.project.name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <RiskBadge
              riskLevel={summary.riskLevel}
              label={getProjectRiskLabel(summary)}
            />
            <Badge variant="outline" size="xs">
              {STATUS_LABELS[summary.project.status]}
            </Badge>
            <Badge variant="secondary" size="xs">
              期限 {summary.project.deadline || "未設定"}
            </Badge>
            <Badge variant="outline" size="xs">
              未完了 {summary.openTaskCount}
            </Badge>
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{summary.progress}%</span>
          <span className="tabular-nums">
            完了 {summary.doneCount}/{summary.totalCount}
          </span>
        </span>
        <Progress
          value={summary.progress}
          aria-label={`${summary.project.name}の進捗率 ${summary.progress}%`}
        />
      </span>
    </button>
  );
}

function TaskRiskRow({
  summary,
  showSeparator,
  onOpen,
}: {
  summary: PortfolioTaskSummary;
  showSeparator: boolean;
  onOpen: () => void;
}) {
  return (
    <>
      {showSeparator && <Separator />}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full flex-col gap-2 rounded-md border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          RISK_INTERACTIVE_CLASS[summary.riskLevel],
        )}
      >
        <span className="flex min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {summary.task.title}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {summary.project.name} / {summary.parentLabel}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <RiskBadge
            riskLevel={summary.riskLevel}
            label={DEADLINE_RISK_LABEL[summary.deadlineRisk]}
          />
          <Badge variant="outline" size="xs">
            期限 {summary.task.dueDate}
          </Badge>
          <Badge variant="secondary" size="xs">
            {summary.assigneeName}
          </Badge>
        </span>
      </button>
    </>
  );
}

function MemberWorkloadRow({
  workload,
}: {
  workload: PortfolioMemberWorkload;
}) {
  const riskLevel: PortfolioRiskLevel =
    workload.overdueTaskCount > 0
      ? "danger"
      : workload.dueSoonTaskCount > 0
        ? "warning"
        : "success";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border px-3 py-2.5",
        RISK_SURFACE_CLASS[riskLevel],
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {workload.memberName}
        </span>
        <RiskBadge riskLevel={riskLevel} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" size="xs">
          担当中 {workload.openTaskCount}
        </Badge>
        <Badge variant="destructive" size="xs">
          期限超過 {workload.overdueTaskCount}
        </Badge>
        <Badge variant="warning" size="xs">
          期限間近 {workload.dueSoonTaskCount}
        </Badge>
      </div>
    </div>
  );
}

function RiskBadge({
  riskLevel,
  label = getRiskLabel(riskLevel),
}: {
  riskLevel: PortfolioRiskLevel;
  label?: string;
}) {
  return (
    <Badge variant={RISK_BADGE_VARIANT[riskLevel]} size="xs">
      {label}
    </Badge>
  );
}

function EmptyText({ children }: { children: string }) {
  return (
    <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function getRiskLabel(riskLevel: PortfolioRiskLevel): string {
  if (riskLevel === "danger") return "危険";
  if (riskLevel === "warning") return "注意";
  return "順調";
}

function getProjectRiskLabel(summary: PortfolioProjectSummary): string {
  if (summary.riskLevel === "danger") return "期限超過";
  if (summary.riskLevel === "warning") return "期限間近";
  if (
    summary.project.status === "done" ||
    (summary.totalCount > 0 && summary.doneCount === summary.totalCount)
  ) {
    return "完了";
  }
  return DEADLINE_RISK_LABEL[summary.deadlineRisk];
}

function getAverageProgressRisk(progress: number): PortfolioRiskLevel {
  if (progress < 50) return "danger";
  if (progress < 80) return "warning";
  return "success";
}
