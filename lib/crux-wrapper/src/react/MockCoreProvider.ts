import react from "react";
import { State } from "./state.js";
import { CoreContext } from "./CoreProvider.js";
import type { CruxEntity } from "../types.js";

type Props = {
  children: React.ReactNode;
  dispatch?: (event: CruxEntity) => Promise<void>;
  state: State;
};
/**
 * Provides a context that exposes the crux api.
 */
export function MockCoreProvider({ children, dispatch, state }: Props) {
  return react.createElement(
    CoreContext.Provider,
    {
      value: {
        dispatch: dispatch ?? (async () => {}),
        state: state,
        ready: true,
      },
    },
    children,
  );
}
