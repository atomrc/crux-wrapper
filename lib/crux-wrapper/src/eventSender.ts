import type {
  CruxApi,
  CruxEntity,
  CruxSerializer,
  OnEffect,
  Request,
} from "./types.js";

export function createSender<VM, R extends Request>(
  apiRef: { value: null | Promise<CruxApi> },
  onEffect: OnEffect<VM>,
  serializer: CruxSerializer<VM, R>,
) {
  function getApi() {
    if (!apiRef.value) {
      throw new Error("Core not initialized. Call init() first.");
    }
    return apiRef.value;
  }

  async function handleEffect(rawEffects: Uint8Array) {
    const effects = serializer.deserializeEffects(rawEffects);
    await Promise.all(
      effects.map(async ({ id, effect }) => {
        const respond = (response: CruxEntity) => {
          return sendResponse(id, serializer.serialize(response));
        };
        const send = (event: CruxEntity) => {
          return sendEvent(serializer.serialize(event));
        };
        const view = async () => {
          const api = await getApi();
          return serializer.deserializeView(await api.view());
        };
        const response = await onEffect(effect, { respond, send, view });
        if (response) {
          await respond(response);
        }
      }),
    );
  }

  async function exhaust(
    sendPayload: () =>
      | Promise<Uint8Array<ArrayBufferLike>>
      | Uint8Array<ArrayBufferLike>,
  ) {
    const effects = await sendPayload();
    return handleEffect(effects);
  }

  function sendEvent(event: Uint8Array) {
    return exhaust(async () => (await getApi()).process_event(event));
  }
  function sendResponse(id: number, response: Uint8Array) {
    return exhaust(async () => (await getApi()).handle_response(id, response));
  }

  return {
    send(event: CruxEntity) {
      if (!apiRef.value) {
        throw new Error("Core not initialized. Call init() first.");
      }
      return sendEvent(serializer.serialize(event));
    },
    handleEffect,
  };
}
