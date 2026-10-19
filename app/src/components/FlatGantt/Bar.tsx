"use client";

import type { Risk } from "@/lib/engine/types";
import type { BarPos } from "./layout";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--crit)",
  expired: "var(--exp)",
  warning: "var(--warn)",
};

function outlineSeverity(risks: Risk[]): string | null {
  for (const sev of ["expired", "critical", "warning"]) {
    if (risks.some((r) => r.sev === sev)) return sev;
  }
  return null;
}

export function Bar(props: {
  uid: string;
  pos: BarPos;
  label: string;
  color: string;
  moved: boolean;
  done: boolean;
  review: boolean;
  risks: Risk[];
  linkSource: boolean;
  resizable: boolean;
  onPointerDown: (e: React.PointerEvent, kind: "move" | "resize") => void;
  onLinkHandle: () => void;
}) {
  const { pos } = props;
  const outline = outlineSeverity(props.risks);
  const hasInfo = props.risks.some((r) => r.sev === "info");
  const fill = props.moved ? "var(--bar-moved)" : props.color;

  return (
    <g
      data-bar={props.uid}
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: "grab" }}
      onPointerDown={(e) => props.onPointerDown(e, "move")}
    >
      <rect
        className="body"
        width={pos.w}
        height={pos.h}
        rx={4}
        fill={fill}
        opacity={props.done ? 0.55 : 1}
        stroke={outline ? SEV_COLOR[outline] : props.linkSource ? "#1d4ed8" : "none"}
        strokeWidth={outline ? 2 : props.linkSource ? 2 : 0}
        strokeDasharray={props.linkSource ? "3 2" : undefined}
      />
      {props.review && (
        <rect
          width={pos.w}
          height={pos.h}
          rx={4}
          fill="url(#revhatch)"
          pointerEvents="none"
        />
      )}
      {pos.w > 28 && (
        <text x={6} y={pos.h - 7} fontSize={10.5} fill="#fff" pointerEvents="none">
          {props.label}
        </text>
      )}
      {hasInfo && (
        <circle cx={pos.w - 7} cy={7} r={3} fill="#1d4ed8" stroke="#fff" strokeWidth={1} />
      )}
      {props.resizable && (
        <rect
          data-grip="1"
          x={pos.w - 6}
          y={2}
          width={6}
          height={pos.h - 4}
          rx={2}
          fill="rgba(255,255,255,.5)"
          style={{ cursor: "ew-resize" }}
          onPointerDown={(e) => props.onPointerDown(e, "resize")}
        />
      )}
      <circle
        cx={pos.w + 7}
        cy={pos.h / 2}
        r={5}
        fill="#fff"
        stroke="#94a3b8"
        strokeWidth={1.5}
        style={{ cursor: "crosshair" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          props.onLinkHandle();
        }}
      />
    </g>
  );
}

export function GhostBar(props: { pos: BarPos; visible: boolean }) {
  if (!props.visible) return null;
  return (
    <rect
      x={props.pos.x}
      y={props.pos.y}
      width={props.pos.w}
      height={props.pos.h}
      rx={4}
      fill="none"
      stroke="var(--ghost)"
      strokeDasharray="3 2"
      pointerEvents="none"
    />
  );
}
