"use client";

import { useState } from "react";

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
  linkTarget: boolean;
  linkable: boolean;
  resizable: boolean;
  onPointerDown: (e: React.PointerEvent, kind: "move" | "resize") => void;
  onLinkPointerDown: (e: React.PointerEvent) => void;
  onLinkActivate: () => void;
  onLinkCancel: () => void;
}) {
  const { pos } = props;
  const [linkHover, setLinkHover] = useState(false);
  const [linkFocused, setLinkFocused] = useState(false);
  const outline = outlineSeverity(props.risks);
  const hasInfo = props.risks.some((r) => r.sev === "info");
  const fill = props.moved ? "var(--bar-moved)" : props.color;

  return (
    <g
      data-bar={props.uid}
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: "grab" }}
      onPointerDown={(e) => props.onPointerDown(e, "move")}
      onPointerEnter={() => setLinkHover(true)}
      onPointerLeave={() => setLinkHover(false)}
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
        // Critical/expired (gate violated) gets a "broken" dashed outline,
        // per spec.md's drag-cap note — distinct from a plain solid warning
        // outline, and from the dashed link-source selection outline below.
        strokeDasharray={
          props.linkSource ? "3 2" : outline === "critical" || outline === "expired" ? "4 2" : undefined
        }
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
      {/* Past-hard-deadline fill, mockup's "solid diagonal-hatch" look for the
          critical/expired risk state — layered on top of (not instead of) the
          review hatch above, so a step that's both a review step AND past its
          gate shows both patterns rather than one hiding the other (crithatch's
          own red tint vs. revhatch's white stripes keep them readable
          together). The existing dashed red outline below is kept too — it's
          what a prior round's "broken-dashed-red" fix (spec.md) already
          established as the gate-violated signal; the hatch is additive
          styling, not a replacement for it. */}
      {(outline === "critical" || outline === "expired") && (
        <rect
          width={pos.w}
          height={pos.h}
          rx={4}
          fill="url(#crithatch)"
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
      {props.linkable && (
        <>
          {/* The hit area never unmounts on hover. Without it, moving from
              the bar to a hover-only dot can remove the dot before pointer
              down arrives. It begins beyond the resize grip on purpose. */}
          <circle
            cx={pos.w + 14}
            cy={pos.h / 2}
            r={10}
            fill="transparent"
            pointerEvents="all"
            style={{ cursor: "crosshair" }}
            role="button"
            tabIndex={0}
            aria-label="Create dependency"
            onFocus={() => setLinkFocused(true)}
            onBlur={() => setLinkFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                props.onLinkActivate();
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              props.onLinkPointerDown(event);
            }}
            onLostPointerCapture={props.onLinkCancel}
          />
          {(linkHover || linkFocused || props.linkSource) && <circle
          cx={pos.w + 14}
          cy={pos.h / 2}
          r={4.5}
          fill="#fff"
          stroke={props.linkSource ? "#1d4ed8" : "#94a3b8"}
          strokeWidth={1.5}
          pointerEvents="none"
        />}
        </>
      )}
      {props.linkTarget && <rect x={-2} y={-2} width={pos.w + 4} height={pos.h + 4} rx={6} fill="none" stroke="#1d4ed8" strokeWidth={2} pointerEvents="none" />}
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
