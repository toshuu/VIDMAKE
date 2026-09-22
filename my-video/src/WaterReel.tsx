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
const PUNCH = Easing.bezier(0.12, 0.9, 0.25, 1);

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

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

const Kicker: React.FC<{ name: string; frame: number; at?: number; children: React.ReactNode }> = ({
  name,
  frame,
  at = 4,
  children,
}) => (
  <Interactive.Div
    name={name}
    style={{
      fontFamily: FONT,
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

/* Hand-drawn crack lines for the scorched-earth scenes */
const Cracks: React.FC<{ opacity?: number }> = ({ opacity = 0.85 }) => (
  <svg
    viewBox="0 0 1080 1920"
    preserveAspectRatio="xMidYMid slice"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity }}
  >
    <g stroke="#4a2c14" strokeLinecap="round" fill="none">
      <path strokeWidth={14} d="M540 700 L505 900 L560 1100 L510 1300 L555 1500 L520 1720" />
      <path strokeWidth={9} d="M520 1000 L380 1080 L260 1060 L150 1120" />
      <path strokeWidth={9} d="M540 1200 L690 1280 L830 1260 L950 1330" />
      <path strokeWidth={7} d="M530 1400 L420 1500 L400 1620" />
      <path strokeWidth={7} d="M545 1520 L660 1600 L700 1720" />
      <path strokeWidth={6} d="M510 850 L420 900 L350 890" />
      <path strokeWidth={6} d="M555 1080 L650 1120 L730 1110" />
    </g>
  </svg>
);

const Pot: React.FC<{ size?: number; color?: string }> = ({
  size = 120,
  color = "#b4552d",
}) => (
  <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div
      style={{
        width: size * 0.42,
        height: size * 0.2,
        backgroundColor: color,
        borderRadius: size * 0.08,
      }}
    />
    <div
      style={{
        width: size,
        height: size * 1.05,
        backgroundColor: color,
        borderRadius: "50% 50% 46% 46%",
        marginTop: -size * 0.04,
        boxShadow: "inset -14px -18px 30px rgba(0,0,0,0.35)",
      }}
    />
  </div>
);

/* ------------------------------------------------------------------ */
/* CUT 1 — "INDIA IS RUNNING DRY" (0 – 50)                             */
/* ------------------------------------------------------------------ */
const CutDry: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutDry" style={{ backgroundColor: "#c98f4e" }}>
      <AbsoluteFill
        name="DryGrade"
        style={{
          background: "linear-gradient(180deg, #e8c07a 0%, #d99a4e 34%, #a06a35 62%, #5e3a1c 100%)",
          scale: punch,
        }}
      />
      {/* harsh sun */}
      <Interactive.Div
        name="Sun"
        style={{
          position: "absolute",
          top: 330,
          left: 390,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, #fff6dd 0%, #ffdf9e 45%, rgba(255,200,120,0) 72%)",
          opacity: interpolate(frame, [2, 14], [0, 1], { ...clamp, easing: EASE }),
        }}
      />
      <Cracks />
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
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 118,
            lineHeight: 1.04,
            color: "#fff8ec",
            marginTop: 22,
            textShadow: "0 6px 40px rgba(60,25,0,0.6)",
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
/* CUT 2 — "600 MILLION" stat (50 – 100)                               */
/* ------------------------------------------------------------------ */
const CutStat: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutStat" style={{ backgroundColor: "#120b06" }}>
      <AbsoluteFill
        name="StatGrade"
        style={{
          background:
            "radial-gradient(1000px 900px at 50% 108%, rgba(180,85,45,0.55), transparent 70%), #120b06",
          scale: punch,
        }}
      />
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
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 200,
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
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 62,
            lineHeight: 1.25,
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
          name="StatPots"
          style={{
            display: "flex",
            gap: 34,
            marginTop: 60,
            opacity: interpolate(frame, [24, 36], [0, 0.9], { ...clamp, easing: EASE }),
          }}
        >
          <Pot size={110} />
          <Pot size={110} />
          <Pot size={110} />
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 3 — DAY ZERO, Chennai 2019 (100 – 150)                          */
/* ------------------------------------------------------------------ */
const Tap: React.FC<{ frame: number }> = ({ frame }) => {
  const drip = frame % 26;
  return (
    <div style={{ position: "relative", width: 200, height: 340 }}>
      <div style={{ position: "absolute", left: 80, top: 0, width: 44, height: 200, backgroundColor: "#9aa0a6", borderRadius: 10 }} />
      <div style={{ position: "absolute", left: 20, top: 170, width: 150, height: 42, backgroundColor: "#9aa0a6", borderRadius: 10 }} />
      <div style={{ position: "absolute", left: 118, top: 196, width: 26, height: 60, backgroundColor: "#7a8087", borderRadius: 8 }} />
      <div style={{ position: "absolute", left: 60, top: -34, width: 84, height: 26, backgroundColor: "#c8102e", borderRadius: 13 }} />
      {/* the last drip */}
      <div
        style={{
          position: "absolute",
          left: 118,
          top: 256,
          width: 26,
          height: 34,
          borderRadius: "50%",
          backgroundColor: "#7fc4ff",
          opacity: interpolate(drip, [0, 18, 25], [0, 1, 0], { ...clamp, easing: Easing.linear }),
          translate: interpolate(drip, [0, 25], ["0px 0px", "0px 90px"], {
            ...clamp,
            easing: Easing.linear,
          }),
        }}
      />
    </div>
  );
};

const CutDayZero: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutDayZero" style={{ backgroundColor: "#0d1117" }}>
      <AbsoluteFill
        name="DayZeroGrade"
        style={{
          background:
            "radial-gradient(900px 800px at 50% 20%, rgba(200,16,46,0.28), transparent 65%), #0d1117",
          scale: punch,
        }}
      />
      <AbsoluteFill
        name="DayZeroText"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
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
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 170,
            color: "#ff4d5e",
            letterSpacing: 6,
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
            fontFamily: FONT,
            fontSize: 52,
            lineHeight: 1.35,
            color: "#e8e8e8",
            marginTop: 16,
            opacity: interpolate(frame, [16, 28], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          A metro city of millions watched its taps run dry.
        </Interactive.Div>
        <div
          style={{
            marginTop: 46,
            opacity: interpolate(frame, [22, 34], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          <Tap frame={frame} />
        </div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* CUT 4 — She walks for water (150 – 200)                             */
/* ------------------------------------------------------------------ */
const CutWalk: React.FC = () => {
  const { frame, flash, punch } = useCut();

  return (
    <AbsoluteFill name="CutWalk" style={{ backgroundColor: "#1a1208" }}>
      <AbsoluteFill
        name="WalkGrade"
        style={{
          background:
            "linear-gradient(180deg, #3a2410 0%, #241407 55%, #120903 100%)",
          scale: punch,
        }}
      />
      {/* marching pots — the daily queue */}
      {[0, 1, 2].map((i) => {
        const local = frame - i * 9;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 300 + (i % 2) * 130,
              left: 0,
              opacity: interpolate(local, [0, 8, 40, 48], [0, 1, 1, 0], {
                ...clamp,
                easing: EASE,
              }),
              translate: interpolate(local, [0, 50], ["-220px 0px", "1150px 0px"], {
                ...clamp,
                easing: Easing.linear,
              }),
            }}
          >
            <Pot size={120 - i * 12} color={i === 1 ? "#c96a35" : "#8f3d1f"} />
          </div>
        );
      })}
      <AbsoluteFill
        name="WalkText"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 330,
          paddingLeft: 90,
          paddingRight: 90,
          textAlign: "center",
        }}
      >
        <Interactive.Div
          name="WalkTitle"
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 104,
            lineHeight: 1.1,
            color: "#fff3e2",
            textShadow: "0 6px 34px rgba(0,0,0,0.7)",
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
            fontFamily: FONT,
            fontSize: 50,
            lineHeight: 1.35,
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
/* CUT 5 — 2030 warning (200 – 250)                                    */
/* ------------------------------------------------------------------ */
const CutWarning: React.FC = () => {
  const { frame, flash, punch } = useCut();
  const shake = Math.sin(frame * 0.9) * 6;

  return (
    <AbsoluteFill name="CutWarning" style={{ backgroundColor: "#160404" }}>
      <AbsoluteFill
        name="WarningGrade"
        style={{
          background:
            "radial-gradient(1000px 900px at 50% 50%, rgba(255,60,40,0.30), transparent 70%), #160404",
          scale: punch,
          translate: `${shake}px 0px`,
        }}
      />
      <Cracks opacity={0.5} />
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
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 220,
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
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1.3,
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
/* CUT 6 — Hope: every drop counts (250 – 300)                         */
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
      {/* water droplet */}
      <AbsoluteFill
        name="HopeDrop"
        style={{ display: "flex", justifyContent: "center", paddingTop: 400 }}
      >
        <Interactive.Div
          name="Droplet"
          style={{
            width: 190,
            height: 190,
            background: "linear-gradient(160deg, #7fc4ff, #0071e3)",
            borderRadius: "50% 4% 50% 50%",
            rotate: "45deg",
            boxShadow: "0 0 110px rgba(80,170,255,0.8)",
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
          paddingBottom: 420,
          paddingLeft: 90,
          paddingRight: 90,
          textAlign: "center",
        }}
      >
        <Interactive.Div
          name="HopeTitle"
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 104,
            lineHeight: 1.12,
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
            fontFamily: FONT,
            fontSize: 48,
            color: "#a8d4ff",
            marginTop: 22,
            opacity: interpolate(frame, [28, 40], [0, 1], { ...clamp, easing: EASE }),
          }}
        >
          Save water. Save life.
        </Interactive.Div>
      </AbsoluteFill>
      <Flash opacity={flash} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 6 fast cuts x 50 frames = 300 frames = 10s @ 30fps, 1080x1920       */
/* ------------------------------------------------------------------ */
export const WaterReel: React.FC = () => {
  return (
    <AbsoluteFill name="WaterReel" style={{ backgroundColor: "#000000" }}>
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
      {/* cinematic vignette over everything */}
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
    </AbsoluteFill>
  );
};
