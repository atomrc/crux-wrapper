import { CruxProvider, useDispatch, useViewModel } from "crux-react";
import init, * as core from "shared";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  RenderOperation,
  EffectVariantRender,
} from "counter_types/types/counter_types";
import { serializer } from "./serializer";

declare global {
  interface VM {
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
  const cruxConfig = {
    init: () => init(),
    api: core,
    onEffect: async () => undefined,
    serializer,
    RenderEffect: EffectVariantRender,
  };
  return (
    <CruxProvider cruxConfig={cruxConfig}>
      <Counter />
    </CruxProvider>
  );
}
