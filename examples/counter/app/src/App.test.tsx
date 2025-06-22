import { describe, it, expect } from "vitest";
import { App } from "./App";
import { render, act, waitFor } from "@testing-library/react";

describe("App", () => {
  it("should be defined", async () => {
    const { getByText } = render(<App />);
    const button = getByText("+");

    act(() => button.click());

    await waitFor(() => {
      expect(getByText("1")).toBeDefined();
    });
  });
});
