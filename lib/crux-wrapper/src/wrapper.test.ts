import { describe, expect, it, vi, vitest } from "vitest";

import type { CruxApi, CruxSerializer } from "./types";
import { wrapCrux } from "./wrapper";

function serialize(entity: object) {
    const str = JSON.stringify(entity);
    const buffer = new TextEncoder().encode(str).buffer;
    return new Uint8Array(buffer);
}

function deserialize(data: Uint8Array) {
    const str = new TextDecoder().decode(data);
    return JSON.parse(str);
}

const serializer: CruxSerializer<object> = {
    serialize,
    deserializeEffects: deserialize,
    deserializeView: deserialize,
};

class CruxEntity {
    serialize() {}
}
class Event extends CruxEntity {}
class Response extends CruxEntity {}
class Effect extends CruxEntity {}

const api: CruxApi = {
    async view() {
        return serialize({});
    },
    process_event: async () => {
        return serialize([]);
    },
    handle_response: async () => {
        return serialize([]);
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
      const crux = wrapCrux(async () => { }, api, onEffect, serializer);

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
        const crux = wrapCrux(async () => { }, api, onEffect, serializer);

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
        const crux = wrapCrux(async () => { }, api, onEffect, serializer);

        await crux.sendResponse(0, new Event());
        expect(onEffect).toHaveBeenCalledTimes(nbEffects);
    });

});
