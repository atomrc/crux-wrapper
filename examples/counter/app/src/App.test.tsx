import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "./App";
import { render, act, waitFor } from "@testing-library/react";

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    document.body.innerHTML = "";
  });

  it("should increment and decrement when buttons are clicked", async () => {
    const { getByText, unmount } = render(<App />);

    await waitFor(() => getByText("Welcome"));

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
    unmount();
  });

  it("should increment by 10 every second", async () => {
    const { getByText, container, unmount } = render(<App />);

    await waitFor(() => getByText("Welcome"));
    expect(getByText("0")).toBeDefined();

    vi.advanceTimersToNextTimer();
    await waitFor(() => {
      expect(getByText("10")).toBeDefined();
    });

    vi.advanceTimersToNextTimer();
    await waitFor(() => {
      expect(getByText("20")).toBeDefined();
    });

    unmount();
  });
});
