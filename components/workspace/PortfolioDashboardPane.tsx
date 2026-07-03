"use client";

/**
 * 全体ダッシュボード: GlobalHeader のビュー切替で「ダッシュボード」を選んだときに
 * Pane2〜4 のエリアを丸ごと差し替えて表示する、カテゴリ横断のポートフォリオ俯瞰画面。
 *
 * 表示内容はステータス別プロジェクト件数のみ（ヒアリングで確定したスコープ）。
 * `docs/mock-implementation-plan.md` §10 の設計方針に基づく実装。
 */

import { type Project, STATUS_ORDER } from "@/lib/schema";
import { PORTFOLIO_DASHBOARD_TITLE, STATUS_LABELS } from "@/lib/labels";
import { getStatusCounts } from "@/lib/computed/projects";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PortfolioDashboardPane({ projects }: { projects: Project[] }) {
  const counts = getStatusCounts(projects);

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {PORTFOLIO_DASHBOARD_TITLE}
        </h2>
      </header>
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <p className="text-sm text-muted-foreground">
            すべてのプロジェクトを対象に、ステータス別の件数を表示します。
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATUS_ORDER.map((status) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle>{STATUS_LABELS[status]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums text-foreground">
                    {counts[status]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
