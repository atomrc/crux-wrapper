import { is, wrap } from "../index.js";
import type {
  CoreConfig,
  Constructor,
  CruxEntity,
  LogEntry,
} from "../index.js";
import react, {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { State, type Selector } from "./state.js";
import type { CoreViewModel } from "crux-wrapper/react";
import type { Request } from "../types.js";

type CruxApi = ReturnType<typeof wrap>;
type StoreApi = {
  dispatch: CruxApi["send"];
  logs: CruxApi["logs"];
  state?: State;
  /** whether the core has been loaded into memory and ready to be used */
  ready: boolean;
};

export const CoreContext = react.createContext<StoreApi>({
  dispatch: () => {
    throw new Error("CoreProvider not initialized");
  },
  logs: [],
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

type Func = () => void;
class Logger {
  private state: LogEntry[] = [];
  private listeners: Func[] = [];

  addListener(listener: Func) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  log(entry: LogEntry) {
    this.state = [...this.state, entry];
    this.listeners.forEach((listener) => listener());
  }

  getLogs() {
    return this.state;
  }
}

let logger: Logger = new Logger();
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

  const useReactLogger = typeof coreConfig.log === "boolean" && coreConfig.log;
  const onLog = useReactLogger
    ? // When no logger is provided, but the consumer wants to log events, we register our custom logger
      // this logger will be used by the useLog hook to subscribe to log changes
      logger.log.bind(logger)
    : coreConfig.log;
  const core = useRef(
    wrap({
      ...coreConfig,
      onEffect: async (effect, callbacks) => {
        if (state.current && RenderEffect && is(effect, RenderEffect)) {
          state.current.setViewModel(await callbacks.view());
          return;
        }
        return coreConfig.onEffect(effect, callbacks);
      },
      log: onLog,
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
        logs: core.current.logs,
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
 */
export function useViewModelGetter<T = CoreViewModel>(selector?: Selector<T>) {
  const state = useContext(CoreContext).state;
  if (!state) {
    throw new Error(
      "useViewModelGetter cannot be used when RenderEffect property was not set",
    );
  }

  return useCallback(() => state.getViewModel(selector), [state]);
}

/**
 * Will subscribe to logs from the core and return a reactive state containing the logs from the core.
 */
export function useLogs() {
  return useSyncExternalStore(
    (onLog) => logger.addListener(onLog),
    () => logger.getLogs(),
  );
}

/**
 * This hook will return a function that could give you the current logs.
 * It gives you direct access to the logs at instant T without subscribing to changes.
 */
export function useGetLogs() {
  return useCallback(() => logger.getLogs(), []);
}

/**
 * Subscribes to the changes of the `read` state of the core.
 * This hook could be used to show a loading state while the core is being initialized.
 * There is no particular need to wait for this property to be true before sending events to the core, as the core will handle them once it is ready.
 */
export function useIsReady() {
  return useContext(CoreContext).ready;
}
