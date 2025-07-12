import type {
  CruxApi,
  CruxEntity,
  CruxSerializer,
  OnEffect,
  Request,
} from "./types.js";

type EffectLog = {
  type: "effect";
  name: string;
  id: string;
  at: number;
  time: number;
};
export type EventSenderLog =
  | {
      type: "event";
      name: string;
      at: number;
    }
  | EffectLog
  | {
      type: "response";
      name: string;
      to: string;
      at: number;
    };

class Logger {
  constructor(private log: (entry: EventSenderLog) => void) {}

  private baseLog(entity: CruxEntity) {
    return {
      name: entity.constructor.name,
      at: performance.now(),
    };
  }

  createEffectLog(id: number, effect: CruxEntity): Omit<EffectLog, "time"> {
    const baseLog = this.baseLog(effect);
    return {
      ...this.baseLog(effect),
      type: "effect",
      id: `${baseLog.name}-${id}-${baseLog.at}`,
    };
  }

  logEvent(entity: CruxEntity) {
    this.log({
      ...this.baseLog(entity),
      type: "event",
    });
  }

  finishEffectLog(effectLog: Omit<EffectLog, "time">) {
    this.log({
      ...effectLog,
      time: performance.now() - effectLog.at,
    });
  }

  logResponse(effectId: string, entity: CruxEntity) {
    this.log({
      ...this.baseLog(entity),
      type: "response",
      to: effectId,
    });
  }
}

export function createSender<VM, R extends Request>(
  apiRef: { value: null | Promise<CruxApi> },
  onEffect: OnEffect<VM>,
  serializer: CruxSerializer<VM, R>,
  log?: (payload: EventSenderLog) => void,
) {
  const logger = log && new Logger(log);
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
        const effectLog = logger?.createEffectLog(id, effect);
        const view = async () => {
          const api = await getApi();
          return serializer.deserializeView(await api.view());
        };
        const respondInternal = (response: CruxEntity) => {
          logger?.logResponse(effectLog?.id!, response);
          return respond(id, response);
        };
        const response = await onEffect(effect, {
          respond: respondInternal,
          send,
          view,
        });
        logger?.finishEffectLog(effectLog!);

        if (response) {
          await respond(id, response);
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

  function send(event: CruxEntity) {
    logger?.logEvent(event);
    return exhaust(async () =>
      (await getApi()).process_event(serializer.serialize(event)),
    );
  }
  function respond(id: number, response: CruxEntity) {
    return exhaust(async () =>
      (await getApi()).handle_response(id, serializer.serialize(response)),
    );
  }

  return {
    send(event: CruxEntity) {
      if (!apiRef.value) {
        throw new Error("Core not initialized. Call init() first.");
      }
      return send(event);
    },
    handleEffect,
  };
}
