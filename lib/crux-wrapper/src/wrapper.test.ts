import { describe, expect, it, vi, vitest } from "vitest";

import type { CruxApi, Serializer } from "./types";
import { createSerializer, wrap, type SerializerConfig } from "./wrapper";

class BincodeSerializer {
  constructor() {}
  getBytes() {
    const str = JSON.stringify(this.entity);
    const buffer = new TextEncoder().encode(str).buffer;
    return new Uint8Array(buffer);
  }
}

class BincodeDeserializer {
  constructor(private bytes: Uint8Array) {}
  deserializeLen(): number {
    return 0;
    const str = JSON.stringify(this.entity);
    const buffer = new TextEncoder().encode(str).buffer;
    return new Uint8Array(buffer);
  }
}

class Request {
  constructor(
    public id: number,
    public effect: any,
  ) {}
  static deserialize(ds: any) {
    return null;
  }
}

class ViewModel {
  constructor() {}
  static deserialize(ds: any) {
    return null;
  }
}

const serializerConfig: SerializerConfig<unknown, unknown> = {
  BincodeSerializer,
  BincodeDeserializer,
  ViewModel,
  Request,
};

class CruxEntity {
  serialize() {}
}
class Event extends CruxEntity {}
class Response extends CruxEntity {}
class Effect extends CruxEntity {}

const api: CruxApi = {
  async view() {
    return new Uint8Array();
  },
  process_event: async () => {
    return new Uint8Array();
  },
  handle_response: async () => {
    return new Uint8Array();
  },
};

describe("crux wrapper", () => {
  it("forwards effects triggered by an event", async () => {
    const onEffect = vitest.fn(async () => undefined);
    const nbEffects = Math.floor(1 + Math.random() * 100);
    const effects = Array.from({ length: nbEffects }).map((_, i) => {
      return { id: i, effect: {} };
    });
    vitest.spyOn(api, "process_event").mockResolvedValue(serialize(effects));
    const crux = wrap({
      init: async () => {},
      api,
      onEffect,
      serializerConfig,
    });

    await crux.sendEvent(new Event());
    expect(onEffect).toHaveBeenCalledTimes(nbEffects);
  });

  it("sends responses back to the crux api", async () => {
    const effect = { id: 0, effect: new Effect() };
    const onEffect = vitest.fn(async (id: number) => ({
      id: id,
      response: new Response(),
    }));
    vitest.spyOn(api, "process_event").mockResolvedValue(serialize([effect]));
    vitest.spyOn(api, "handle_response");
    const crux = wrap({
      init: async () => {},
      api,
      onEffect,
      serializerConfig,
    });

    await crux.sendEvent(new Event());
    expect(api.handle_response).toHaveBeenCalledWith(
      effect.id,
      serialize(new Response()),
    );
  });

  it("forwards effects triggered by a response", async () => {
    const onEffect = vitest.fn(async () => undefined);
    const nbEffects = Math.floor(1 + Math.random() * 100);
    const effects = Array.from({ length: nbEffects }).map((_, i) => {
      return { id: i, effect: {} };
    });
    vitest.spyOn(api, "handle_response").mockResolvedValue(serialize(effects));
    const crux = wrap({
      init: async () => {},
      api,
      onEffect,
      serializerConfig,
    });

    await crux.sendResponse(0, new Event());
    expect(onEffect).toHaveBeenCalledTimes(nbEffects);
  });
});
