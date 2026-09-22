import { AbsoluteFill } from "remotion";

/**
 * GroundworkCompare — static primitive-parity fixture (540x960):
 * radial glow + blur(35px) + linear gradient bar + gradient text +
 * box-shadow card + spaced kicker. Mirrors the CafeReel glow pattern.
 * X80 twin: x80-video-engine/examples/kit/conform-groundwork.mjs
 */
const SANS = "Arial, 'Liberation Sans', sans-serif";

export const GroundworkCompare: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* ambient glow: radial disc, blurred, screen blend */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 120,
          width: 360,
          height: 360,
          borderRadius: 180,
          background:
            "radial-gradient(closest-side, rgba(47,127,224,0.55), rgba(0,0,0,0))",
          filter: "blur(35px)",
          mixBlendMode: "screen",
        }}
      />
      {/* linear gradient bar */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 560,
          width: 380,
          height: 8,
          borderRadius: 4,
          background: "linear-gradient(90deg, #2997ff, #a259ff)",
        }}
      />
      {/* gradient text */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 590,
          width: 540,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 96,
          lineHeight: 1,
          background: "linear-gradient(90deg, #2997ff, #a259ff)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Pro.
      </div>
      {/* box-shadow card */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 730,
          width: 300,
          height: 120,
          borderRadius: 24,
          backgroundColor: "#13253f",
          boxShadow: "0 20px 60px rgba(41, 151, 255, 0.35)",
        }}
      />
      {/* spaced kicker */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 60,
          width: 540,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 20,
          letterSpacing: 9,
          color: "#86868b",
        }}
      >
        INTRODUCING
      </div>
    </AbsoluteFill>
  );
};
