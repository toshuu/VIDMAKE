import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/** M3 cross-check: bg + red rect, same motion as X80 rectA (frame 140 → x≈412). */
export const M3Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 299], [0, 880]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1626" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: 400,
          width: 200,
          height: 200,
          backgroundColor: "#e5484d",
        }}
      />
    </AbsoluteFill>
  );
};
