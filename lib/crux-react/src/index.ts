import { is, wrapCrux } from "crux-wrapper";
import type { Constructor, CruxConfig, CruxEntity } from "crux-wrapper";
import react, { useContext, useSyncExternalStore } from "react";
import { State, type Selector } from "./state";

declare global {
  interface CruxViewModel {}
}

type StoreApi = {
  dispatch: (event: CruxEntity) => Promise<void>;
  state?: State;
};

const CruxContext = react.createContext<StoreApi>({
  dispatch: () => {
    throw new Error("CruxProvider not set");
  },
});

type Props = {
  children: React.ReactNode;
  cruxConfig: CruxConfig<CruxViewModel> & {
    RenderEffect?: Constructor<any>;
  };
};

export function CruxProvider({ children, cruxConfig }: Props) {
  const state = new State({});
  const { RenderEffect, ...config } = cruxConfig;
  const wrap = wrapCrux({
    ...config,
    onEffect: async (id, effect, view) => {
      if (RenderEffect && is(effect, RenderEffect)) {
        state.setViewModel(await view());
        return;
      }
      return config.onEffect(id, effect, view);
    },
  });

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
 * Subscribe to changes to the crux viewModel.
 * This hooks only works if a RenderEffect class was given when mounting the `CruxProvider` component.
 * @param selector allows selecting a slice of the state and only subscribing to changes to that particular slice
 * @returns
 */
export function useViewModel<T = CruxViewModel>(selector?: Selector<T>) {
  const state = useContext(CruxContext).state;
  if (!state) {
    throw new Error(
      "useViewModel cannot be used when RenderEffect property was not set",
    );
  }

  return useSyncExternalStore(
    (onStoreChange) => state.subscribe(onStoreChange),
    () => state.getViewModel(selector),
  );
}
