import "@testing-library/jest-dom/vitest";

// jsdom は `window.matchMedia` を実装していない。`hooks/use-mobile.ts`
// （shadcn Sidebar が使用）が呼び出すため、テスト環境向けに最小限のスタブを用意する。
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom は `ResizeObserver` を実装していない。Tabs（base-ui、アクティブタブの
// 位置計算に使用）等が参照するため、テスト環境向けに no-op スタブを用意する。
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom は `Element.prototype.getAnimations` を実装していない。
// `components/ui/scroll-area.tsx`（base-ui）がスクロールバーの自動非表示演出に
// 使用するため、テスト環境向けに no-op スタブを用意する。
if (
  typeof Element !== "undefined" &&
  typeof Element.prototype.getAnimations !== "function"
) {
  Element.prototype.getAnimations = () => [];
}
