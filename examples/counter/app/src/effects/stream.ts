import {
  EffectVariantStream,
  StreamOperation,
  StreamOperationVariantStart,
  StreamOperationVariantStop,
  StreamReponseVariantData,
} from "core_types/types/core_types";
import { is } from "crux-wrapper";

let streamInterval: NodeJS.Timeout | undefined;

export function handleStreamOperation(
  operation: StreamOperation,
  respond: (respond: any) => void,
) {
  switch (true) {
    case is(operation, StreamOperationVariantStart): {
      streamInterval = setInterval(() => {
        respond(new StreamReponseVariantData("ok"));
      }, 1000);
      break;
    }

    case is(operation, StreamOperationVariantStop): {
      clearInterval(streamInterval);
      break;
    }
  }

  return undefined;
}
