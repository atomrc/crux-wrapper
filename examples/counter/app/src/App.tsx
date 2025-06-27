import { CoreProvider, useDispatch, useViewModel } from "crux-wrapper/react";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
  EventVariantStartWatch,
} from "core_types/types/core_types";
import { getCoreConfig } from "./config";
import { useEffect, useRef } from "react";

declare module "crux-wrapper/react" {
  type CoreViewModel = ViewModel;
}

function Counter() {
  const count = useViewModel();
  const dispatch = useDispatch();
  const increment = () => dispatch(new EventVariantIncrement());
  const decrement = () => dispatch(new EventVariantDecrement());

  const a = useRef(false);
  useEffect(() => {
    if (a.current) return;
    a.current = true;
    dispatch(new EventVariantStartWatch());
  }, []);

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
