import { is, wrap } from "../";
import type { CoreConfig, Constructor, CruxEntity } from "../";
import react, {
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { State, type Selector } from "./state";
import type { CoreViewModel } from "crux-wrapper/react";
import type { Request } from "../types";

type StoreApi = {
  dispatch: (event: CruxEntity) => Promise<void>;
  state?: State;
};

const CoreContext = react.createContext<StoreApi>({
  dispatch: () => {
    throw new Error("");
  },
});

type Props = {
  children: React.ReactNode;
  coreConfig: CoreConfig<CoreViewModel, Request>;
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
  const isInit = useRef(false);
  const state = new State(initialState);
  const core = wrap({
    ...coreConfig,
    onEffect: async (id, effect, callbacks) => {
      if (RenderEffect && is(effect, RenderEffect)) {
        state.setViewModel(await callbacks.view());
        return;
      }
      return coreConfig.onEffect(id, effect, callbacks);
    },
  });

  useEffect(() => {
    if (!isInit.current) {
      isInit.current = true;
      core.init();
    }
  }, [core]);

  return react.createElement(
    CoreContext.Provider,
    {
      value: {
        dispatch: core.send,
        state,
      },
    },
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
