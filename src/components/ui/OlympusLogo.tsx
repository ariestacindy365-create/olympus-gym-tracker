import Image from "next/image";

// Intrinsic dimensions of the cropped logo assets (same crop, two colorways):
// olympus-logo.png (black mark, for light backgrounds) and
// olympus-logo-light.png (white mark, for the dark navbar).
const NATURAL_WIDTH = 902;
const NATURAL_HEIGHT = 329;

interface OlympusLogoProps {
  height?: number;
  variant?: "dark" | "light";
  className?: string;
}

export function OlympusLogo({ height = 32, variant = "dark", className = "" }: OlympusLogoProps) {
  const width = Math.round((height * NATURAL_WIDTH) / NATURAL_HEIGHT);
  const src = variant === "light" ? "/olympus-logo-light.png" : "/olympus-logo.png";

  return (
    <Image
      src={src}
      alt="OLYMPUS"
      width={width}
      height={height}
      priority
      className={className}
      style={{ width, height, flexShrink: 0 }}
    />
  );
}
