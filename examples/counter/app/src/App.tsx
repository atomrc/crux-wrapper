import {
  CoreProvider,
  useDispatch,
  useIsReady,
  useViewModel,
} from "crux-wrapper/react";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
  EventVariantStartWatch,
  EventVariantStopWatch,
} from "core_types/types/core_types";
import { getCoreConfig } from "./config";
import { useEffect, useRef } from "react";

declare module "crux-wrapper/react" {
  type CoreViewModel = ViewModel;
}

function Counter() {
  const ready = useIsReady();
  const count = useViewModel((s) => s.count);
  const dispatch = useDispatch();
  const increment = () => dispatch(new EventVariantIncrement());
  const decrement = () => dispatch(new EventVariantDecrement());

  useEffect(() => {
    dispatch(new EventVariantStartWatch());

    return () => {
      dispatch(new EventVariantStopWatch());
    };
  }, []);

  if (!ready) {
    return <div>Loading core...</div>;
  }

  return (
    <div>
      <div>Welcome</div>
      <div>{count}</div>
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
