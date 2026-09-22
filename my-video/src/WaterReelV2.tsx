import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: DISPLAY } = loadAnton();
const { fontFamily: BODY } = loadInter("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const PUNCH = Easing.bezier(0.12, 0.9, 0.25, 1);

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const GRAIN =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'240\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'240\' height=\'240\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")';

/* Cut flash + punch-in shared by every fast cut */
const useCut = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 3], [0.65, 0], { ...clamp, easing: Easing.linear });
  const punch = interpolate(frame, [0, 9], [1.16, 1], { ...clamp, easing: PUNCH });
  return { frame, flash, punch };
};

const Flash: React.FC<{ opacity: number }> = ({ opacity }) => (
  <Interactive.Div
    name="CutFlash"
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: "#ffffff",
      opacity,
      pointerEvents: "none",
    }}
  />
);

/* Animated CSS light-leak wash over a cut (no WebGL needed) */
const Leak: React.FC<{ seed: number; color?: string }> = ({
  seed,
  color = "255,150,60",
}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [0, 49], [-500, 1300], {
    ...clamp,
    easing: Easing.linear,
  });
  const breathe = interpolate(frame, [0, 25, 49], [0.22, 0.5, 0.22], { ...clamp });
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
          background: `radial-gradient(closest-side, rgba(${color},0.6), transparent)`,
          filter: "blur(70px)",
          rotate: "18deg",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -300,
          left: sweep - 900 + off,
          width: 620,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, rgba(${color},0.4), transparent)`,
          filter: "blur(80px)",
          rotate: "-14deg",
        }}
      />
    </Interactive.Div>
  );
};

/* Full-bleed photo with slow Ken Burns drift */
const PhotoBg: React.FC<{ name: string; src: string; from?: number; to?: number }> = ({
  name,
  src,
  from = 1.14,
  to = 1.02,
}) => {
  const frame = useCurrentFrame();
  return (
    <Img
      name={name}
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        scale: interpolate(frame, [0, 49], [from, to], { ...clamp, easing: Easing.linear }),
      }}
    />
  );
};

const Kicker: React.FC<{ name: string; frame: number; at?: number; children: React.ReactNode }> = ({
  name,
  frame,
  at = 4,
  children,
}) => (
  <Interactive.Div
    name={name}
    style={{
      fontFamily: BODY,
      fontWeight: 600,
      fontSize: 38,
      letterSpacing: 12,
      color: "#ffb35c",
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

/* ------------------------------------------------------------------ */
/* CUT 1 — "INDIA IS RUNNING DRY" over real drought photo (0 – 50)     */
/* ------------------------------------------------------------------ */
const CutDry: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutDry" style={{ backgroundColor: "#3a2410" }}>
      <PhotoBg name="DryPhoto" src="assets/drought.jpg" />
      <AbsoluteFill
        name="DryGrade"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,10,2,0.25) 0%, rgba(20,10,2,0.05) 40%, rgba(20,10,2,0.72) 100%)",
          scale: punch,
        }}
      />
      <Leak seed={1} />
      <AbsoluteFill
        name="DryText"
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
        <Kicker name="DryKicker" frame={frame}>
          A CRISIS IN PLAIN SIGHT
        </Kicker>
        <Interactive.Div
          name="DryTitle"
          style={{
            fontFamily: DISPLAY,
            fontSize: 148,
            lineHeight: 1.02,
            color: "#fff8ec",
            marginTop: 22,
            textShadow: "0 8px 50px rgba(0,0,0,0.75)",
            opacity: interpolate(frame, [6, 16], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [6, 24], [0.72, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          INDIA IS RUNNING DRY
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 2 — "600 MILLION" over cracked-mud texture (50 – 100)           */
/* ------------------------------------------------------------------ */
const CutStat: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutStat" style={{ backgroundColor: "#120b06" }}>
      <PhotoBg name="StatTexture" src="assets/cracked-mud.jpg" from={1.2} to={1.05} />
      <AbsoluteFill
        name="StatGrade"
        style={{
          background:
            "radial-gradient(1000px 900px at 50% 108%, rgba(180,85,45,0.4), transparent 70%), rgba(10,5,2,0.78)",
          scale: punch,
        }}
      />
      <Leak seed={2} />
      <AbsoluteFill
        name="StatText"
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
        <Interactive.Div
          name="StatNumber"
          style={{
            fontFamily: DISPLAY,
            fontSize: 250,
            lineHeight: 1,
            color: "#ff7a3c",
            textShadow: "0 0 80px rgba(255,122,60,0.45)",
            opacity: interpolate(frame, [4, 13], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [4, 22], [0.7, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          600M
        </Interactive.Div>
        <Interactive.Div
          name="StatLabel"
          style={{
            fontFamily: BODY,
            fontWeight: 600,
            fontSize: 58,
            lineHeight: 1.3,
            color: "#f5ede0",
            marginTop: 26,
            opacity: interpolate(frame, [14, 26], [0, 1], { ...clamp, easing: EASE }),
            translate: interpolate(frame, [14, 30], ["0px 40px", "0px 0px"], {
              ...clamp,
              easing: EASE,
            }),
          }}
        >
          Indians face extreme water stress
        </Interactive.Div>
        <Interactive.Div
          name="StatDrops"
          style={{ display: "flex", gap: 40, marginTop: 56 }}
        >
          {[0, 1, 2].map((i) => (
            <Img
              key={i}
              name={`StatDrop${i + 1}`}
              src={staticFile("assets/drop-white.svg")}
              style={{
                width: 84,
                height: 84,
                opacity: interpolate(frame, [24 + i * 6, 32 + i * 6], [0, 0.9], {
                  ...clamp,
                  easing: EASE,
                }),
                translate: interpolate(frame, [24 + i * 6, 38 + i * 6], ["0px 30px", "0px 0px"], {
                  ...clamp,
                  easing: EASE,
                }),
              }}
            />
          ))}
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 3 — DAY ZERO over dry pump photo (100 – 150)                    */
/* ------------------------------------------------------------------ */
const CutDayZero: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutDayZero" style={{ backgroundColor: "#0d1117" }}>
      <PhotoBg name="PumpPhoto" src="assets/water-pump.jpg" />
      <AbsoluteFill
        name="DayZeroGrade"
        style={{
          background:
            "radial-gradient(900px 800px at 50% 20%, rgba(200,16,46,0.30), transparent 65%), rgba(8,4,6,0.62)",
          scale: punch,
        }}
      />
      <Leak seed={3} color="255,70,80" />
      <AbsoluteFill
        name="DayZeroText"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 90,
          paddingRight: 90,
          textAlign: "center",
        }}
      >
        <Kicker name="DayZeroKicker" frame={frame}>
          CHENNAI · 2019
        </Kicker>
        <Interactive.Div
          name="DayZeroTitle"
          style={{
            fontFamily: DISPLAY,
            fontSize: 210,
            color: "#ff4d5e",
            letterSpacing: 4,
            textShadow: "0 0 70px rgba(255,60,80,0.5)",
            opacity: interpolate(frame, [5, 14], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [5, 22], [1.25, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          DAY ZERO
        </Interactive.Div>
        <Interactive.Div
          name="DayZeroSub"
          style={{
            fontFamily: BODY,
            fontSize: 50,
            lineHeight: 1.4,
            color: "#f2f2f2",
            marginTop: 20,
            opacity: interpolate(frame, [16, 28], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          A metro city of millions watched its taps run dry.
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 4 — She walks, real photo (150 – 200)                           */
/* ------------------------------------------------------------------ */
const CutWalk: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutWalk" style={{ backgroundColor: "#1a1208" }}>
      <PhotoBg name="WalkPhoto" src="assets/woman-water.jpg" from={1.16} to={1.04} />
      <AbsoluteFill
        name="WalkGrade"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,8,2,0.55) 0%, rgba(15,8,2,0.05) 35%, rgba(15,8,2,0.78) 100%)",
          scale: punch,
        }}
      />
      <Leak seed={4} />
      <AbsoluteFill
        name="WalkText"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 300,
          paddingLeft: 90,
          paddingRight: 90,
          textAlign: "center",
        }}
      >
        <Interactive.Div
          name="WalkTitle"
          style={{
            fontFamily: DISPLAY,
            fontSize: 118,
            lineHeight: 1.05,
            color: "#fff3e2",
            textShadow: "0 6px 34px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [4, 14], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [4, 22], [0.75, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          SHE WALKS 5 KM
        </Interactive.Div>
        <Interactive.Div
          name="WalkSub"
          style={{
            fontFamily: BODY,
            fontSize: 48,
            lineHeight: 1.4,
            color: "#ffcf99",
            marginTop: 20,
            opacity: interpolate(frame, [16, 28], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          every single day — for one pot of water.
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 5 — 2030 warning over cracked earth (200 – 250)                 */
/* ------------------------------------------------------------------ */
const CutWarning: React.FC = () => {
  const { frame, flash, punch } = useCut();
  const shake = Math.sin(frame * 0.9) * 6;

  return (
    <AbsoluteFill name="CutWarning" style={{ backgroundColor: "#160404" }}>
      <PhotoBg name="WarningTexture" src="assets/cracked-mud.jpg" from={1.1} to={1.22} />
      <AbsoluteFill
        name="WarningGrade"
        style={{
          background:
            "radial-gradient(1000px 900px at 50% 50%, rgba(255,60,40,0.32), transparent 70%), rgba(14,2,2,0.8)",
          scale: punch,
          translate: `${shake}px 0px`,
        }}
      />
      <Leak seed={5} color="255,70,60" />
      <AbsoluteFill
        name="WarningText"
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
        <Interactive.Div
          name="WarningYear"
          style={{
            fontFamily: DISPLAY,
            fontSize: 260,
            lineHeight: 1,
            color: "#ff3b30",
            textShadow: "0 0 90px rgba(255,59,48,0.55)",
            opacity: interpolate(frame, [4, 13], [0, 1], { ...clamp, easing: EASE }),
            scale: interpolate(frame, [4, 24], [1.3, 1], {
              ...clamp,
              easing: PUNCH,
              output: "perceptual-scale",
            }),
          }}
        >
          2030
        </Interactive.Div>
        <Interactive.Div
          name="WarningLabel"
          style={{
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 60,
            lineHeight: 1.35,
            color: "#ffe9e4",
            marginTop: 26,
            opacity: interpolate(frame, [16, 28], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          40% of India may have NO drinking water
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 6 — Hope: droplet icon + trickling water sound (250 – 300)      */
/* ------------------------------------------------------------------ */
const CutHope: React.FC = () => {
  const { frame, flash } = useCut();
  const dropSettle = interpolate(frame, [6, 26], [-160, 0], { ...clamp, easing: PUNCH });

  return (
    <AbsoluteFill name="CutHope" style={{ backgroundColor: "#02131f" }}>
      <AbsoluteFill
        name="HopeGrade"
        style={{
          background:
            "radial-gradient(900px 1100px at 50% 30%, rgba(41,151,255,0.5), transparent 65%), linear-gradient(180deg, #06283f 0%, #02131f 70%)",
        }}
      />
      <Leak seed={6} color="90,160,255" />
      <AbsoluteFill
        name="HopeDrop"
        style={{ display: "flex", justifyContent: "center", paddingTop: 400 }}
      >
        <Img
          name="HopeDroplet"
          src={staticFile("assets/drop-white.svg")}
          style={{
            width: 210,
            height: 210,
            filter: "drop-shadow(0 0 60px rgba(120,190,255,0.9))",
            translate: `0px ${dropSettle}px`,
            opacity: interpolate(frame, [2, 12], [0, 1], { ...clamp, easing: EASE }),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        name="HopeText"
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
        <Interactive.Div
          name="HopeTitle"
          style={{
            fontFamily: DISPLAY,
            fontSize: 116,
            lineHeight: 1.1,
            color: "#ffffff",
            textShadow: "0 0 60px rgba(90,180,255,0.6)",
            opacity: interpolate(frame, [18, 30], [0, 1], { ...clamp, easing: EASE }),
            translate: interpolate(frame, [18, 34], ["0px 44px", "0px 0px"], {
              ...clamp,
              easing: EASE,
            }),
          }}
        >
          EVERY DROP COUNTS
        </Interactive.Div>
        <Interactive.Div
          name="HopeSub"
          style={{
            fontFamily: BODY,
            fontSize: 48,
            color: "#a8d4ff",
            marginTop: 22,
            opacity: interpolate(frame, [28, 40], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          Save water. Save life.
        </Interactive.Div>
        <Interactive.Div
          name="Credits"
          style={{
            fontFamily: BODY,
            fontSize: 22,
            lineHeight: 1.6,
            color: "rgba(168,212,255,0.55)",
            marginTop: 40,
            opacity: interpolate(frame, [34, 46], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          Music: Kevin MacLeod – Sad Trio (CC-BY) · Photos: Wikimedia Commons
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* WATER REEL V2 — 6 fast cuts x 50f = 10s @ 30fps, 1080x1920          */
/* Music + whoosh SFX + trickling-water ambience on the hope cut       */
/* ------------------------------------------------------------------ */
export const WaterReelV2: React.FC = () => {
  return (
    <AbsoluteFill name="WaterReelV2" style={{ backgroundColor: "#000000" }}>
      <Audio
        name="MusicBed"
        src={staticFile("assets/sad-trio.mp3")}
        volume={(f: number) =>
          interpolate(f, [0, 20, 268, 299], [0, 0.34, 0.34, 0], { ...clamp })
        }
      />
      <Sequence from={0} durationInFrames={50}>
        <CutDry />
      </Sequence>
      <Sequence from={50} durationInFrames={50}>
        <CutStat />
      </Sequence>
      <Sequence from={100} durationInFrames={50}>
        <CutDayZero />
      </Sequence>
      <Sequence from={150} durationInFrames={50}>
        <CutWalk />
      </Sequence>
      <Sequence from={200} durationInFrames={50}>
        <CutWarning />
      </Sequence>
      <Sequence from={250} durationInFrames={50}>
        <CutHope />
      </Sequence>
      {/* whoosh SFX riding each cut */}
      {[48, 98, 148, 198, 248].map((at) => (
        <Sequence key={at} from={at} layout="none">
          <Audio name={`Whoosh${at}`} src={staticFile("assets/whoosh.wav")} volume={0.55} />
        </Sequence>
      ))}
      {/* water returns on the hope cut */}
      <Sequence from={248} layout="none">
        <Audio
          name="TrickleAmbience"
          src={staticFile("assets/trickle.ogg")}
          volume={(f: number) => interpolate(f, [0, 25], [0, 0.5], { ...clamp })}
        />
      </Sequence>
      {/* cinematic vignette + film grain over everything */}
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
          opacity: 0.09,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
