import { EventSender } from "./eventSender";
import type {
  CruxApi,
  CruxEntity,
  OnEffect,
  Request,
  SerializableClass,
} from "./types";

type BinSerializer = {
  getBytes(): Uint8Array;
};
type BinDeserializer = {
  deserializeLen(): number;
};
type SerializerClass = {
  new (): BinSerializer;
};
type DeserializerClass = {
  new (bytes: Uint8Array): BinDeserializer;
};

export type SerializerConfig<VM, R> = {
  BincodeSerializer: SerializerClass;
  BincodeDeserializer: DeserializerClass;
  ViewModel: SerializableClass<VM>;
  Request: SerializableClass<R>;
};

export type Serializer<VM, R> = {
  serialize(entity: any): Uint8Array;
  deserializeEffects(bytes: Uint8Array): R[];
  deserializeView(bytes: Uint8Array): VM;
};

interface BaseConfig<VM> {
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
}

interface ConfigWithSerializer<VM, R> extends BaseConfig<VM> {
  /**
   * The needed classes to be able to serialize/deserialize payload from and to the core
   */
  serializerConfig?: never;
  /**
   * A custom serializer that could be provided instead of the serializerConfig
   */
  serializer: Serializer<VM, R>;
}

interface ConfigWithSerializerConfig<VM, R> extends BaseConfig<VM> {
  /**
   * The needed classes to be able to serialize/deserialize payload from and to the core
   */
  serializerConfig: SerializerConfig<VM, R>;
  /**
   * A custom serializer that could be provided instead of the serializerConfig
   */
  serializer?: never;
}

export type CoreConfig<VM, R> =
  | ConfigWithSerializer<VM, R>
  | ConfigWithSerializerConfig<VM, R>;

function createSerializer<VM, R>({
  BincodeSerializer,
  BincodeDeserializer,
  ViewModel,
  Request,
}: SerializerConfig<VM, R>): Serializer<VM, R> {
  return {
    serialize(entity) {
      const serializer = new BincodeSerializer();
      entity.serialize(serializer);
      return serializer.getBytes();
    },

    deserializeEffects(bytes) {
      const deserializer = new BincodeDeserializer(bytes);
      const len = deserializer.deserializeLen();
      const requests: R[] = [];
      for (let i = 0; i < len; i++) {
        const request = Request.deserialize(deserializer);
        requests.push(request);
      }
      return requests;
    },

    deserializeView(bytes) {
      return ViewModel.deserialize(new BincodeDeserializer(bytes));
    },
  };
}

export function wrap<VM, R extends Request>({
  init,
  api,
  onEffect,
  serializerConfig,
  serializer: baseSerializer,
}: CoreConfig<VM, R>) {
  const initPromise = init();
  const serializer = baseSerializer ?? createSerializer(serializerConfig);

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
