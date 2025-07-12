import type { LogEntry } from "./wrapper.js";

type ResponseLog = Extract<LogEntry, { type: "response" }>;
type EventLog = Extract<LogEntry, { type: "event" }>;
type NestedEffectLog = Extract<LogEntry, { type: "effect" }> & {
  responses?: ResponseLog[];
};
type NestedLogs = ResponseLog | EventLog | NestedEffectLog;
/**
 * Will nest the responses to effect in the effect log itself.
 * This creates a clearer hierachy between effects and their responses.
 */
export function nestResponses(logs: LogEntry[]): NestedLogs[] {
  return logs.reduce<NestedLogs[]>((nestedLogs, log) => {
    if (log.type === "response") {
      const effectLog = nestedLogs.find(
        (l): l is NestedEffectLog => l.type === "effect" && l.id === log.to,
      );
      if (effectLog) {
        if (!effectLog.responses) {
          effectLog.responses = [];
        }
        effectLog.responses.push(log);
        return nestedLogs;
      } else {
        // If no effect log is found, we can still add the response as a top-level entry
        return [...nestedLogs, { ...log }];
      }
    }
    return [...nestedLogs, { ...log }];
  }, []);
}
