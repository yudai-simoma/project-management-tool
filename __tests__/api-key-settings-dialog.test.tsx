import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/ai-client", () => ({
  fetchApiKeyStatus: vi.fn(async () => ({
    configured: false,
    modelId: "gemini-2.5-flash",
  })),
  saveApiKeyApi: vi.fn(async () => ({
    configured: true,
    modelId: "gemini-2.5-flash",
  })),
  clearApiKeyApi: vi.fn(async () => ({
    configured: false,
    modelId: "gemini-2.5-flash",
  })),
}));

import { ApiKeySettingsDialog } from "@/components/workspace/ApiKeySettingsDialog";
import { fetchApiKeyStatus, saveApiKeyApi } from "@/lib/api/ai-client";

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

  it("APIキー保存時に選択中のモデルIDも保存する", async () => {
    render(<ApiKeySettingsDialog open onOpenChange={vi.fn()} />);

    await screen.findByText(/未設定です/);
    fireEvent.change(screen.getByLabelText("APIキー"), {
      target: { value: "AIza-xxx" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(saveApiKeyApi).toHaveBeenCalledWith({
        apiKey: "AIza-xxx",
        modelId: "gemini-2.5-flash",
      });
    });
  });
});
