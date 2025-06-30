type EffectResponse = any;

export type EventCycleCallbacks = {
  onEffect: (effect: unknown) => undefined | EffectResponse;
};

export type CruxEntity = {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  serialize: (serializer: any) => void;
};

export type OnEffect<VM> = (
  id: number,
  effect: CruxEntity,
  {
    respond,
    view,
  }: {
    respond: (response: CruxEntity) => void;
    view: () => Promise<VM>;
  },
) => Promise<undefined | CruxEntity>;

export type OnError = (error: unknown) => void;

export type CruxApi = {
  process_event: (payload: Uint8Array) => Promise<Uint8Array> | Uint8Array;
  handle_response: (
    id: number,
    payload: Uint8Array,
  ) => Promise<Uint8Array> | Uint8Array;
  view: () => Promise<Uint8Array> | Uint8Array;
};

export type Request = {
  effect: CruxEntity;
  id: number;
};

export type SerializableClass<T> = {
  new (...args: any[]): T;
  deserialize(serializer: unknown): T;
};

export type CruxSerializer<VM, R> = {
  serialize: (entity: CruxEntity) => Uint8Array;
  deserializeEffects: (bytes: Uint8Array) => R[];
  deserializeView: (bytes: Uint8Array) => VM;
};
