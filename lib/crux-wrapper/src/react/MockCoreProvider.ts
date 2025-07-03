import react from "react";
import { State } from "./state";
import { CoreContext } from "./CoreProvider";

type Props = { children: React.ReactNode; state: State };
/**
 * Provides a context that exposes the crux api.
 */
export function MockCoreProvider({ children, state }: Props) {
  return react.createElement(
    CoreContext.Provider,
    {
      value: {
        dispatch: async () => {},
        state: state,
        ready: true,
      },
    },
    children,
  );
}
