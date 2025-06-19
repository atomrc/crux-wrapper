import { CoreProvider, useDispatch, useViewModel } from "crux-wrapper/react";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
  Request,
} from "core_types/types/core_types";
import { BincodeSerializer, BincodeDeserializer } from "core_types/bincode/mod";
import { wrap } from "comlink";
import { CoreWorkerApi } from "./worker";

declare global {
  interface CoreViewModel {
    count: bigint;
  }
}

function Counter() {
  const count = useViewModel();
  const dispatch = useDispatch();
  const increment = () => dispatch(new EventVariantIncrement());
  const decrement = () => dispatch(new EventVariantDecrement());

  return (
    <div>
      <button onClick={increment}>+</button>{" "}
      <button onClick={decrement}>-</button> {count.count}
    </div>
  );
}
export function App() {
  const coreConfig = {
    init: async () => {
      const worker =  wrap<CoreWorkerApi>(
            new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
            }),
        );
      await worker.init();
      return worker;
    },
    onEffect: async () => undefined,
    serializerConfig: {
      BincodeSerializer,
      BincodeDeserializer,
      ViewModel,
      Request,
    },
  };
  const initialState = new ViewModel(BigInt(0));
  return (
    <CoreProvider
      coreConfig={coreConfig}
      initialState={initialState}
      RenderEffect={EffectVariantRender}
    >
      <Counter />
    </CoreProvider>
  );
}
