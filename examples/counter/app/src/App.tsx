import { wrapCrux, is } from 'react-crux';
import init, * as core  from 'shared';
import { ViewModel, Request, EventVariantIncrement, EffectVariantRender, Effect, EventVariantDecrement }  from 'shared_types/types/shared_types';
import { BincodeSerializer, BincodeDeserializer }  from 'shared_types/bincode/mod';
import { useState } from 'react';

  const serializer = {
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

export function App() {
  const [state, setState] = useState("");
  const handleEffect = async (id: number, effect: Effect, view: () => Promise<ViewModel>) => {
    switch (true) {
      case is(effect, EffectVariantRender): {
        let v= await view();
        setState(v.count)
        return undefined;
      }
    }
    return undefined;
  };

  const api  = wrapCrux(init, core, handleEffect, serializer);
  return <div><button onClick={() => api.sendEvent(new EventVariantIncrement()) }>+</button> <button onClick={() => api.sendEvent(new EventVariantDecrement()) }>-</button> {state}</div>
}
