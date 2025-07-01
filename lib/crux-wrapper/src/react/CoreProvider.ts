import { is, wrap } from "../";
import type { CoreConfig, Constructor, CruxEntity } from "../";
import react, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { State, type Selector } from "./state";
import type { CoreViewModel } from "crux-wrapper/react";
import type { Request } from "../types";

type StoreApi = {
  dispatch: (event: CruxEntity) => Promise<void>;
  state?: State;
  /** whether the core has been loaded into memory and ready to be used */
  ready: boolean;
};

const CoreContext = react.createContext<StoreApi>({
  dispatch: () => {
    throw new Error("CoreProvider not initialized");
  },
  ready: false,
});

type BaseProps = {
  children: React.ReactNode;
  coreConfig: CoreConfig<CoreViewModel, Request>;
};

type StatelessProps = BaseProps & {
  RenderEffect?: undefined;
  initialState?: undefined;
  mergeViewModel?: never;
};

type StatefulProps = BaseProps & {
  /**
   * Will allow the provider to expose the `useViewMode` hook and compute state updates for you
   */
  RenderEffect: Constructor<any>;
  /**
   * Initial state that is going to be loaded before any interaction with the core happens
   */
  initialState: CoreViewModel;
  /**
   * optional function that will be called when a new view model is given by a `render` effect.
   * This function could be used to optimize re-rendering and only update slices of the state that have changed on every render.
   * The main issue with Crux, is that a render will yield a completely new view model on every render. Which means that every object in the view model tree will be a new instance on every render.
   * So react will re-render every component that uses the view model, even if the data has not changed.
   *
   * This function allows you to take the old view model and the new one and merge them together trying to keep unchanged object references as stable as possible
   */
  mergeViewModel?: (
    newViewModel: CoreViewModel,
    oldViewModel: CoreViewModel,
  ) => CoreViewModel;
};

type Props = StatelessProps | StatefulProps;
/**
 * Provides a context that exposes the crux api.
 */
export function CoreProvider({
  children,
  coreConfig,
  RenderEffect,
  initialState,
  mergeViewModel,
}: Props) {
  const isInit = useRef(false);
  const state = useRef(RenderEffect && new State(initialState, mergeViewModel));
  const [ready, setReady] = react.useState(false);
  const core = useRef(
    wrap({
      ...coreConfig,
      onEffect: async (id, effect, callbacks) => {
        if (state.current && RenderEffect && is(effect, RenderEffect)) {
          state.current.setViewModel(await callbacks.view());
          return;
        }
        return coreConfig.onEffect(id, effect, callbacks);
      },
    }),
  );

  // We use layout effect in this case to make sure it's going to be called before the consumer starts sending events
  // Using useEffect would result in the consumer being able (via a useEffect) to call `send` before the core is initialized
  useLayoutEffect(() => {
    if (!isInit.current) {
      isInit.current = true;
      core.current.init().then(() => setReady(true));
    }
  }, [core]);

  return react.createElement(
    CoreContext.Provider,
    {
      value: {
        dispatch: core.current.send,
        state: state.current,
        ready,
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

/**
 * This hook will return a function that could give you the current loaded state.
 * It gives you direct access to the viewmodel state at instant T without subscribing to changes.
 * @returns
 */
export function useViewModelGetter<T = CoreViewModel>(selector?: Selector<T>) {
  const state = useContext(CoreContext).state;
  if (!state) {
    throw new Error(
      "useViewModel cannot be used when RenderEffect property was not set",
    );
  }

  return useCallback(() => state.getViewModel(selector), [selector, state]);
}

export function useIsReady() {
  return useContext(CoreContext).ready;
}
