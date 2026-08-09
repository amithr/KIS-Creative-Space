import type { CSSProperties } from "react";

type PixelRobotProps = {
  /** Display size in px (base art is 38×38). */
  size?: number;
  className?: string;
};

/** Pure-CSS pixel robot mark — 3px grid on a 38×38 red tile. */
export function PixelRobot({ size = 38, className }: PixelRobotProps) {
  const scale = size / 38;

  return (
    <span
      className={className ? `inline-block ${className}` : "inline-block"}
      aria-hidden
      style={{
        width: size,
        height: size,
        flex: "none",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "block",
          width: 38,
          height: 38,
          background: "#c8102e",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <span style={px(15, 2, 9, 3, "#f4f1ea")} />
        <span style={px(18, 5, 3, 6, "#f4f1ea")} />
        <span style={px(4, 11, 30, 21, "#f4f1ea")} />
        <span style={px(4, 11, 3, 3, "#c8102e")} />
        <span style={px(31, 11, 3, 3, "#c8102e")} />
        <span style={px(4, 29, 3, 3, "#c8102e")} />
        <span style={px(31, 29, 3, 3, "#c8102e")} />
        <span style={px(10, 17, 6, 6, "#c8102e")} />
        <span style={px(22, 17, 6, 6, "#c8102e")} />
        <span style={px(10, 26, 18, 3, "#c8102e")} />
      </span>
    </span>
  );
}

function px(
  left: number,
  top: number,
  width: number,
  height: number,
  background: string,
): CSSProperties {
  return {
    position: "absolute",
    left,
    top,
    width,
    height,
    background,
  };
}
