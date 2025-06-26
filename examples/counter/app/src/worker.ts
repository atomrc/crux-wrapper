import type { Endpoint } from "comlink";
import { expose } from "comlink";
import init, { handle_response, process_event, view } from "core";
import wasmPath from "core/core_bg.wasm?url";

const api = {
  init: async () => {
    await init({ module_or_path: wasmPath });
  },
  process_event,
  handle_response,
  view,
};
export type CoreWorkerApi = typeof api;
expose(api, self as Endpoint);
