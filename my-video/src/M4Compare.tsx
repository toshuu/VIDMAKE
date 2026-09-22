import { AbsoluteFill } from "remotion";

/** M4 cross-check: Noto Sans Latin + Devanagari (fonts installed via ~/.fonts). */
export const M4Compare: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1626" }}>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 700,
          fontFamily: "Noto Sans",
          fontSize: 84,
          color: "#ffffff",
        }}
      >
        X80 ENGINE
      </div>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 850,
          fontFamily: "Noto Sans Devanagari",
          fontSize: 64,
          color: "#f5a524",
        }}
      >
        नमस्ते दुनिया
      </div>
    </AbsoluteFill>
  );
};
