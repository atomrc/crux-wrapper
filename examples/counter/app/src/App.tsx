import {
  CoreProvider,
  useDispatch,
  useIsReady,
  useLogs,
  useViewModel,
} from "crux-wrapper/react";
import {
  EventVariantIncrement,
  EventVariantDecrement,
  EffectVariantRender,
  ViewModel,
  EventVariantStartWatch,
  EventVariantStopWatch,
} from "core_types/types/core_types";
import { getCoreConfig } from "./config";
import { useEffect, useRef, useState } from "react";
import { LogEntry as CruxLogEntry } from "crux-wrapper";

declare module "crux-wrapper/react" {
  type CoreViewModel = ViewModel;
}

function LogEntry({ log }: { log: CruxLogEntry }) {
  const time = log.type === "effect" ? ` (took ${log.time}ms)` : "";
  return (
    <li>
      {log.at} <strong>{log.type} {log.name}</strong> {time}
    </li>
  );
}

function DevTools() {
  const logs = useLogs();
  return (
    <div>
      <h2>Logs</h2>
      <ul>
        {logs.map((log, index) => (
          <LogEntry log={log} key={index} />
        ))}
      </ul>
    </div>
  );
}

function Counter() {
  const ready = useIsReady();
  const count = useViewModel((s) => s.count);
  const dispatch = useDispatch();
  const increment = () => dispatch(new EventVariantIncrement());
  const decrement = () => dispatch(new EventVariantDecrement());

  useEffect(() => {
    dispatch(new EventVariantStartWatch());

    return () => {
      dispatch(new EventVariantStopWatch());
    };
  }, []);

  if (!ready) {
    return <div>Loading core...</div>;
  }

  return (
    <div>
      <div>Welcome</div>
      <div>count: {count}</div>
      <button onClick={increment}>+</button>{" "}
      <button onClick={decrement}>-</button>
    </div>
  );
}
export function App() {
  const initialState = new ViewModel(BigInt(0));
  const coreConfig = getCoreConfig(false);
  return (
    <CoreProvider
      coreConfig={coreConfig}
      initialState={initialState}
      RenderEffect={EffectVariantRender}
    >
      <Counter />
      <DevTools />
    </CoreProvider>
  );
}
