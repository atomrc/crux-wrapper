import { is, wrapCrux } from "crux-wrapper";
import type {
  Constructor,
  CruxApi,
  CruxEntity,
  CruxSerializer,
  OnEffect,
} from "crux-wrapper";
import react, { useContext, useSyncExternalStore } from "react";
import { State, type Selector } from "./state";

export { is } from "crux-wrapper";

declare global {
  interface VM {}
}

type StoreApi = {
  dispatch: (event: CruxEntity) => Promise<void>;
  state: State;
};

const defaultStoreApi: StoreApi = {
  dispatch: () => {
    throw new Error("crux provider not set");
  },
  state: new State({}),
};
const CruxContext = react.createContext<StoreApi>(defaultStoreApi);

type Props = {
  children: React.ReactNode;
  cruxConfig: {
    init: () => Promise<unknown>;
    api: CruxApi;
    onEffect: OnEffect<VM>;
    serializer: CruxSerializer<VM>;
    RenderEffect: Constructor<any>;
  };
};

export function CruxProvider({
  children,
  cruxConfig: { init, api, RenderEffect, onEffect, serializer },
}: Props) {
  const state = new State({});
  const wrap = wrapCrux(
    init,
    api,
    async (id, effect, view) => {
      if (is(effect, RenderEffect)) {
        state.setViewModel(await view());
        return;
      }
      return onEffect(id, effect, view);
    },
    serializer,
  );

  const context = {
    dispatch: wrap.sendEvent,
    state,
  };
  return react.createElement(
    CruxContext.Provider,
    { value: context },
    children,
  );
}

export function useDispatch() {
  return useContext(CruxContext).dispatch;
}

/**
 * This hook will subscribe to the changes to the core-logic view_model model and will emit a new model as soon as it is updated inside of `core-logic`.
 * @param selector allows selecting a slice of the state and only subscribing to changes to that particular slice
 * @returns
 */
export function useViewModel<T = VM>(selector?: Selector<T>) {
  const state = useContext(CruxContext).state;

  return useSyncExternalStore(
    (onStoreChange) => state.subscribe(onStoreChange),
    () => state.getViewModel(selector),
  );
}
