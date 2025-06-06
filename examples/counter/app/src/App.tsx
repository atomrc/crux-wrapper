import { wrapCrux, is } from "crux-wrapper";
import init, * as core from "shared";
import {
  ViewModel,
  EventVariantIncrement,
  EffectVariantRender,
  Effect,
  EventVariantDecrement,
} from "counter_types/types/counter_types";
import { useState } from "react";
import { serializer } from "./serializer";

export function App() {
  const [state, setState] = useState(0);
  const handleEffect = async (
    id: number,
    effect: Effect,
    view: () => Promise<ViewModel>,
  ) => {
    switch (true) {
      case is(effect, EffectVariantRender): {
        let v = await view();
        setState(Number(v.count));
        return undefined;
      }
    }
    return undefined;
  };

  const api = wrapCrux(init, core, handleEffect, serializer);
  return (
    <div>
      <button onClick={() => api.sendEvent(new EventVariantIncrement())}>
        +
      </button>{" "}
      <button onClick={() => api.sendEvent(new EventVariantDecrement())}>
        -
      </button>{" "}
      {state}
    </div>
  );
}
