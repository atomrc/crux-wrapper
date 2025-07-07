import type { CruxApi, CruxEntity, CruxSerializer, Request } from "./types.js";

export type OnEffect = (
  id: number,
  effect: CruxEntity,
  respond: (response: CruxEntity) => Promise<void>,
  send: (response: CruxEntity) => Promise<void>,
) => Promise<undefined | CruxEntity>;

export function sender<VM, R extends Request>(
  api: CruxApi,
  onEffect: OnEffect,
  serializer: CruxSerializer<VM, R>,
) {
  async function exhaust(
    sendPayload: () =>
      | Promise<Uint8Array<ArrayBufferLike>>
      | Uint8Array<ArrayBufferLike>,
  ) {
    const response = sendPayload();

    const effects = serializer.deserializeEffects(await response);
    await Promise.all(
      effects.map(async ({ id, effect }) => {
        const respond = (response: CruxEntity) => {
          return sendResponse(id, serializer.serialize(response));
        };
        const send = (event: CruxEntity) => {
          return sendEvent(serializer.serialize(event));
        };
        const response = await onEffect(id, effect, respond, send);
        if (response) {
          respond(response);
        }
      }),
    );
  }

  function sendEvent(event: Uint8Array) {
    return exhaust(() => api.process_event(event));
  }
  function sendResponse(id: number, response: Uint8Array) {
    return exhaust(() => api.handle_response(id, response));
  }

  return (event: CruxEntity) => {
    return sendEvent(serializer.serialize(event));
  };
}
