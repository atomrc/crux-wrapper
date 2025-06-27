import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "./App";
import { render, act, waitFor } from "@testing-library/react";

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    document.body.innerHTML = "";
  });

  it("should increment when increment is clicked", async () => {
    const { getByText } = render(<App />);
    const inc = getByText("+");

    act(() => inc.click());

    await waitFor(() => {
      expect(getByText("1")).toBeDefined();
    });

    const dec = getByText("-");

    act(() => dec.click());

    await waitFor(() => {
      expect(getByText("0")).toBeDefined();
    });
  });
});
