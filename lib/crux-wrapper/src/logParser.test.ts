import { describe, expect, it } from "vitest";
import { nestResponses } from "./logParser.js";
import type { LogEntry } from "./wrapper.js";

const logs = [
  {
    id: "45",
    name: "_StreamOperationVariantStart",
    at: 106,
    type: "effect",
    time: 0,
  },
  {
    id: "3b1",
    name: "_StreamOperationVariantStart",
    at: 106,
    type: "effect",
    time: 0,
  },
  {
    id: "101",
    name: "_StreamReponseVariantData",
    at: 5108,
    type: "response",
    to: "3b1",
  },
  {
    id: "318",
    name: "_RenderOperation",
    at: 5123,
    type: "effect",
    time: 0,
  },
  {
    id: "2c3",
    name: "_StreamReponseVariantData",
    at: 10111,
    type: "response",
    to: "3b1",
  },
  {
    id: "2f5",
    name: "_RenderOperation",
    at: 10140,
    type: "effect",
    time: 1,
  },
  {
    id: "2fa",
    name: "_StreamReponseVariantData",
    at: 15121,
    type: "response",
    to: "3b1",
  },
  {
    id: "3e1",
    name: "_RenderOperation",
    at: 15131,
    type: "effect",
    time: 0,
  },
  {
    id: "ad",
    name: "_StreamReponseVariantData",
    at: 20126,
    type: "response",
    to: "3b1",
  },
  {
    id: "365",
    name: "_RenderOperation",
    at: 20135,
    type: "effect",
    time: 2,
  },
  {
    id: "28a",
    name: "_StreamReponseVariantData",
    at: 25127,
    type: "response",
    to: "3b1",
  },
  {
    id: "31d",
    name: "_RenderOperation",
    at: 25133,
    type: "effect",
    time: 1,
  },
] satisfies LogEntry[];

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const copy = JSON.parse(JSON.stringify(logs));

describe("logParser", () => {
  it("should extract info from events", () => {
    const result = nestResponses(logs);
    expect(result).toHaveLength(7);
    // We expect all the responses to have been nested into the corresponding effect log
    expect(result.find((log) => log.type === "response")).toBeUndefined();
    // We check that the initial logs has not been tempered
    expect(logs).toEqual(copy);
  });
});
