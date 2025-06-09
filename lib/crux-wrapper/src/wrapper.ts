import type { SerializedError } from "vitest";
import { EventSender } from "./eventSender";
import type {
  CruxApi,
  CruxEntity,
  OnEffect,
  Request,
  SerializableClass,
} from "./types";

type Serializer = {
  getBytes(): Uint8Array;
};
type Deserializer = {
  deserializeLen(): number;
};
type SerializerClass = {
  new (): Serializer;
};
type DeserializerClass = {
  new (bytes: Uint8Array): Deserializer;
};

export type SerializerConfig<VM, R> = {
  BincodeSerializer: SerializerClass;
  BincodeDeserializer: DeserializerClass;
  ViewModel: SerializableClass<VM>;
  Request: SerializableClass<R>;
};

export type CoreConfig<VM, R> = {
  /**
   * initialization function that should load the wasm bundle. You can provide the default export of the crux package
   * ```
   * import init from "shared" // your shared package
   * wrapCrux({
   *    init,
   *    //...
   * })
   * ```
   */
  init: () => Promise<unknown>;
  /**
   * The crux api exposed by your crux core. It contains the `process_event`, `handle_response` and `view` functions
   * typically you would do
   * ```
   * import * as core from "shared";
   * wrapCrux({
   *    api: core
   * })
   * ```
   */
  api: CruxApi;
  /**
   * The function that will be called for every single effect that the core requests
   */
  onEffect: OnEffect<VM>;
  /**
   * The functions that should be used to serialize/deserialize payloads between the core and the shell
   */
  serializerConfig: SerializerConfig<VM, R>;
};

function createSerializer<VM, R>({
  BincodeSerializer,
  BincodeDeserializer,
  ViewModel,
  Request,
}: SerializerConfig<VM, R>) {
  return {
    serialize(entity: any): Uint8Array {
      const serializer = new BincodeSerializer();
      entity.serialize(serializer);
      return serializer.getBytes();
    },

    deserializeEffects(bytes: Uint8Array): R[] {
      const deserializer = new BincodeDeserializer(bytes);
      const len = deserializer.deserializeLen();
      const requests: R[] = [];
      for (let i = 0; i < len; i++) {
        const request = Request.deserialize(deserializer);
        requests.push(request);
      }
      return requests;
    },

    deserializeView(bytes: Uint8Array): VM {
      return ViewModel.deserialize(new BincodeDeserializer(bytes));
    },
  };
}

export function wrap<VM, R extends Request>({
  init,
  api,
  onEffect,
  serializerConfig,
}: CoreConfig<VM, R>) {
  const initPromise = init();
  const serializer = createSerializer(serializerConfig);

  const view = async () => {
    await initPromise;
    const view = await api.view();
    return serializer.deserializeView(view);
  };

  const send = async (
    sendFn: (eventSender: EventSender<VM, R>) => Promise<void>,
  ) => {
    const sender = new EventSender(
      api,
      (id, effect) => onEffect(id, effect, view),
      serializer,
    );
    await sendFn(sender);
  };

  return {
    async sendEvent(event: CruxEntity) {
      await initPromise;
      return send((sender) => sender.sendEvent(serializer.serialize(event)));
    },
    sendResponse(id: number, response: CruxEntity) {
      return send((sender) =>
        sender.sendResponse(id, serializer.serialize(response)),
      );
    },
  };
}
