import { describe, expect, it, vi, vitest } from "vitest";

import type { CruxApi, OnEffect, Request } from "./types.js";
import { wrap, type Serializer } from "./wrapper.js";

function serialize(entity: object) {
  const str = JSON.stringify(entity);
  const buffer = new TextEncoder().encode(str).buffer;
  return new Uint8Array(buffer);
}

/* eslint-disable @typescript-eslint/no-unsafe-return */
function deserialize(data: Uint8Array) {
  const str = new TextDecoder().decode(data);
  return JSON.parse(str);
}

const serializer: Serializer<object, Request> = {
  serialize,
  deserializeEffects: deserialize,
  deserializeView: deserialize,
};

class CruxEntity {
  serialize() {}
}
class Event extends CruxEntity {}
class Response extends CruxEntity {}
class Effect extends CruxEntity {
  constructor(public value: CruxEntity = new CruxEntity()) {
    super();
  }
}

const api: CruxApi = {
  view() {
    return serialize({});
  },
  process_event: () => {
    return serialize([]);
  },
  handle_response: () => {
    return serialize([]);
  },
};

const init = () => Promise.resolve(api);

describe("crux wrapper", () => {
  it("should throw if core has not been initialized", () => {
    const crux = wrap({ init, onEffect: vitest.fn(), serializer });
    expect(() => crux.send(new Event())).toThrowError(
      "Core not initialized. Call init() first.",
    );
  });

  it("forwards effects triggered by an event", async () => {
    const onEffect = vitest.fn().mockResolvedValue(undefined);
    const nbEffects = Math.floor(1 + Math.random() * 100);
    const effects = Array.from({ length: nbEffects }).map((_, i) => {
      return { id: i, effect: new Effect() };
    });
    vitest.spyOn(api, "process_event").mockResolvedValue(serialize(effects));
    const crux = wrap({ init, onEffect, serializer, log: true });
    await crux.init();

    await crux.send(new Event());
    expect(crux.logs).toHaveLength(nbEffects + 1); // all the effects + the initial event
    expect(crux.logs[0]).toEqual(
      expect.objectContaining({ type: "event", name: "Event" }),
    );
    expect(onEffect).toHaveBeenCalledTimes(nbEffects);
  });

  it("sends responses back to the crux api", async () => {
    const effects = [
      { id: 0, effect: new Effect() },
      { id: 1, effect: new Effect() },
    ];
    const onEffect = vitest.fn().mockResolvedValue(new Response());
    vitest.spyOn(api, "process_event").mockResolvedValue(serialize(effects));
    vitest.spyOn(api, "handle_response");
    const crux = wrap({ init, onEffect, serializer, log: true });

    await crux.init();
    await crux.send(new Event());
    expect(api.handle_response).toHaveBeenCalledTimes(effects.length);
    expect(crux.logs).toHaveLength(effects.length + 1); // all the effect + the initial event
    expect(crux.logs[1]).toEqual(
      expect.objectContaining({
        type: "effect",
        name: "Object",
      }),
    );
    expect(crux.logs[2]).toEqual(
      expect.objectContaining({
        type: "effect",
        name: "Object",
      }),
    );
  });

  it("allows streamins responses back", async () => {
    const streamEffect = { id: 0, effect: new Effect() };
    vi.useFakeTimers();
    const onEffect = vitest.fn(((_effect, { respond }) => {
      setInterval(() => {
        void respond(new Response());
      }, 100);
      return Promise.resolve(undefined);
    }) as OnEffect<unknown>);
    vitest
      .spyOn(api, "process_event")
      .mockResolvedValue(serialize([streamEffect]));
    vitest.spyOn(api, "handle_response");
    const crux = wrap({ init, onEffect, serializer, log: true });

    await crux.init();
    await crux.send(new Event());
    expect(api.handle_response).toHaveBeenCalledTimes(0); // at this point, no response has been sent yet
    expect(crux.logs).toHaveLength(2); // the streaming effect + the initial event
    expect(crux.logs[1]).toEqual(
      expect.objectContaining({
        type: "effect",
        name: "Object",
      }),
    );

    // We send one stream response
    await vi.runOnlyPendingTimersAsync();
    expect(api.handle_response).toHaveBeenCalledTimes(1); // we should have sent one response
    expect(crux.logs).toHaveLength(3); // the streaming effect + the initial event + the response
    expect(crux.logs[2]).toEqual(
      expect.objectContaining({
        type: "response",
        name: "Response",
      }),
    );

    // We send another stream response
    await vi.runOnlyPendingTimersAsync();
    expect(api.handle_response).toHaveBeenCalledTimes(2); // we should have sent one response
    expect(crux.logs).toHaveLength(4); // the streaming effect + the initial event + the response
    expect(crux.logs[3]).toEqual(
      expect.objectContaining({
        type: "response",
        name: "Response",
      }),
    );
  });
});
