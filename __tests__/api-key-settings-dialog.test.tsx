import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/api/ai-client", () => ({
  fetchApiKeyStatus: vi.fn(async () => ({ configured: false })),
  saveApiKeyApi: vi.fn(),
  clearApiKeyApi: vi.fn(),
}));

import { ApiKeySettingsDialog } from "@/components/workspace/ApiKeySettingsDialog";
import { fetchApiKeyStatus } from "@/lib/api/ai-client";

describe("ApiKeySettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("発行方法ボタンで Gemini APIキーの取得手順を表示する", async () => {
    render(<ApiKeySettingsDialog open onOpenChange={vi.fn()} />);

    expect(fetchApiKeyStatus).toHaveBeenCalled();
    expect(
      screen.queryByText("Gemini APIキーの発行手順"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "発行方法" }));

    expect(screen.getByText("Gemini APIキーの発行手順")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Google AI Studio を開く" }),
    ).toHaveAttribute("href", "https://aistudio.google.com/app/apikey");
  });
});
