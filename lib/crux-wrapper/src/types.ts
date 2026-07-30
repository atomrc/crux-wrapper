type EffectResponse = CruxEntity;

export type EventCycleCallbacks = {
  onEffect: (effect: unknown) => undefined | EffectResponse;
};

export interface CruxEntity {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  serialize: (serializer: any) => void;
}

export type Effect = CruxEntity;
export type OnEffect<VM> = (
  effect: CruxEntity,
  {
    respond,
    send,
    view,
  }: {
    /**
     * Sends a response back to the core related to the that is being processed.
     * Can also be used for streaming responses back
     */
    respond: (response: CruxEntity) => Promise<void>;
    /** Sends a new event to the core (not a response) */
    send: (event: CruxEntity) => Promise<void>;
    /** Pull the latest viewModel state from the core */
    view: () => Promise<VM>;
  },
) => Promise<undefined | CruxEntity>;

export type OnError = (error: unknown) => void;

export type CruxApi = {
  process_event: (
    payload: Uint8Array,
  ) => Promise<Uint8Array | undefined> | Uint8Array | undefined;
  handle_response: (
    id: number,
    payload: Uint8Array,
  ) => Promise<Uint8Array | undefined> | Uint8Array | undefined;
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
