import {
  EffectVariantStream,
} from "core_types/types/core_types";
import { CoreConfig, is } from "crux-wrapper";
import { handleStreamOperation } from "./stream";

export const handleEffect: CoreConfig<any, any>["onEffect"] = async (
  effect,
  { respond },
) => {
  switch (true) {
    case is(effect, EffectVariantStream):
      return handleStreamOperation(effect.value, respond);
  }
  return undefined;
};
