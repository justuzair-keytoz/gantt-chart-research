// Pure scheduling engine, ported from prototype/app.js's compute()/computeInner()/workload().
// Field names renamed per docs/gantt-chart/04-data-shape-mapping.md.
// Kept as pure functions (no module-level mutable globals) per the spec's
// "Testing Decisions" section: given a graph + an edit, assert dates/sprints/risks.

import {
  addDays,
  clone,
  diffDays,
  fmt,
  isWeekend,
  parseISO,
  toISO,
} from "./date-utils";
import type {
  Gap,
  Link,
  Milestone,
  Overlay,
  PathSegment,
  Risk,
  ScheduleResult,
  ScheduleSummary,
  Sprint,
  Stage,
  StageId,
  Step,
  StepSchedule,
  TaskDef,
  TaskRollup,
  WorkloadResult,
  WorkloadRow,
} from "./types";

export const REVIEW_STEPS = new Set(["review", "qa"]);

export function emptyOverlay(): Overlay {
  return {
    starts: {},
    durations: {},
    addLinks: [],
    rmLinks: [],
    out: [],
    bounds: {},
    people: {},
    notes: {},
    changes: [],
  };
}

export interface BuiltUnits {
  steps: Step[];
  stepByUid: Record<string, Step>;
  taskUnits: Record<string, string[]>; // taskId -> ordered step uids
}

export function buildUnits(
  tasks: TaskDef[],
  stepNames: Record<string, string>,
): BuiltUnits {
  const steps: Step[] = [];
  const stepByUid: Record<string, Step> = {};
  const taskUnits: Record<string, string[]> = {};

  tasks.forEach((t) => {
    const order: string[] = [];
    let prevUid: string | null = null;
    t.path.forEach((seg: PathSegment) => {
      seg.steps.forEach(([key, days]) => {
        const review = REVIEW_STEPS.has(key);
        const uid = `${t.id}:${seg.stage}:${key}`;
        const step: Step = {
          uid,
          taskId: t.id,
          stage: seg.stage,
          stepKey: key,
          name: stepNames[key] ?? key,
          durationDays: days,
          assignee: review ? seg.reviewer ?? seg.assignee : seg.assignee,
          reviewer: review ? null : seg.reviewer,
          stakeholders: seg.stakeholders,
          review,
          prevUid,
        };
        steps.push(step);
        stepByUid[uid] = step;
        order.push(uid);
        prevUid = uid;
      });
    });
    taskUnits[t.id] = order;
  });

  return { steps, stepByUid, taskUnits };
}

export function effectiveSprints(baseSprints: Sprint[], ov: Overlay): Sprint[] {
  const sp = clone(baseSprints);
  for (let i = 0; i < sp.length; i++) {
    const b = ov.bounds[sp[i].id];
    if (b) {
      sp[i].end = b;
      if (sp[i + 1]) sp[i + 1].start = toISO(addDays(parseISO(b), 3));
    }
  }
  return sp;
}

export function effectiveDeps(
  steps: Step[],
  baseLinks: Link[],
  ov: Overlay,
): Record<string, Set<string>> {
  const deps: Record<string, Set<string>> = {};
  steps.forEach((u) => {
    deps[u.uid] = new Set();
    if (u.prevUid) deps[u.uid].add(u.prevUid);
  });
  baseLinks.forEach((l) => deps[l.to]?.add(l.from));
  ov.rmLinks.forEach((l) => deps[l.to]?.delete(l.from));
  ov.addLinks.forEach((l) => deps[l.to]?.add(l.from));
  return deps;
}

export function topo(
  steps: Step[],
  deps: Record<string, Set<string>>,
): string[] | null {
  const indeg: Record<string, number> = {};
  const order: string[] = [];
  steps.forEach((u) => (indeg[u.uid] = deps[u.uid].size));
  const q = steps.filter((u) => indeg[u.uid] === 0).map((u) => u.uid);
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    steps.forEach((u) => {
      if (deps[u.uid].has(id) && --indeg[u.uid] === 0) q.push(u.uid);
    });
  }
  return order.length === steps.length ? order : null;
}

/** Would adding from->to create a cycle, walking the existing dependency graph. */
export function wouldCycle(
  deps: Record<string, Set<string>>,
  from: string,
  to: string,
): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    deps[id]?.forEach((p) => stack.push(p));
  }
  return false;
}

export function sprintOf(sp: Sprint[], dt: Date): Sprint | null {
  return (
    sp.find((s) => dt >= parseISO(s.start) && dt <= parseISO(s.end)) ?? null
  );
}

/**
 * Duration counted in working days (ponytail: single forward-scan loop, fine
 * for durations in the 1-40 day range this engine deals with). Contractual
 * deadlines (gate comparisons) stay in calendar days via diffDays/addDays.
 */
export function stepEnd(start: Date, durationDays: number): Date {
  let d = start;
  let counted = isWeekend(d) ? 0 : 1;
  while (counted < durationDays) {
    d = addDays(d, 1);
    if (!isWeekend(d)) counted++;
  }
  return d;
}

export interface ScheduleContext {
  tasks: TaskDef[];
  steps: Step[];
  stepByUid: Record<string, Step>;
  taskUnits: Record<string, string[]>;
  taskById: Record<string, TaskDef>;
  links: Link[];
  sprints: Sprint[];
  milestones: Milestone[];
  stages: Stage[];
  stageById: Record<StageId, Stage>;
  capacity: number;
  people: Record<string, string>;
  t0: Date;
  days: number;
  /** Committed-into-baseline overrides (written by a scenario commit). */
  baseStarts: Record<string, string>;
  baseDurations: Record<string, number>;
  basePeople: Record<
    string,
    { assignee?: string; reviewer?: string | null; stakeholders?: string[] }
  >;
}

const personOf = (ctx: ScheduleContext, ov: Overlay, u: Step): string =>
  ov.people[u.uid]?.assignee ??
  ctx.basePeople[u.uid]?.assignee ??
  u.assignee;

const reviewerOf = (ctx: ScheduleContext, ov: Overlay, u: Step): string | null =>
  ov.people[u.uid]?.reviewer !== undefined
    ? ov.people[u.uid].reviewer ?? null
    : ctx.basePeople[u.uid]?.reviewer !== undefined
      ? (ctx.basePeople[u.uid].reviewer ?? null)
      : u.reviewer;

const stakeholdersOf = (ctx: ScheduleContext, ov: Overlay, u: Step): string[] =>
  ov.people[u.uid]?.stakeholders ??
  ctx.basePeople[u.uid]?.stakeholders ??
  u.stakeholders;

export function unitLabel(ctx: ScheduleContext, uid: string): string {
  const u = ctx.stepByUid[uid];
  if (!u) return uid;
  return `${u.taskId} ${ctx.stageById[u.stage].label.split(" ")[0]}·${u.name}`;
}

export function computeSchedule(
  ctx: ScheduleContext,
  ov: Overlay,
  asOfStr: string,
  baseline: Record<string, StepSchedule> | null,
): ScheduleResult {
  const asOf = parseISO(asOfStr);
  const sp = effectiveSprints(ctx.sprints, ov);
  const deps = effectiveDeps(ctx.steps, ctx.links, ov);
  const order = topo(ctx.steps, deps) ?? ctx.steps.map((u) => u.uid);
  const out: Record<string, StepSchedule> = {};

  for (const uid of order) {
    const u = ctx.stepByUid[uid];
    const task = ctx.taskById[u.taskId];
    const dur = ov.durations[uid] ?? ctx.baseDurations[uid] ?? u.durationDays;
    let start = parseISO(
      ov.starts[uid] ??
        ctx.baseStarts[uid] ??
        (u.prevUid ? "2026-01-01" : task.startDate),
    );
    let pushedBy: string | null = null;
    deps[uid].forEach((p) => {
      const pe = addDays(out[p].end, 1);
      if (pe > start) {
        start = pe;
        pushedBy = p;
      }
    });

    const who = personOf(ctx, ov, u);
    const outs = ov.out.filter((o) => o.who === who);
    let end = stepEnd(start, dur);
    let guard = 0;
    let outHit = null;
    while (guard++ < 6) {
      const hit = outs.find(
        (o) => !(parseISO(o.to) < start || parseISO(o.from) > end),
      );
      if (!hit) break;
      outHit = hit;
      if (parseISO(hit.from) <= start) {
        start = addDays(parseISO(hit.to), 1);
        end = stepEnd(start, dur);
      } else {
        end = addDays(end, diffDays(parseISO(hit.to), parseISO(hit.from)) + 1);
      }
    }

    out[uid] = {
      start,
      end,
      durationDays: dur,
      pushedBy,
      outHit,
      done: end < asOf,
      slip: 0,
      moved: false,
      sprint: null,
      spill: false,
      spillFrom: null,
      spillTo: "unplanned",
      risks: [],
    };
  }

  ctx.steps.forEach((u) => {
    const s = out[u.uid];
    const b = baseline ? baseline[u.uid] : null;
    s.slip = b ? diffDays(s.end, b.end) : 0;
    s.moved = b ? s.slip !== 0 || diffDays(s.start, b.start) !== 0 : false;
    const bs = b ? sprintOf(ctx.sprints, b.end) : sprintOf(sp, s.end);
    const cs = sprintOf(sp, s.end);
    s.sprint = cs ? cs.id : null;
    s.spill = !!(
      bs &&
      (!cs || cs.id !== bs.id) &&
      s.end > parseISO((sp.find((x) => x.id === bs.id) ?? bs).end)
    );
    s.spillFrom = bs ? bs.name : null;
    s.spillTo = cs ? cs.name : "unplanned";
  });

  // task-level roll-up (derived from steps, not stored independently)
  const tasks: Record<string, TaskRollup> = {};
  ctx.tasks.forEach((t) => {
    const unitUids = ctx.taskUnits[t.id];
    if (!unitUids.length) {
      // Plain-bar task: no steps yet, roll-up is its own direct dates.
      const start = parseISO(ov.starts[t.id] ?? ctx.baseStarts[t.id] ?? t.startDate);
      const defaultDur = t.dueDate
        ? diffDays(parseISO(t.dueDate), parseISO(t.startDate)) + 1
        : 3;
      const dur = ov.durations[t.id] ?? ctx.baseDurations[t.id] ?? defaultDur;
      tasks[t.id] = { start, end: stepEnd(start, dur), moved: false, slip: 0 };
      return;
    }
    const us = unitUids.map((uid) => out[uid]);
    tasks[t.id] = {
      start: us[0].start,
      end: us[us.length - 1].end,
      moved: us.some((x) => x.moved),
      slip: us[us.length - 1].slip,
    };
  });

  const risks: Risk[] = [];
  const msById: Record<string, Milestone> = {};
  ctx.milestones.forEach((m) => (msById[m.id] = m));

  ctx.tasks
    .filter((t) => t.gates)
    .forEach((t) => {
      const unitUids = ctx.taskUnits[t.id];
      if (!unitUids.length) return;
      const lastUid = unitUids[unitUids.length - 1];
      const s = out[lastUid];
      const tt = tasks[t.id];
      const m = msById[t.gates!];
      if (!m) return;
      const gateDate = parseISO(m.date);
      if (tt.end > gateDate) {
        s.risks.push({
          sev: asOf > gateDate ? "expired" : "critical",
          rule: `${m.name} gate`,
          msg: `${t.id} ends ${fmt(tt.end)}, ${diffDays(tt.end, gateDate)} days after ${m.name} (${fmt(gateDate)})`,
        });
      } else if (diffDays(gateDate, tt.end) <= 5) {
        s.risks.push({
          sev: "warning",
          rule: `${m.name} float`,
          msg: `${diffDays(gateDate, tt.end)} days of float before ${m.name}`,
        });
      }
    });

  // sprint spill
  ctx.tasks.forEach((t) => {
    const unitUids = ctx.taskUnits[t.id].filter((uid) => out[uid].spill);
    if (unitUids.length) {
      const first = out[unitUids[0]];
      const last = out[unitUids[unitUids.length - 1]];
      last.risks.push({
        sev: "warning",
        rule: "Sprint spill",
        msg: `${t.id}: ${unitUids.length} step${unitUids.length > 1 ? "s" : ""} spill from ${first.spillFrom} into ${last.spillTo}`,
      });
    }
  });

  // availability (info) + weekend-landing (info, new per spec)
  ctx.steps.forEach((u) => {
    const s = out[u.uid];
    if (s.outHit) {
      s.risks.push({
        sev: "info",
        rule: "Availability",
        msg: `${unitLabel(ctx, u.uid)} pushed around ${ctx.people[personOf(ctx, ov, u)]} being out ${fmt(parseISO(s.outHit.from))}–${fmt(parseISO(s.outHit.to))}`,
      });
    }
    // Weekend-landing: fires only when moved AND start or end lands on a
    // non-working day — not merely "the span touches a weekend".
    if (s.moved && (isWeekend(s.start) || isWeekend(s.end))) {
      const where =
        isWeekend(s.start) && isWeekend(s.end)
          ? "starts and ends"
          : isWeekend(s.start)
            ? "starts"
            : "ends";
      s.risks.push({
        sev: "info",
        rule: "Weekend landing",
        msg: `${unitLabel(ctx, u.uid)} now ${where} on a non-working day after this move`,
      });
    }
    s.risks.forEach((r) => risks.push(r));
  });

  const sprintLoad: Record<string, number> = {};
  const sprintOver: Record<string, boolean> = {};
  sp.forEach((s) => {
    sprintLoad[s.id] = ctx.steps.reduce(
      (n, u) => n + (out[u.uid].sprint === s.id ? out[u.uid].durationDays : 0),
      0,
    );
    sprintOver[s.id] = sprintLoad[s.id] > ctx.capacity;
  });

  const movedUnits = ctx.steps.filter((u) => out[u.uid].moved);
  const notify: Record<string, string[]> = {};
  movedUnits.forEach((u) =>
    stakeholdersOf(ctx, ov, u).forEach((sk) => {
      (notify[sk] = notify[sk] || []).push(
        unitLabel(ctx, u.uid) +
          (out[u.uid].slip ? ` ${out[u.uid].slip > 0 ? "+" : ""}${out[u.uid].slip}d` : ""),
      );
    }),
  );

  const wl = workload(ctx, out, sp, ov);

  const gateDateFor = (milestoneId: string): Date | null => {
    const ts = ctx.tasks.filter((t) => t.gates === milestoneId);
    if (!ts.length) return null;
    return new Date(Math.max(...ts.map((t) => tasks[t.id].end.getTime())));
  };

  const summary: ScheduleSummary = {
    moved: movedUnits.length,
    movedTasks: ctx.tasks.filter((t) => tasks[t.id]?.moved).length,
    overCells: wl.table.reduce(
      (n, r) => n + r.cells.filter((c) => c.over > 0 || c.util > 100).length,
      0,
    ),
    idleDays: wl.table.reduce((n, r) => n + r.cells.reduce((m, c) => m + c.idle, 0), 0),
    gapDays: wl.gaps.reduce((n, g) => n + g.days, 0),
    maxSlip: Math.max(0, ...ctx.steps.map((u) => out[u.uid].slip)),
    spills: ctx.steps.filter((u) => out[u.uid].spill).length,
    critical: risks.filter((r) => r.sev === "critical").length,
    expired: risks.filter((r) => r.sev === "expired").length,
    warning: risks.filter((r) => r.sev === "warning").length,
    info: risks.filter((r) => r.sev === "info").length,
    overSprints: sp.filter((s) => sprintOver[s.id]).map((s) => s.name),
    notify,
  };

  return {
    units: out,
    tasks,
    sprints: sp.map((s) => ({ ...s, load: sprintLoad[s.id], over: sprintOver[s.id] })),
    deps,
    risks,
    summary,
    wl,
  };
}

function workload(
  ctx: ScheduleContext,
  out: Record<string, StepSchedule>,
  sp: Sprint[],
  ov: Overlay,
): WorkloadResult {
  const persons = Object.keys(ctx.people);
  const daily: Record<string, number[]> = {};
  persons.forEach((p) => (daily[p] = new Array(ctx.days).fill(0)));
  ctx.steps.forEach((u) => {
    const s = out[u.uid];
    const who = personOf(ctx, ov, u);
    for (
      let i = diffDays(s.start, ctx.t0);
      i <= diffDays(s.end, ctx.t0);
      i++
    )
      if (i >= 0 && i < ctx.days) daily[who][i]++;
  });
  const isWork = (i: number) => !isWeekend(addDays(ctx.t0, i));
  const outAt = (p: string, i: number) =>
    ov.out.some(
      (o) =>
        o.who === p &&
        addDays(ctx.t0, i) >= parseISO(o.from) &&
        addDays(ctx.t0, i) <= parseISO(o.to),
    );

  const table: WorkloadRow[] = persons.map((p) => ({
    p,
    name: ctx.people[p],
    cells: sp.map((s) => {
      let avail = 0;
      let load = 0;
      let over = 0;
      let idle = 0;
      for (
        let i = diffDays(parseISO(s.start), ctx.t0);
        i <= diffDays(parseISO(s.end), ctx.t0);
        i++
      ) {
        if (!isWork(i) || outAt(p, i)) continue;
        avail++;
        load += daily[p][i];
        if (daily[p][i] > 1) over++;
        if (daily[p][i] === 0) idle++;
      }
      return {
        sprint: s.name,
        avail,
        load,
        util: avail ? Math.round((100 * load) / avail) : 0,
        over,
        idle,
      };
    }),
  }));

  const gaps: Gap[] = [];
  ctx.tasks.forEach((t) => {
    const unitUids = ctx.taskUnits[t.id];
    unitUids.forEach((uid, i) => {
      if (!i) return;
      const prev = out[unitUids[i - 1]];
      const cur = out[uid];
      const g = diffDays(cur.start, prev.end) - 1;
      if (g >= 2) {
        const prevUid = unitUids[i - 1];
        const why =
          cur.pushedBy && cur.pushedBy !== prevUid
            ? `waits for ${unitLabel(ctx, cur.pushedBy)}`
            : cur.outHit
              ? `${ctx.people[personOf(ctx, ov, ctx.stepByUid[uid])]} is out`
              : "planned gap";
        gaps.push({ task: t.id, fromUid: prevUid, toUid: uid, days: g, why });
      }
    });
  });
  gaps.sort((a, b) => b.days - a.days);

  return { table, gaps };
}
