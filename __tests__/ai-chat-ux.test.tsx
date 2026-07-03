import { useState, type Dispatch, type SetStateAction } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  ProjectDetailPane,
  type ProjectAiChatMessage,
  type ProjectAiChatModel,
} from "@/components/workspace/ProjectDetailPane";
import { AI_CHAT_GREETING } from "@/lib/labels";
import type { Member, Pane4Tab, Project } from "@/lib/schema";

vi.mock("@/lib/api/ai-client", () => ({
  sendAiChatMessage: vi.fn(),
}));

import { sendAiChatMessage } from "@/lib/api/ai-client";

const members: Member[] = [{ id: "m-1", name: "佐藤 健太", role: "owner" }];

const projects: Project[] = [
  {
    id: "p-1",
    name: "プロジェクト1",
    categoryId: "cat-1",
    status: "planning",
    deadline: "",
    tasks: [],
  },
  {
    id: "p-2",
    name: "プロジェクト2",
    categoryId: "cat-1",
    status: "planning",
    deadline: "",
    tasks: [],
  },
];

const defaultModel: ProjectAiChatModel = {
  id: "gemini-flash-latest",
  maxContextTokens: 1_000,
};

function greeting(): ProjectAiChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    kind: "text",
    content: AI_CHAT_GREETING,
  };
}

function Harness({
  initialSelectedProjectId = "p-1",
  initialChats = {},
}: {
  initialSelectedProjectId?: string;
  initialChats?: Record<string, ProjectAiChatMessage[]>;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialSelectedProjectId,
  );
  const [pane4Tab, setPane4Tab] = useState<Pane4Tab>("ai");
  const [chats, setChats] =
    useState<Record<string, ProjectAiChatMessage[]>>(initialChats);
  const [usageTotals, setUsageTotals] = useState<Record<string, number>>({});
  const [models, setModels] = useState<Record<string, ProjectAiChatModel>>({});
  const project = projects.find((p) => p.id === selectedProjectId)!;
  const messages = chats[selectedProjectId] ?? [greeting()];

  const updateMessages: Dispatch<SetStateAction<ProjectAiChatMessage[]>> = (
    updater,
  ) => {
    setChats((prev) => {
      const current = prev[selectedProjectId] ?? [greeting()];
      return {
        ...prev,
        [selectedProjectId]:
          typeof updater === "function" ? updater(current) : updater,
      };
    });
  };

  return (
    <div>
      <button type="button" onClick={() => setSelectedProjectId("p-1")}>
        p1
      </button>
      <button type="button" onClick={() => setSelectedProjectId("p-2")}>
        p2
      </button>
      <ProjectDetailPane
        selectedProjectId={selectedProjectId}
        project={project}
        categoryName="プロダクト開発"
        members={members}
        aiMessages={messages}
        aiTokenUsageTotal={usageTotals[selectedProjectId] ?? 0}
        aiModel={models[selectedProjectId] ?? defaultModel}
        selectedDetail={null}
        scrollAnchor={null}
        onScrollAnchorConsumed={vi.fn()}
        onAiMessagesChange={updateMessages}
        onAiUsageReceived={(usage, model) => {
          setModels((prev) => ({ ...prev, [selectedProjectId]: model }));
          setUsageTotals((prev) => ({
            ...prev,
            [selectedProjectId]:
              (prev[selectedProjectId] ?? 0) + (usage?.totalTokens ?? 0),
          }));
        }}
        onClearAiChat={() => {
          setChats((prev) => ({ ...prev, [selectedProjectId]: [] }));
          setUsageTotals((prev) => ({ ...prev, [selectedProjectId]: 0 }));
        }}
        onUpdateTaskField={vi.fn()}
        onToggleTaskDone={vi.fn()}
        onDeleteTask={vi.fn()}
        onAddTask={vi.fn()}
        canManageOrg={false}
        currentUserId="user-1"
        pane4Open
        onTogglePane4={vi.fn()}
        pane4Tab={pane4Tab}
        onPane4TabChange={setPane4Tab}
      />
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendAiChatMessage).mockResolvedValue({
    source: "gemini",
    reply: { kind: "text", content: "了解です。" },
    actions: [],
    usage: { inputTokens: 90, outputTokens: 10, totalTokens: 100 },
    model: defaultModel,
  });
});

describe("AIチャットUX", () => {
  it("plain Enterでは送信せず、Command/Ctrl+Enterで送信する", async () => {
    render(<Harness />);

    const textarea = screen.getByLabelText("AIアシスタントへのメッセージ");
    fireEvent.change(textarea, { target: { value: "タスクを洗い出して" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });

    await screen.findByText("了解です。");
    expect(sendAiChatMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/100 \/ 1,000 トークン/)).toBeInTheDocument();
  });

  it("クリアボタンで該当プロジェクトの履歴だけを空にする", () => {
    render(
      <Harness
        initialChats={{
          "p-1": [
            greeting(),
            { id: "u-1", role: "user", kind: "text", content: "p1履歴" },
          ],
          "p-2": [
            greeting(),
            { id: "u-2", role: "user", kind: "text", content: "p2履歴" },
          ],
        }}
      />,
    );

    expect(screen.getByText("p1履歴")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "クリア" }));
    expect(screen.queryByText("p1履歴")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "p2" }));
    expect(screen.getByText("p2履歴")).toBeInTheDocument();
  });

  it("プロジェクトを切り替えてもチャット履歴を保持する", async () => {
    render(<Harness />);

    const textarea = screen.getByLabelText("AIアシスタントへのメッセージ");
    fireEvent.change(textarea, { target: { value: "p1で相談" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(sendAiChatMessage).toHaveBeenCalledTimes(1));
    expect(screen.getByText("p1で相談")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "p2" }));
    expect(screen.queryByText("p1で相談")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "p1" }));
    expect(screen.getByText("p1で相談")).toBeInTheDocument();
  });
});
