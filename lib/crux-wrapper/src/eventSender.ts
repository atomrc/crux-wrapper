import type {
  CruxApi,
  CruxEntity,
  CruxSerializer,
  Effect,
  OnEffect,
  Request,
} from "./types.js";

type BaseLog = {
  id: string;
  name: string;
  at: number;
};
type EffectLog = BaseLog & {
  type: "effect";
  name: string;
  id: string;
  at: number;
  time: number;
};

type EventLog = BaseLog & { type: "event" };
type ResponseLog = BaseLog & { type: "response"; to: string };
export type EventSenderLog = EventLog | EffectLog | ResponseLog;

class Logger {
  constructor(private log: (entry: EventSenderLog) => void) {}

  private baseLog(entity: CruxEntity): BaseLog {
    const at = performance.now();
    const name = entity.constructor.name;
    return {
      id: `${at.toString()}-${name}-${Math.floor(Math.random() * 1e6).toString(16)}`,
      name,
      at,
    };
  }

  createEffectLog(id: number, effect: Effect): Omit<EffectLog, "time"> {
    const baseLog = this.baseLog(effect.value);
    return {
      ...baseLog,
      type: "effect",
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
          logger?.logResponse(
            effectLog?.id ?? Math.random().toString(16),
            response,
          );
          return respond(id, response);
        };
        const response = await onEffect(effect, {
          respond: respondInternal,
          send,
          view,
        });
        if (effectLog) {
          logger?.finishEffectLog(effectLog);
        }

        if (response) {
          await respond(id, response);
        }
      }),
    );
  }

  async function exhaust(sendPayload: () => Promise<Uint8Array> | Uint8Array) {
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
