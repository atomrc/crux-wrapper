import {
  BincodeSerializer,
  BincodeDeserializer,
} from "counter_types/bincode/mod";
import { ViewModel, Request } from "counter_types/types/counter_types";

export const serializer = {
  serialize(entity: {
    serialize: (serializer: BincodeSerializer) => void;
  }): Uint8Array {
    const serializer = new BincodeSerializer();
    entity.serialize(serializer);
    return serializer.getBytes();
  },

  deserializeEffects(bytes: Uint8Array): Request[] {
    const deserializer = new BincodeDeserializer(bytes);
    const len = deserializer.deserializeLen();
    const requests: Request[] = [];
    for (let i = 0; i < len; i++) {
      const request = Request.deserialize(deserializer);
      requests.push(request);
    }
    return requests;
  },

  deserializeView(bytes: Uint8Array): ViewModel {
    return ViewModel.deserialize(new BincodeDeserializer(bytes));
  },
};
