import { EventSender } from "./eventSender";
import type {
    CruxApi,
    CruxEntity,
    CruxSerializer,
    OnEffect,
    OnError,
} from "./types";
type Logs = { event: string; effects: [string, string][]; time: number }[];

export function wrapCrux<VM>(
    api: CruxApi,
    onEffect: OnEffect,
    onError: OnError,
    serializer: CruxSerializer<VM>,
    /** time after which a command sent to the core is considered stuck and will trigger a CoreTimeoutError */
    timeout?: { value: number; onTimeout: () => void },
) {
    const logs: Logs = [];

    const send = async (
        sendFn: (eventSender: EventSender<VM>) => Promise<void>,
        logId: string,
    ) => {
        const sender = new EventSender(api, onEffect, serializer, timeout);
        const startedAt = performance.now();
        try {
            await sendFn(sender);
        } catch (error) {
            onError(error);
        } finally {
            logs.push({
                event: logId,
                effects: sender.dumpLogs(),
                time: performance.now() - startedAt,
            });
        }
    };

    return {
        sendEvent(event: CruxEntity) {
            return send(
                (sender) => sender.sendEvent(serializer.serialize(event)),
                event.constructor.name,
            );
        },
        sendResponse(id: number, response: CruxEntity) {
            return send(
                (sender) =>
                    sender.sendResponse(id, serializer.serialize(response)),
                response.constructor.name,
            );
        },

        async view() {
            const view = await api.view();
            return serializer.deserializeView(view);
        },

        dumpLogs() {
            return logs;
        },
    };
}
