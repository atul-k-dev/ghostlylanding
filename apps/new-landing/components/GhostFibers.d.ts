import type { ComponentPropsWithoutRef } from "react";

export interface GhostFibersProps extends ComponentPropsWithoutRef<"div"> {
  glowColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  gradient?: "depth" | "along" | "across";
  speed?: number;
  scale?: number;
  rotation?: number;
  rollSpeed?: number;
  layers?: number;
  waves?: number;
  twist?: number;
  threads?: number;
  volume?: number;
  spread?: number;
  density?: number;
  thickness?: number;
  flow?: number;
  fiberStyle?: "dots" | "dashes" | "lines";
  tips?: number;
  foldGlow?: number;
  perspective?: number;
  depthOfField?: number;
  focusDepth?: number;
  particles?: number;
  sparkle?: number;
  glow?: number;
  brightness?: number;
  vignette?: number;
  grain?: number;
  mouseInteraction?: boolean;
  hoverEffect?: "focus" | "part" | "none";
  mouseStrength?: number;
  pulseOnClick?: boolean;
  intro?: boolean;
  lightMode?: boolean;
  paused?: boolean;
  dpr?: number;
}

declare const GhostFibers: (props: GhostFibersProps) => React.JSX.Element;
export default GhostFibers;
