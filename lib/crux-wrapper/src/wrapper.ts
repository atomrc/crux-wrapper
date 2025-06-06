import { EventSender } from "./eventSender";
import type {
    CruxApi,
    CruxEntity,
    CruxSerializer,
    OnEffect,
} from "./types";

export function wrapCrux<VM>(
    init: () => Promise<unknown>,
    api: CruxApi,
    onEffect: OnEffect<VM>,
    serializer: CruxSerializer<VM>,
) {
    const initPromise = init();

    const view =  async () => {
          await initPromise;
          const view = await api.view();
          return serializer.deserializeView(view);
      };

    const send = async (
        sendFn: (eventSender: EventSender<VM>) => Promise<void>,
    ) => {
        const sender = new EventSender(api, (id, effect) => onEffect(id, effect, view), serializer);
        await sendFn(sender);
    };

    return {
        async sendEvent(event: CruxEntity) {
            await initPromise;
            return send(
                (sender) => sender.sendEvent(serializer.serialize(event)),
            );
        },
        sendResponse(id: number, response: CruxEntity) {
            return send(
                (sender) =>
                    sender.sendResponse(id, serializer.serialize(response)),
            );
        },
    };
}
