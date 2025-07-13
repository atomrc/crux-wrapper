import { nestResponses } from "crux-wrapper";
import { useLogs } from "crux-wrapper/react";
import { useState } from "react";
import "./DevTools.css";

function LogTimeMarker({
  at,
  time,
  min,
  max,
}: {
  at: number;
  time?: number;
  min: number;
  max: number;
}) {
  const span = max * 1.2 - min;
  const startingPoint = ((at - min) / span) * 100;
  const width = `${((time ?? 0) / span) * 100}%`;
  return (
    <div style={{ display: "flex" }}>
      <div style={{ width: `${startingPoint}%` }}></div>
      <div style={{ background: "red", width, minWidth: "2px" }}></div>
      <div>{time ? `${time}ms` : "?"}</div>
    </div>
  );
}

function LogEntry({
  log,
  min,
  max,
}: {
  log: ReturnType<typeof nestResponses>[number];
  min: number;
  max: number;
}) {
  const responses =
    log.type === "effect" && log.responses
      ? log.responses.map((response) => (
          <tr key={response.id}>
            <td>{response.at}</td>
            <td>{response.type}</td>
            <td>{response.name}</td>
            <td>
              <LogTimeMarker at={response.at} min={min} max={max} />
            </td>
          </tr>
        ))
      : "";

  const time = log.type === "effect" ? log.time : 0;
  return (
    <>
      <tr>
        <td>{log.at}</td>
        <td>{log.type}</td>
        <td>{log.name}</td>
        <td>
          <LogTimeMarker at={log.at} time={time} min={min} max={max} />
        </td>
      </tr>
      {responses}
    </>
  );
}
export function DevTools() {
  const [nested, setNested] = useState(false);
  const logs = useLogs();
  const nestedLogs = nested ? nestResponses(logs) : logs;
  return (
    <div>
      <h2>Logs</h2>
      <button onClick={() => console.log(logs, nestedLogs)}>
        Print to console
      </button>
      <br />
      <label>
        <input
          type="checkbox"
          checked={nested}
          onChange={() => setNested(!nested)}
        />
        nest logs (will group the responses to their effects)
      </label>
      <table style={{ listStyleType: "none", padding: 0, width: "100%" }}>
        <caption>Crux logs timeline</caption>
        <thead>
          <tr>
            <th>time</th>
            <th>type</th>
            <th>name</th>
            <th style={{ width: "100%" }}>timeline</th>
          </tr>
        </thead>
        <tbody>
          {nestedLogs.map((log, index) => (
            <LogEntry
              log={log}
              key={`${log.id}`}
              min={logs.at(0)?.at ?? 0}
              max={logs.at(-1)?.at ?? 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
