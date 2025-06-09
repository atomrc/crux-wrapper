import { is, wrap } from "crux-wrapper";
import type { Constructor, CoreConfig, CruxEntity } from "crux-wrapper";
import react, { useContext, useSyncExternalStore } from "react";
import { State, type Selector } from "./state";

export type { CoreConfig } from "crux-wrapper";

declare global {
  interface CoreViewModel {}
  interface CoreRequest {
    id: number;
    effect: any;
  }
}

type StoreApi = {
  dispatch: (event: CruxEntity) => Promise<void>;
  state?: State;
};

const CoreContext = react.createContext<StoreApi>({
  dispatch: () => {
    throw new Error("CruxProvider not set");
  },
});

type Props = {
  children: React.ReactNode;
  coreConfig: CoreConfig<CoreViewModel, CoreRequest>;
  /**
   * Will allow the provider to expose the `useViewMode` hook and compute state updates for you
   */
  RenderEffect?: Constructor<any>;
  /**
   * Initial state that is going to be loaded before any interaction with the core happens
   */
  initialState: CoreViewModel;
};

/**
 * Provides a context that exposes the crux api.
 */
export function CoreProvider({
  children,
  coreConfig,
  RenderEffect,
  initialState,
}: Props) {
  const state = new State(initialState);
  const wrapped = wrap({
    ...coreConfig,
    onEffect: async (id, effect, view) => {
      if (RenderEffect && is(effect, RenderEffect)) {
        state.setViewModel(await view());
        return;
      }
      return coreConfig.onEffect(id, effect, view);
    },
  });

  const context = {
    dispatch: wrapped.sendEvent,
    state,
  };

  return react.createElement(
    CoreContext.Provider,
    { value: context },
    children,
  );
}

export function useDispatch() {
  return useContext(CoreContext).dispatch;
}

/**
 * Subscribe to changes to the crux viewModel.
 * This hooks only works if a RenderEffect class was given when mounting the `CruxProvider` component.
 * @param selector allows selecting a slice of the state and only subscribing to changes to that particular slice
 * @returns
 */
export function useViewModel<T = CoreViewModel>(selector?: Selector<T>) {
  const state = useContext(CoreContext).state;
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
