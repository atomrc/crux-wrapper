import { CoreProvider, useDispatch, useViewModel } from "crux-wrapper/react";
import init, * as core from "shared";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
  Request,
} from "counter_types/types/counter_types";
import {
  BincodeSerializer,
  BincodeDeserializer,
} from "counter_types/bincode/mod";

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
    init,
    api: core,
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
