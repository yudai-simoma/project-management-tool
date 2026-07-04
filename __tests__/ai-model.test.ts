import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_AI_PROVIDER_ID,
  parseAiProviderId,
} from "@/lib/ai/model-config";
import { getAiModelConfig } from "@/lib/ai/model";

const ORIGINAL_AI_PROVIDER = process.env.AI_PROVIDER;
const ORIGINAL_AI_MODEL_ID = process.env.AI_MODEL_ID;
const ORIGINAL_GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID;

afterEach(() => {
  process.env.AI_PROVIDER = ORIGINAL_AI_PROVIDER;
  process.env.AI_MODEL_ID = ORIGINAL_AI_MODEL_ID;
  process.env.GEMINI_MODEL_ID = ORIGINAL_GEMINI_MODEL_ID;
});

describe("parseAiProviderId", () => {
  it("未指定 provider は既定の gemini に倒す", () => {
    expect(parseAiProviderId(undefined)).toBe(DEFAULT_AI_PROVIDER_ID);
  });

  it("未対応 provider は null を返す", () => {
    expect(parseAiProviderId("openai")).toBeNull();
  });
});

describe("getAiModelConfig", () => {
  it("AI_MODEL_ID を優先してモデルを切り替える", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_MODEL_ID = "gemini-2.5-flash";
    process.env.GEMINI_MODEL_ID = "gemini-2.0-flash";

    expect(getAiModelConfig()).toEqual({
      provider: "gemini",
      id: "gemini-2.5-flash",
      maxContextTokens: 1_048_576,
    });
  });

  it("後方互換として GEMINI_MODEL_ID も読める", () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.AI_MODEL_ID;
    process.env.GEMINI_MODEL_ID = "gemini-2.0-flash";

    expect(getAiModelConfig()).toEqual({
      provider: "gemini",
      id: "gemini-2.0-flash",
      maxContextTokens: 1_048_576,
    });
  });

  it("未対応 provider が指定された場合は明示的に失敗する", () => {
    process.env.AI_PROVIDER = "openai";

    expect(() => getAiModelConfig()).toThrow(/Unsupported AI_PROVIDER/);
  });
});
