import { sender } from "./eventSender.js";
import type {
  CruxApi,
  CruxEntity,
  OnEffect,
  Request,
  SerializableClass,
} from "./types.js";

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
   * initialization function that should load the wasm bundle.
   * This function should return a promise that resolves to the crux base API of your core (`process_even`, `handle_effect`, `view`)
   * ```
   * import init, * as core from "shared";
   * wrapCrux({
   *    init: () => init().then(() => core),
   *    //...
   * })
   * ```
   */
  init: () => Promise<CruxApi>;
  /**
   * The function that will be called for every single effect that the core requests
   */
  onEffect: OnEffect<VM>;
  /**
   * optional function that will be called when a new view model is given by a `rende` effect.
   * This function could be used to optimize re-rendering and only update slices of the state that have changed on every render.
   * The main issue with Crux, is that a render will yield a completely new view model on every render. Which means that every object in the view model tree will be a new instance on every render.
   * So react will re-render every component that uses the view model, even if the data has not changed.
   *
   * This function allows you to take the old view model and the new one and merge them together trying to keep unchanged object references as stable as possible
   */
  mergeViewModel?: (oldViewModel: VM, newViewModel: VM) => VM;
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
  onEffect,
  serializerConfig,
  serializer: baseSerializer,
}: CoreConfig<VM, R>) {
  let apiPromise: Promise<CruxApi> | undefined = undefined;
  const serializer = baseSerializer ?? createSerializer(serializerConfig);

  return {
    init: async () => {
      if (apiPromise) {
        return;
      }
      apiPromise = init();
      return apiPromise;
    },
    send: async (event: CruxEntity) => {
      if (!apiPromise) {
        throw new Error("Core not initialized. Call init() first.");
      }
      const api = await apiPromise;
      return sender(
        api,
        (id, effect, respond, send) =>
          onEffect(id, effect, {
            view: async () => {
              return serializer.deserializeView(await api.view());
            },
            send,
            respond,
          }),
        serializer,
      )(event);
    },
  };
}
