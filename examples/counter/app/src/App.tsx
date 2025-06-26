import { CoreProvider, useDispatch, useViewModel } from "crux-wrapper/react";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
} from "core_types/types/core_types";
import { getCoreConfig } from "./config";

declare module "crux-wrapper/react" {
  type CoreViewModel = ViewModel;
}

function Counter() {
  const count = useViewModel();
  const dispatch = useDispatch();
  const increment = async () => {
    console.time("increment");
    await dispatch(new EventVariantIncrement());
    console.timeEnd("increment");
  };
  const decrement = async () => {
    console.time("decrement");
    await dispatch(new EventVariantDecrement());
    console.timeEnd("decrement");
  };

  return (
    <div>
      <div>{count.count}</div>
      <button onClick={increment}>+</button>{" "}
      <button onClick={decrement}>-</button>
    </div>
  );
}
export function App() {
  const initialState = new ViewModel(BigInt(0));
  const coreConfig = getCoreConfig(false);
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
