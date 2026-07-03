import { describe, expect, it, vi } from "vitest";

import { insertAt, removeById, runOptimistic } from "@/lib/optimistic";

describe("runOptimistic", () => {
  it("成功時はロールバックを呼ばない", async () => {
    const rollback = vi.fn();
    runOptimistic(() => Promise.resolve("ok"), rollback);
    await new Promise((r) => setTimeout(r, 0));
    expect(rollback).not.toHaveBeenCalled();
  });

  it("失敗時はロールバックを呼び、console.error に記録する", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rollback = vi.fn();
    runOptimistic(() => Promise.reject(new Error("network error")), rollback);
    await new Promise((r) => setTimeout(r, 0));
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("removeById / insertAt", () => {
  type Item = { id: string; name: string };

  it("id一致の要素を取り除き、位置と要素を返す", () => {
    let state: Item[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const setState = (updater: Item[] | ((prev: Item[]) => Item[])) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };

    const removed = removeById(setState, "b");

    expect(removed).toEqual({ item: { id: "b", name: "B" }, index: 1 });
    expect(state).toEqual([
      { id: "a", name: "A" },
      { id: "c", name: "C" },
    ]);
  });

  it("見つからない場合はnullを返し、stateを変更しない", () => {
    let state: Item[] = [{ id: "a", name: "A" }];
    const setState = (updater: Item[] | ((prev: Item[]) => Item[])) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };

    const removed = removeById(setState, "none");

    expect(removed).toBeNull();
    expect(state).toEqual([{ id: "a", name: "A" }]);
  });

  it("insertAt で元の位置に戻せる（removeById のロールバック用途）", () => {
    let state: Item[] = [
      { id: "a", name: "A" },
      { id: "c", name: "C" },
    ];
    const setState = (updater: Item[] | ((prev: Item[]) => Item[])) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };

    insertAt(setState, 1, { id: "b", name: "B" });

    expect(state).toEqual([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ]);
  });
});
