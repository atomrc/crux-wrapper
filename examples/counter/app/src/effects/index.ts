import {
  EffectVariantStream,
  StreamReponseVariantData,
} from "core_types/types/core_types";
import { CoreConfig, is } from "crux-wrapper";

export const handleEffect: CoreConfig<any, any>["onEffect"] = async (
  id,
  effect,
  { stream },
) => {
  switch (true) {
    case is(effect, EffectVariantStream): {
      setInterval(() => {
        stream(new StreamReponseVariantData("ok"));
      }, 1000);
    }
  }
  return undefined;
};
