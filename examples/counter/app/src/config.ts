import { BincodeSerializer, BincodeDeserializer } from "core_types/bincode/mod";
import { ViewModel, Request } from "core_types/types/core_types";
import { CoreWorkerApi } from "./worker";
import { wrap } from "comlink";

export function getCoreConfig(worker: boolean) {
  const init = worker
    ? async () => {
        const worker = wrap<CoreWorkerApi>(
          new Worker(new URL("./worker.ts", import.meta.url), {
            type: "module",
          }),
        );
        await worker.init();
        return worker;
      }
    : async () => {
        const { default: initCore, ...core } = await import("core");
        await initCore();
        return core;
      };

  return {
    init,
    onEffect: async () => undefined,
    serializerConfig: {
      BincodeSerializer,
      BincodeDeserializer,
      ViewModel,
      Request,
    },
  };
}
