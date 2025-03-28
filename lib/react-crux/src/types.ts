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
    view: () => Promise<VM>,
) => Promise<
    | undefined
    | {
          id: number;
          response: CruxEntity;
      }
>;

export type OnError = (error: unknown) => void;

export type CruxApi = {
    process_event: (payload: Uint8Array) => Promise<Uint8Array> | Uint8Array;
    handle_response: (id: number, payload: Uint8Array) => Promise<Uint8Array> | Uint8Array;
    view: () => Promise<Uint8Array> | Uint8Array;
};

export interface Serializer {
    getBytes(): Uint8Array;
}
export interface Deserializer {
    deserializeBytes(): Uint8Array;
}
type Request = {
    effect: CruxEntity;
    id: number;
};

export type CruxSerializer<VM> = {
    serialize: (entity: CruxEntity) => Uint8Array;
    deserializeEffects: (bytes: Uint8Array) => Request[];
    deserializeView: (bytes: Uint8Array) => VM;
};
