import {
  AbsoluteFill,
  Easing,
  Interactive,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

const FONT =
  "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const SPRING = Easing.spring({ damping: 200 });

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/* ------------------------------------------------------------------ */
/* Scene 1 — Animated title (0 – 2.5s)                                 */
/* ------------------------------------------------------------------ */
const TitleSceneV: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="TitleSceneV"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: interpolate(frame, [65, 75], [1, 0], { ...clamp, easing: EASE }),
      }}
    >
      <Interactive.Div
        name="KickerV"
        style={{
          fontFamily: FONT,
          fontSize: 40,
          letterSpacing: 18,
          color: "#86868b",
          opacity: interpolate(frame, [5, 20], [0, 1], { ...clamp, easing: EASE }),
          translate: interpolate(frame, [5, 25], ["0px 30px", "0px 0px"], {
            ...clamp,
            easing: EASE,
          }),
        }}
      >
        INTRODUCING
      </Interactive.Div>

      <Interactive.Div
        name="HeroTitleV"
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 190,
          lineHeight: 1,
          marginTop: 10,
          color: "#f5f5f7",
          textShadow: "0 0 90px rgba(90, 140, 255, 0.55)",
          opacity: interpolate(frame, [10, 25], [0, 1], { ...clamp, easing: EASE }),
          scale: interpolate(frame, [15, 50], [0.6, 1], {
            ...clamp,
            easing: SPRING,
            output: "perceptual-scale",
          }),
        }}
      >
        iPhone
      </Interactive.Div>

      <Interactive.Div
        name="TitleRuleV"
        style={{
          height: 4,
          marginTop: 34,
          borderRadius: 2,
          background: "linear-gradient(90deg, #2997ff, #a259ff)",
          width: interpolate(frame, [30, 55], [0, 380], { ...clamp, easing: EASE }),
          opacity: interpolate(frame, [30, 40], [0, 1], { ...clamp, easing: EASE }),
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 2 — Staggered feature lines (2.5 – 6s)                        */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { title: "Titanium design", sub: "So strong. So light. So Pro." },
  { title: "A17 Pro chip", sub: "A monster win for gaming." },
  { title: "48MP Pro camera", sub: "Every shot. Masterpiece." },
];

const FeatureRowV: React.FC<{ index: number; title: string; sub: string }> = ({
  index,
  title,
  sub,
}) => {
  const frame = useCurrentFrame();
  const start = 5 + index * 30;

  return (
    <Interactive.Div
      name={`FeatureV${index + 1}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: interpolate(frame, [start, start + 12], [0, 1], {
          ...clamp,
          easing: EASE,
        }),
        translate: interpolate(frame, [start, start + 16], ["-60px 0px", "0px 0px"], {
          ...clamp,
          easing: EASE,
        }),
      }}
    >
      <Interactive.Div
        name={`FeatureV${index + 1}Bar`}
        style={{
          width: 8,
          height: 120,
          borderRadius: 4,
          background: "linear-gradient(180deg, #2997ff, #a259ff)",
          scale: interpolate(frame, [start, start + 14], [0, 1], {
            ...clamp,
            easing: SPRING,
            output: "perceptual-scale",
          }),
        }}
      />
      <div>
        <Interactive.Div
          name={`FeatureV${index + 1}Title`}
          style={{ fontFamily: FONT, fontWeight: 700, fontSize: 62, color: "#f5f5f7" }}
        >
          {title}
        </Interactive.Div>
        <Interactive.Div
          name={`FeatureV${index + 1}Sub`}
          style={{ fontFamily: FONT, fontSize: 38, color: "#86868b" }}
        >
          {sub}
        </Interactive.Div>
      </div>
    </Interactive.Div>
  );
};

const FeaturesSceneV: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="FeaturesSceneV"
      style={{
        backgroundColor: "#050507",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: 110,
        paddingRight: 110,
        gap: 52,
        opacity: interpolate(frame, [95, 105], [1, 0], { ...clamp, easing: EASE }),
      }}
    >
      <Interactive.Div
        name="FeaturesKickerV"
        style={{
          fontFamily: FONT,
          fontSize: 38,
          letterSpacing: 14,
          color: "#2997ff",
          opacity: interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: EASE }),
        }}
      >
        WHY IPHONE
      </Interactive.Div>
      {FEATURES.map((f, i) => (
        <FeatureRowV key={f.title} index={i} title={f.title} sub={f.sub} />
      ))}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 3 — CSS iPhone reveal, stacked for vertical (6 – 8.5s)        */
/* ------------------------------------------------------------------ */
const PhoneMockV: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="PhoneV"
      style={{
        width: 310,
        height: 630,
        borderRadius: 52,
        padding: 12,
        background: "linear-gradient(145deg, #8e8e93, #3a3a3c 40%, #d4d4d8 70%, #636366)",
        boxShadow: "0 40px 120px rgba(41, 151, 255, 0.35)",
        scale: 0.92,
        opacity: interpolate(frame, [5, 18], [0, 1], { ...clamp, easing: EASE }),
        translate: interpolate(frame, [5, 38], ["0px 220px", "0px 0px"], {
          ...clamp,
          easing: SPRING,
        }),
      }}
    >
      <Interactive.Div
        name="PhoneScreenV"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 42,
          background: "linear-gradient(160deg, #0a2540 0%, #3b1d6e 55%, #000000 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 74,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Interactive.Div
          name="DynamicIslandV"
          style={{
            position: "absolute",
            top: 22,
            width: 110,
            height: 30,
            borderRadius: 15,
            backgroundColor: "#000000",
          }}
        />
        <Interactive.Div
          name="ScreenTimeV"
          style={{ fontFamily: FONT, fontWeight: 600, fontSize: 56, color: "#ffffff" }}
        >
          9:41
        </Interactive.Div>
        <Interactive.Div
          name="ScreenLabelV"
          style={{ fontFamily: FONT, fontSize: 34, color: "#a8c7fa", marginTop: 6 }}
        >
          iPhone
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
  );
};

const PhoneSceneV: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="PhoneSceneV"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 70,
        opacity: interpolate(frame, [67, 75], [1, 0], { ...clamp, easing: EASE }),
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Interactive.Div
          name="PhoneHeadlineV1"
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 120,
            lineHeight: 1.05,
            color: "#f5f5f7",
            opacity: interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: EASE }),
            translate: interpolate(frame, [0, 18], ["0px 50px", "0px 0px"], {
              ...clamp,
              easing: EASE,
            }),
          }}
        >
          Beyond
        </Interactive.Div>
        <Interactive.Div
          name="PhoneHeadlineV2"
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 120,
            lineHeight: 1.05,
            background: "linear-gradient(90deg, #2997ff, #a259ff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: interpolate(frame, [10, 22], [0, 1], { ...clamp, easing: EASE }),
            translate: interpolate(frame, [10, 28], ["0px 50px", "0px 0px"], {
              ...clamp,
              easing: EASE,
            }),
          }}
        >
          Pro.
        </Interactive.Div>
      </div>
      <PhoneMockV />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 4 — End card / CTA (8.5 – 10s)                                */
/* ------------------------------------------------------------------ */
const EndCardSceneV: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 6) * 0.025;

  return (
    <AbsoluteFill
      name="EndCardSceneV"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 100,
        paddingRight: 100,
        textAlign: "center",
      }}
    >
      <Interactive.Div
        name="EndTitleV"
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 150,
          color: "#f5f5f7",
          textShadow: "0 0 70px rgba(162, 89, 255, 0.5)",
          opacity: interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: EASE }),
          scale: interpolate(frame, [0, 22], [0.7, 1], {
            ...clamp,
            easing: SPRING,
            output: "perceptual-scale",
          }),
        }}
      >
        iPhone
      </Interactive.Div>
      <Interactive.Div
        name="EndPriceV"
        style={{
          fontFamily: FONT,
          fontSize: 44,
          color: "#86868b",
          marginTop: 18,
          opacity: interpolate(frame, [12, 24], [0, 1], { ...clamp, easing: EASE }),
        }}
      >
        From $799. Pre-order now.
      </Interactive.Div>
      <Interactive.Div
        name="BuyPillV"
        style={{
          marginTop: 44,
          padding: "20px 84px",
          borderRadius: 999,
          backgroundColor: "#0071e3",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 44,
          color: "#ffffff",
          opacity: interpolate(frame, [20, 32], [0, 1], { ...clamp, easing: EASE }),
          scale: pulse,
        }}
      >
        Buy
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 10s @ 30fps = 300 frames, 1080x1920 (9:16)                          */
/* ------------------------------------------------------------------ */
export const IphonePromoVertical: React.FC = () => {
  return (
    <AbsoluteFill name="IphonePromoVertical" style={{ backgroundColor: "#000000" }}>
      <Sequence from={0} durationInFrames={75}>
        <TitleSceneV />
      </Sequence>
      <Sequence from={75} durationInFrames={105}>
        <FeaturesSceneV />
      </Sequence>
      <Sequence from={180} durationInFrames={75}>
        <PhoneSceneV />
      </Sequence>
      <Sequence from={255} durationInFrames={45}>
        <EndCardSceneV />
      </Sequence>
    </AbsoluteFill>
  );
};
