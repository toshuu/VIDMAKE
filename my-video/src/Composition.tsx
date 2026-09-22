import { Composition } from "remotion";
import { IphonePromo } from "./IphonePromo";
import { IphonePromoVertical } from "./IphonePromoVertical";
import { WaterReel } from "./WaterReel";
import { WaterReelV2 } from "./WaterReelV2";
import { CafeReel } from "./CafeReel";
import { M3Compare } from "./M3Compare";
import { M4Compare } from "./M4Compare";

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="IphonePromo"
        component={IphonePromo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="IphonePromoVertical"
        component={IphonePromoVertical}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WaterReel"
        component={WaterReel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WaterReelV2"
        component={WaterReelV2}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CafeReel"
        component={CafeReel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="M3Compare"
        component={M3Compare}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="M4Compare"
        component={M4Compare}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
