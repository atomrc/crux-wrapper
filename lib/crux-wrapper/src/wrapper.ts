import { EventSender } from "./eventSender";
import type { CruxApi, CruxEntity, CruxSerializer, OnEffect } from "./types";

export type CruxConfig<VM> = {
  /**
   * initialization function that should load the wasm bundle. You can provide the default export of the crux package
   * ```
   * import init from "shared" // your shared package
   * wrapCrux({
   *    init,
   *    //...
   * })
   * ```
   */
  init: () => Promise<unknown>;
  /**
   * The crux api exposed by your crux core. It contains the `process_event`, `handle_response` and `view` functions
   * typically you would do
   * ```
   * import * as core from "shared";
   * wrapCrux({
   *    api: core
   * })
   * ```
   */
  api: CruxApi;
  /**
   * The function that will be called for every single effect that the core requests
   */
  onEffect: OnEffect<VM>;
  /**
   * The functions that should be used to serialize/deserialize payloads between the core and the shell
   */
  serializer: CruxSerializer<VM>;
};

export function wrapCrux<VM>({
  init,
  api,
  onEffect,
  serializer,
}: CruxConfig<VM>) {
  const initPromise = init();

  const view = async () => {
    await initPromise;
    const view = await api.view();
    return serializer.deserializeView(view);
  };

  const send = async (
    sendFn: (eventSender: EventSender<VM>) => Promise<void>,
  ) => {
    const sender = new EventSender(
      api,
      (id, effect) => onEffect(id, effect, view),
      serializer,
    );
    await sendFn(sender);
  };

  return {
    async sendEvent(event: CruxEntity) {
      await initPromise;
      return send((sender) => sender.sendEvent(serializer.serialize(event)));
    },
    sendResponse(id: number, response: CruxEntity) {
      return send((sender) =>
        sender.sendResponse(id, serializer.serialize(response)),
      );
    },
  };
}
