import {
  AbsoluteFill,
  Easing,
  Interactive,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio, Video } from "@remotion/media";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPlayfairItalic } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: SERIF } = loadPlayfair("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
const { fontFamily: SERIF_ITALIC } = loadPlayfairItalic("italic", {
  weights: ["700"],
  subsets: ["latin"],
});
const { fontFamily: SANS } = loadInter("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const CREAM = "#f7ead9";
const CARAMEL = "#e8a54b";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const PUNCH = Easing.bezier(0.12, 0.9, 0.25, 1);

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const GRAIN =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'240\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'240\' height=\'240\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")';

const useCut = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 3], [0.6, 0], { ...clamp, easing: Easing.linear });
  const punch = interpolate(frame, [0, 10], [1.14, 1], { ...clamp, easing: PUNCH });
  return { frame, flash, punch };
};

const Flash: React.FC<{ opacity: number }> = ({ opacity }) => (
  <Interactive.Div
    name="CutFlash"
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: "#fff6e8",
      opacity,
      pointerEvents: "none",
    }}
  />
);

/* Warm CSS light-leak wash (no WebGL needed) */
const Leak: React.FC<{ seed: number; color?: string }> = ({
  seed,
  color = "255,170,90",
}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [0, 59], [-500, 1300], {
    ...clamp,
    easing: Easing.linear,
  });
  const breathe = interpolate(frame, [0, 30, 59], [0.2, 0.45, 0.2], { ...clamp });
  const off = (seed * 173) % 500;
  return (
    <Interactive.Div
      name="LightLeak"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: breathe,
        mixBlendMode: "screen",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -260,
          left: sweep - 420 + off,
          width: 520,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, rgba(${color},0.55), transparent)`,
          filter: "blur(70px)",
          rotate: "18deg",
        }}
      />
    </Interactive.Div>
  );
};

const Kicker: React.FC<{ name: string; frame: number; at?: number; children: React.ReactNode }> = ({
  name,
  frame,
  at = 5,
  children,
}) => (
  <Interactive.Div
    name={name}
    style={{
      fontFamily: SANS,
      fontWeight: 600,
      fontSize: 36,
      letterSpacing: 14,
      color: CARAMEL,
      opacity: interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: EASE }),
      translate: interpolate(frame, [at, at + 14], ["0px 26px", "0px 0px"], {
        ...clamp,
        easing: EASE,
      }),
    }}
  >
    {children}
  </Interactive.Div>
);

/* Clip cut background with gentle push-in */
const ClipBg: React.FC<{ name: string; src: string }> = ({ name, src }) => {
  const frame = useCurrentFrame();
  return (
    <Video
      name={name}
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        scale: interpolate(frame, [0, 59], [1.12, 1.02], { ...clamp, easing: Easing.linear }),
      }}
    />
  );
};

const BottomText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    name="BottomText"
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingBottom: 330,
      paddingLeft: 90,
      paddingRight: 90,
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

const Headline: React.FC<{ name: string; frame: number; at: number; children: React.ReactNode }> = ({
  name,
  frame,
  at,
  children,
}) => (
  <Interactive.Div
    name={name}
    style={{
      fontFamily: SERIF,
      fontWeight: 900,
      fontSize: 118,
      lineHeight: 1.08,
      color: CREAM,
      textShadow: "0 8px 44px rgba(0,0,0,0.7)",
      opacity: interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: EASE }),
      translate: interpolate(frame, [at, at + 16], ["0px 60px", "0px 0px"], {
        ...clamp,
        easing: EASE,
      }),
    }}
  >
    {children}
  </Interactive.Div>
);

const ItalicLine: React.FC<{ name: string; frame: number; at: number; children: React.ReactNode }> = ({
  name,
  frame,
  at,
  children,
}) => (
  <Interactive.Div
    name={name}
    style={{
      fontFamily: SERIF_ITALIC,
      fontSize: 64,
      color: CARAMEL,
      marginTop: 10,
      textShadow: "0 4px 26px rgba(0,0,0,0.7)",
      opacity: interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: EASE }),
    }}
  >
    {children}
  </Interactive.Div>
);

const Grade: React.FC = () => (
  <AbsoluteFill
    name="Grade"
    style={{
      background:
        "linear-gradient(180deg, rgba(12,5,2,0.5) 0%, rgba(12,5,2,0.02) 32%, rgba(12,5,2,0.78) 100%)",
    }}
  />
);

/* Hand-drawn flat-white cup mark with rising steam */
const CupMark: React.FC<{ frame: number }> = ({ frame }) => {
  const steam = (phase: number) =>
    interpolate((frame + phase) % 30, [0, 30], [6, -14], { ...clamp, easing: Easing.linear });
  const steamOp = (phase: number) =>
    interpolate((frame + phase) % 30, [0, 8, 22, 30], [0, 0.9, 0.9, 0], { ...clamp });
  const s = { stroke: CREAM, strokeWidth: 9, fill: "none", strokeLinecap: "round" } as const;
  return (
    <svg width="150" height="150" viewBox="0 0 150 150">
      <path d="M38 62 h56 v34 a26 26 0 0 1 -26 26 h-4 a26 26 0 0 1 -26 -26 z" {...s} />
      <path d="M94 68 h10 a14 14 0 0 1 0 28 h-12" {...s} />
      <path d="M30 132 h72" {...s} />
      <path
        d="M58 44 q-7 -9 0 -18 q7 -9 0 -18"
        {...s}
        strokeWidth={6}
        opacity={steamOp(0)}
        transform={`translate(0 ${steam(0)})`}
      />
      <path
        d="M78 44 q-7 -9 0 -18 q7 -9 0 -18"
        {...s}
        strokeWidth={6}
        opacity={steamOp(15)}
        transform={`translate(0 ${steam(15)})`}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 1 — interior pan + title (0 – 60)                               */
/* ------------------------------------------------------------------ */
const CutIntro: React.FC = () => {
  const { frame, flash, punch } = useCut();
  return (
    <AbsoluteFill name="CutIntro" style={{ backgroundColor: "#140c06" }}>
      <ClipBg name="IntroClip" src="cafe/cut1.mp4" />
      <AbsoluteFill name="IntroGrade" style={{ scale: punch }}>
        <Grade />
      </AbsoluteFill>
      <Leak seed={1} />
      <BottomText>
        <Kicker name="IntroKicker" frame={frame}>
          A COZY CORNER IN TOWN
        </Kicker>
        <Headline name="IntroTitle" frame={frame} at={10}>
          Slow Mornings,
        </Headline>
        <ItalicLine name="IntroSub" frame={frame} at={22}>
          perfectly brewed.
        </ItalicLine>
      </BottomText>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 2 — latte-art pour (60 – 120)                                   */
/* ------------------------------------------------------------------ */
const CutPour: React.FC = () => {
  const { frame, flash, punch } = useCut();
  return (
    <AbsoluteFill name="CutPour" style={{ backgroundColor: "#140c06" }}>
      <ClipBg name="PourClip" src="cafe/cut2.mp4" />
      <AbsoluteFill name="PourGrade" style={{ scale: punch }}>
        <Grade />
      </AbsoluteFill>
      <Leak seed={2} />
      <BottomText>
        <Kicker name="PourKicker" frame={frame}>
          SINGLE-ORIGIN ESPRESSO
        </Kicker>
        <Headline name="PourTitle" frame={frame} at={10}>
          Poured with Love
        </Headline>
      </BottomText>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 3 — signature cup (120 – 180)                                   */
/* ------------------------------------------------------------------ */
const CutRoast: React.FC = () => {
  const { frame, flash, punch } = useCut();
  return (
    <AbsoluteFill name="CutRoast" style={{ backgroundColor: "#140c06" }}>
      <ClipBg name="RoastClip" src="cafe/cut3.mp4" />
      <AbsoluteFill name="RoastGrade" style={{ scale: punch }}>
        <Grade />
      </AbsoluteFill>
      <Leak seed={3} />
      <BottomText>
        <Kicker name="RoastKicker" frame={frame}>
          BEANS, GROUND DAILY
        </Kicker>
        <Headline name="RoastTitle" frame={frame} at={10}>
          Freshly Roasted
        </Headline>
      </BottomText>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 4 — warm interior (180 – 240)                                   */
/* ------------------------------------------------------------------ */
const CutVibes: React.FC = () => {
  const { frame, flash, punch } = useCut();
  return (
    <AbsoluteFill name="CutVibes" style={{ backgroundColor: "#140c06" }}>
      <ClipBg name="VibesClip" src="cafe/cut4.mp4" />
      <AbsoluteFill name="VibesGrade" style={{ scale: punch }}>
        <Grade />
      </AbsoluteFill>
      <Leak seed={4} />
      <BottomText>
        <Kicker name="VibesKicker" frame={frame}>
          COZY CORNERS · WARM LIGHTS
        </Kicker>
        <Headline name="VibesTitle" frame={frame} at={10}>
          Good Vibes Only
        </Headline>
      </BottomText>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 5 — end card (240 – 300)                                        */
/* ------------------------------------------------------------------ */
const CutEnd: React.FC = () => {
  const { frame, flash } = useCut();
  return (
    <AbsoluteFill name="CutEnd" style={{ backgroundColor: "#140c06" }}>
      <ClipBg name="EndClip" src="cafe/cut5.mp4" />
      <AbsoluteFill
        name="EndGrade"
        style={{ background: "rgba(12,5,2,0.62)" }}
      />
      <Leak seed={5} />
      <AbsoluteFill
        name="EndCard"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 90,
          paddingRight: 90,
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: interpolate(frame, [4, 16], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [4, 24], [0.6, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          <CupMark frame={frame} />
        </div>
        <Interactive.Div
          name="BrandName"
          style={{
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: 128,
            color: CREAM,
            marginTop: 26,
            textShadow: "0 8px 44px rgba(0,0,0,0.7)",
            opacity: interpolate(frame, [14, 26], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          CAFÉ AROMA
        </Interactive.Div>
        <Interactive.Div
          name="BrandHours"
          style={{
            fontFamily: SANS,
            fontSize: 42,
            letterSpacing: 6,
            color: CARAMEL,
            marginTop: 20,
            opacity: interpolate(frame, [24, 36], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          OPEN DAILY · 8 AM – 11 PM
        </Interactive.Div>
        <Interactive.Div
          name="Credits"
          style={{
            fontFamily: SANS,
            fontSize: 22,
            lineHeight: 1.6,
            color: "rgba(247,234,217,0.55)",
            marginTop: 44,
            opacity: interpolate(frame, [34, 48], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          Music: Kevin MacLeod – BossaBossa (CC-BY) · Footage: your Shorts
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CAFÉ REEL — 5 cuts x 60f = 10s @ 30fps, 1080x1920                   */
/* Bossa bed + whoosh SFX · source audio stripped (visuals only)       */
/* ------------------------------------------------------------------ */
export const CafeReel: React.FC = () => {
  return (
    <AbsoluteFill name="CafeReel" style={{ backgroundColor: "#000000" }}>
      <Audio
        name="MusicBed"
        src={staticFile("cafe/music.mp3")}
        volume={(f: number) =>
          interpolate(f, [0, 25, 270, 299], [0, 0.42, 0.42, 0], { ...clamp })
        }
      />
      <Sequence from={0} durationInFrames={60}>
        <CutIntro />
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <CutPour />
      </Sequence>
      <Sequence from={120} durationInFrames={60}>
        <CutRoast />
      </Sequence>
      <Sequence from={180} durationInFrames={60}>
        <CutVibes />
      </Sequence>
      <Sequence from={240} durationInFrames={60}>
        <CutEnd />
      </Sequence>
      {[58, 118, 178, 238].map((at) => (
        <Sequence key={at} from={at} layout="none">
          <Audio name={`Whoosh${at}`} src={staticFile("assets/whoosh.wav")} volume={0.5} />
        </Sequence>
      ))}
      <Interactive.Div
        name="Vignette"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <Interactive.Div
        name="FilmGrain"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: GRAIN,
          opacity: 0.08,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
