      (() => {
        const DAY = 86400000;
        const d = s => new Date(s + "T00:00:00");
        const iso = dt =>
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const fmt = dt =>
          dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
        const diffDays = (a, b) => Math.round((a - b) / DAY);
        const clone = o => JSON.parse(JSON.stringify(o));

        const T0 = d("2026-10-01"),
          T1 = d("2026-12-04");
        const DAYS = diffDays(T1, T0) + 1;
        let DW = 12;
        const LABEL_W = 300,
          ROW_H = 30,
          STEP_H = 26,
          AXIS_H = 54,
          PAD_BOTTOM = 16;
        const X = dt => LABEL_W + diffDays(dt, T0) * DW;

        const STAGES = [
          { id: "planning", label: "Planning", color: "#4f46e5" },
          { id: "design", label: "Design", color: "#0e7490" },
          { id: "development", label: "Development", color: "#475569" },
          {
            id: "marketing",
            label: "Marketing & lender comms",
            color: "#7c3aed",
          },
        ];
        const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));
        const STEP_NAMES = {
          scope: "Scope",
          review: "Review",
          design: "Design",
          copy: "Copywriting",
          docs: "Documentation",
          build: "Build",
          qa: "QA",
          release: "Release",
          draft: "Draft",
          send: "Send",
        };
        const REVIEW_STEPS = new Set(["review", "qa"]);
        const PEOPLE = {
          ana: "Ana",
          moiz: "Moiz",
          ravi: "Ravi",
          sam: "Sam",
          lee: "Lee",
        };
        const BASE_SPRINTS = [
          {
            id: "s5",
            name: "Sprint 5",
            start: "2026-10-05",
            end: "2026-10-16",
          },
          {
            id: "s6",
            name: "Sprint 6",
            start: "2026-10-19",
            end: "2026-10-30",
          },
          {
            id: "s7",
            name: "Sprint 7",
            start: "2026-11-02",
            end: "2026-11-13",
          },
          {
            id: "s8",
            name: "Sprint 8",
            start: "2026-11-16",
            end: "2026-11-27",
          },
        ];
        const CAPACITY = 40;
        const MS = {
          lcNotice: {
            id: "lcNotice",
            name: "LC non-renewal notice deadline",
            date: "2026-10-28",
            color: "var(--exp)",
          },
          rel23: {
            id: "rel23",
            name: "Release 2.3",
            date: "2026-11-13",
            color: "var(--accent)",
          },
          cod: {
            id: "cod",
            name: "PPA COD (contract)",
            date: "2026-11-20",
            color: "var(--crit)",
          },
        };

        // A task travels stages; each stage has steps with their own dates and people.
        // path: [{stage, who, rev, stk, steps:[[stepKey, days], ...]}]  (review/QA steps are worked by the reviewer)
        let TASKS = [
          {
            id: "OAK-160",
            title: "LC expiry rule spec",
            start: "2026-10-05",
            gates: null,
            path: [
              {
                stage: "planning",
                who: "ana",
                rev: "moiz",
                stk: ["CFO"],
                steps: [
                  ["scope", 3],
                  ["review", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-170",
            title: "COD readiness checklist",
            start: "2026-10-06",
            gates: null,
            path: [
              {
                stage: "planning",
                who: "moiz",
                rev: "ana",
                stk: ["Lender", "Client PM"],
                steps: [
                  ["scope", 4],
                  ["review", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-150",
            title: "Dependency picker",
            start: "2026-10-09",
            gates: null,
            path: [
              {
                stage: "design",
                who: "lee",
                rev: "ana",
                stk: ["Client PM"],
                steps: [
                  ["design", 3],
                  ["review", 1],
                  ["docs", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-151",
            title: "Export API",
            start: "2026-10-09",
            gates: null,
            path: [
              {
                stage: "design",
                who: "ana",
                rev: "lee",
                stk: ["Client PM"],
                steps: [
                  ["design", 3],
                  ["review", 1],
                  ["docs", 1],
                ],
              },
              {
                stage: "development",
                who: "ravi",
                rev: "sam",
                stk: ["Client PM"],
                steps: [
                  ["build", 5],
                  ["qa", 2],
                  ["release", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-161",
            title: "LC non-renewal notice",
            start: "2026-10-09",
            gates: null,
            path: [
              {
                stage: "design",
                who: "sam",
                rev: "ana",
                stk: ["CFO", "Issuing bank"],
                steps: [
                  ["design", 3],
                  ["copy", 2],
                  ["review", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-162",
            title: "Send LC notice to issuer",
            start: "2026-10-15",
            gates: "lcNotice",
            path: [
              {
                stage: "marketing",
                who: "sam",
                rev: "ana",
                stk: ["Issuing bank", "CFO"],
                steps: [
                  ["draft", 2],
                  ["review", 1],
                  ["send", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-142",
            title: "PPA table extraction",
            start: "2026-10-11",
            gates: null,
            path: [
              {
                stage: "development",
                who: "ravi",
                rev: "sam",
                stk: ["Client PM"],
                steps: [
                  ["build", 7],
                  ["qa", 2],
                  ["release", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-173",
            title: "Dependency picker build",
            start: "2026-10-13",
            gates: null,
            path: [
              {
                stage: "development",
                who: "lee",
                rev: "sam",
                stk: [],
                steps: [
                  ["build", 5],
                  ["qa", 2],
                  ["release", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-139",
            title: "Filters panel",
            start: "2026-10-22",
            gates: null,
            path: [
              {
                stage: "development",
                who: "ravi",
                rev: "sam",
                stk: ["Client PM"],
                steps: [
                  ["build", 4],
                  ["qa", 2],
                  ["release", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-171",
            title: "LGIA in-service confirmation",
            start: "2026-10-20",
            gates: null,
            path: [
              {
                stage: "development",
                who: "moiz",
                rev: "sam",
                stk: ["Lender", "Utility"],
                steps: [
                  ["build", 6],
                  ["qa", 2],
                  ["release", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-180",
            title: "Release 2.3 notes",
            start: "2026-10-29",
            gates: "rel23",
            path: [
              {
                stage: "marketing",
                who: "lee",
                rev: "ana",
                stk: ["Client PM"],
                steps: [
                  ["draft", 3],
                  ["review", 1],
                  ["send", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-172",
            title: "Lender COD certificate",
            start: "2026-10-29",
            gates: "cod",
            path: [
              {
                stage: "development",
                who: "moiz",
                rev: "sam",
                stk: ["Lender"],
                steps: [
                  ["build", 4],
                  ["qa", 2],
                ],
              },
              {
                stage: "marketing",
                who: "ana",
                rev: "moiz",
                stk: ["Lender", "CFO"],
                steps: [
                  ["draft", 4],
                  ["review", 2],
                  ["send", 1],
                ],
              },
            ],
          },
          {
            id: "OAK-181",
            title: "Investor update deck",
            start: "2026-11-11",
            gates: null,
            path: [
              {
                stage: "marketing",
                who: "sam",
                rev: "ana",
                stk: ["Investors", "CFO"],
                steps: [
                  ["draft", 3],
                  ["review", 1],
                  ["send", 1],
                ],
              },
            ],
          },
        ];
        // Cross-task links are between steps (from unit id -> to unit id)
        let BASE_LINKS = [
          ["OAK-160:planning:review", "OAK-150:design:design"],
          ["OAK-160:planning:review", "OAK-151:design:design"],
          ["OAK-160:planning:review", "OAK-161:design:design"],
          ["OAK-170:planning:review", "OAK-142:development:build"],
          ["OAK-170:planning:review", "OAK-171:development:build"],
          ["OAK-151:development:release", "OAK-139:development:build"],
          ["OAK-150:design:review", "OAK-173:development:build"],
          ["OAK-142:development:qa", "OAK-171:development:build"],
          ["OAK-161:design:review", "OAK-162:marketing:draft"],
          ["OAK-139:development:release", "OAK-180:marketing:draft"],
          ["OAK-173:development:release", "OAK-180:marketing:draft"],
          ["OAK-171:development:release", "OAK-172:development:build"],
          ["OAK-142:development:release", "OAK-172:development:build"],
          ["OAK-172:marketing:send", "OAK-181:marketing:draft"],
        ].map(([from, to]) => ({ from, to }));

        let UNITS = [],
          UNIT = {},
          TASK = {};
        function buildUnits() {
          UNITS = [];
          UNIT = {};
          TASK = {};
          TASKS.forEach(t => {
            TASK[t.id] = t;
            t.units = [];
            t.path.forEach(seg =>
              seg.steps.forEach(([k, days]) => {
                const review = REVIEW_STEPS.has(k);
                const u = {
                  uid: `${t.id}:${seg.stage}:${k}`,
                  task: t.id,
                  stage: seg.stage,
                  step: k,
                  name: STEP_NAMES[k],
                  dur: days,
                  who: review ? seg.rev : seg.who,
                  rev: review ? null : seg.rev,
                  stk: seg.stk,
                  review,
                };
                u.prev = t.units.length
                  ? t.units[t.units.length - 1].uid
                  : null;
                t.units.push(u);
                UNITS.push(u);
                UNIT[u.uid] = u;
              }),
            );
          });
        }
        buildUnits();
        let BASE_PEOPLE = {},
          BASE_STARTS = {},
          OVP = null;
        const PP = u => (OVP && OVP.people && OVP.people[u.uid]) || {};
        const BP = u => BASE_PEOPLE[u.uid] || {};
        const WHO = u => PP(u).who ?? BP(u).who ?? u.who;
        const REV = u =>
          PP(u).rev !== undefined
            ? PP(u).rev
            : BP(u).rev !== undefined
              ? BP(u).rev
              : u.rev;
        const STK = u => PP(u).stk ?? BP(u).stk ?? u.stk;
        const unitLabel = uid => {
          const u = UNIT[uid];
          return `${u.task} ${STAGE[u.stage].label.split(" ")[0]}·${u.name}`;
        };

        const OUT_PRESETS = {
          outRavi: {
            who: "ravi",
            from: "2026-10-20",
            to: "2026-10-24",
            label: "Ravi out 20–24 Oct",
          },
          outAna: {
            who: "ana",
            from: "2026-11-03",
            to: "2026-11-07",
            label: "Ana out 3–7 Nov",
          },
          outSam: {
            who: "sam",
            from: "2026-10-27",
            to: "2026-10-31",
            label: "Sam (reviewer) out 27–31 Oct",
          },
        };
        const emptyOv = () => ({
          starts: {},
          durs: {},
          addLinks: [],
          rmLinks: [],
          out: [],
          bounds: {},
          people: {},
          notes: {},
          changes: [],
        });

        const state = {
          scenarios: [
            {
              id: "base",
              name: "Baseline",
              locked: true,
              ov: emptyOv(),
              history: [],
            },
          ],
          active: "base",
          view: "flat",
          asOf: "2026-10-10",
          linkMode: false,
          linkFrom: null,
          compare: false,
          replay: null,
          spread: 1,
          tilt: 22,
          decisions: [],
          expanded: new Set(["OAK-151", "OAK-162", "OAK-172"]),
          lanesBy: "person",
        };
        let seq = 0;

        /* ---------- schedule engine (unit = step) ---------- */
        function effectiveSprints(ov) {
          const sp = clone(BASE_SPRINTS);
          for (let i = 0; i < sp.length; i++) {
            const b = ov.bounds[sp[i].id];
            if (b) {
              sp[i].end = b;
              if (sp[i + 1]) sp[i + 1].start = iso(addDays(d(b), 3));
            }
          }
          return sp;
        }
        function effectiveDeps(ov) {
          const deps = {};
          UNITS.forEach(u => {
            deps[u.uid] = new Set();
            if (u.prev) deps[u.uid].add(u.prev);
          });
          BASE_LINKS.forEach(l => deps[l.to] && deps[l.to].add(l.from));
          ov.rmLinks.forEach(l => deps[l.to] && deps[l.to].delete(l.from));
          ov.addLinks.forEach(l => deps[l.to] && deps[l.to].add(l.from));
          return deps;
        }
        function topo(deps) {
          const indeg = {},
            order = [];
          UNITS.forEach(u => (indeg[u.uid] = deps[u.uid].size));
          const q = UNITS.filter(u => indeg[u.uid] === 0).map(u => u.uid);
          while (q.length) {
            const id = q.shift();
            order.push(id);
            UNITS.forEach(u => {
              if (deps[u.uid].has(id) && --indeg[u.uid] === 0) q.push(u.uid);
            });
          }
          return order.length === UNITS.length ? order : null;
        }
        function wouldCycle(deps, from, to) {
          const seen = new Set(),
            stack = [from];
          while (stack.length) {
            const id = stack.pop();
            if (id === to) return true;
            if (seen.has(id)) continue;
            seen.add(id);
            deps[id].forEach(p => stack.push(p));
          }
          return false;
        }
        function sprintOf(sp, dt) {
          return sp.find(s => dt >= d(s.start) && dt <= d(s.end)) || null;
        }

        function compute(ov, asOfStr, baseline) {
          const prevOVP = OVP;
          OVP = ov;
          try {
            return computeInner(ov, asOfStr, baseline);
          } finally {
            OVP = prevOVP;
          }
        }
        function computeInner(ov, asOfStr, baseline) {
          const asOf = d(asOfStr),
            sp = effectiveSprints(ov),
            deps = effectiveDeps(ov);
          const order = topo(deps) || UNITS.map(u => u.uid);
          const out = {};
          for (const uid of order) {
            const u = UNIT[uid];
            const dur = ov.durs[uid] ?? u.dur;
            let start = d(
                ov.starts[uid] ??
                  BASE_STARTS[uid] ??
                  (u.prev ? "2026-01-01" : TASK[u.task].start),
              ),
              pushedBy = null;
            deps[uid].forEach(p => {
              const pe = addDays(out[p].end, 1);
              if (pe > start) {
                start = pe;
                pushedBy = p;
              }
            });
            const outs = ov.out.filter(o => o.who === WHO(u));
            let end = addDays(start, dur - 1),
              guard = 0,
              outHit = null;
            while (guard++ < 6) {
              const hit = outs.find(o => !(d(o.to) < start || d(o.from) > end));
              if (!hit) break;
              outHit = hit;
              if (d(hit.from) <= start) {
                start = addDays(d(hit.to), 1);
                end = addDays(start, dur - 1);
              } else {
                end = addDays(end, diffDays(d(hit.to), d(hit.from)) + 1);
              }
            }
            out[uid] = { start, end, dur, pushedBy, outHit, done: end < asOf };
          }
          UNITS.forEach(u => {
            const s = out[u.uid],
              b = baseline ? baseline[u.uid] : null;
            s.slip = b ? diffDays(s.end, b.end) : 0;
            s.moved = b
              ? s.slip !== 0 || diffDays(s.start, b.start) !== 0
              : false;
            const bs = b ? sprintOf(BASE_SPRINTS, b.end) : sprintOf(sp, s.end),
              cs = sprintOf(sp, s.end);
            s.sprint = cs ? cs.id : null;
            s.spill = !!(
              bs &&
              (!cs || cs.id !== bs.id) &&
              s.end > d((sp.find(x => x.id === bs.id) || bs).end)
            );
            s.spillFrom = bs ? bs.name : null;
            s.spillTo = cs ? cs.name : "unplanned";
          });
          // task-level roll-up
          const tasks = {};
          TASKS.forEach(t => {
            const us = t.units.map(u => out[u.uid]);
            tasks[t.id] = {
              start: us[0].start,
              end: us[us.length - 1].end,
              moved: us.some(x => x.moved),
              slip: us[us.length - 1].slip,
            };
          });
          const risks = [];
          UNITS.forEach(u => (out[u.uid].risks = []));
          TASKS.forEach(t => {
            const last = t.units[t.units.length - 1],
              s = out[last.uid],
              tt = tasks[t.id];
            if (t.gates === "cod") {
              const cod = d(MS.cod.date);
              if (tt.end > cod)
                s.risks.push({
                  sev: "critical",
                  rule: "COD cascade",
                  msg: `${t.id} ${last.name.toLowerCase()} ends ${fmt(tt.end)}, ${diffDays(tt.end, cod)} days after PPA COD ${fmt(cod)}`,
                });
              else if (diffDays(cod, tt.end) <= 5)
                s.risks.push({
                  sev: "warning",
                  rule: "COD float",
                  msg: `${diffDays(cod, tt.end)} days of float before PPA COD`,
                });
            }
            if (t.gates === "lcNotice") {
              const dl = d(MS.lcNotice.date);
              if (tt.end > dl)
                s.risks.push({
                  sev: asOf > dl ? "expired" : "critical",
                  rule: "LC non-renewal notice",
                  msg: `${t.id} send ends ${fmt(tt.end)}, deadline ${fmt(dl)} missed by ${diffDays(tt.end, dl)} days`,
                });
              else if (diffDays(dl, asOf) >= 0 && diffDays(dl, asOf) <= 10)
                s.risks.push({
                  sev: "warning",
                  rule: "LC notice window",
                  msg: `deadline in ${diffDays(dl, asOf)} days as of ${fmt(asOf)}`,
                });
            }
            if (t.gates === "rel23") {
              const r = d(MS.rel23.date);
              if (tt.end > r)
                s.risks.push({
                  sev: "warning",
                  rule: "Release 2.3 slips",
                  msg: `${t.id} ends ${fmt(tt.end)}, release moves ${diffDays(tt.end, r)} days`,
                });
            }
          });
          TASKS.forEach(t => {
            const sp_ = t.units.filter(u => out[u.uid].spill);
            if (sp_.length) {
              const u = sp_[0],
                s = out[u.uid];
              out[sp_[sp_.length - 1].uid].risks.push({
                sev: "warning",
                rule: "Sprint spill",
                msg: `${t.id}: ${sp_.length} step${sp_.length > 1 ? "s" : ""} (${sp_.map(x => x.name).join(", ")}) spill from ${s.spillFrom} into ${out[sp_[sp_.length - 1].uid].spillTo}`,
              });
            }
          });
          UNITS.forEach(u => {
            const s = out[u.uid];
            if (s.outHit)
              s.risks.push({
                sev: "info",
                rule: "Availability",
                msg: `${unitLabel(u.uid)} pushed around ${PEOPLE[WHO(u)]} being out ${fmt(d(s.outHit.from))}–${fmt(d(s.outHit.to))}`,
              });
            s.risks.forEach(r => risks.push(r));
          });
          sp.forEach(s => {
            s.load = UNITS.reduce(
              (n, u) => n + (out[u.uid].sprint === s.id ? out[u.uid].dur : 0),
              0,
            );
            s.over = s.load > CAPACITY;
          });
          const chain = new Set();
          const walk = id => {
            if (chain.has(id)) return;
            chain.add(id);
            deps[id].forEach(walk);
          };
          TASKS.filter(t => t.gates === "cod").forEach(t =>
            walk(t.units[t.units.length - 1].uid),
          );
          const gate = key => {
            const ts = TASKS.filter(t => t.gates === key);
            return ts.length
              ? new Date(Math.max(...ts.map(t => tasks[t.id].end)))
              : null;
          };
          const codDate = gate("cod"),
            lcDate = gate("lcNotice"),
            relDate = gate("rel23");
          const movedUnits = UNITS.filter(u => out[u.uid].moved);
          const notify = {};
          movedUnits.forEach(u =>
            STK(u).forEach(sk => {
              (notify[sk] = notify[sk] || []).push(
                unitLabel(u.uid) +
                  (out[u.uid].slip
                    ? ` ${out[u.uid].slip > 0 ? "+" : ""}${out[u.uid].slip}d`
                    : ""),
              );
            }),
          );
          const wl = workload(out, sp, ov, deps);
          const summary = {
            moved: movedUnits.length,
            movedTasks: TASKS.filter(t => tasks[t.id].moved).length,
            overCells: wl.table.reduce(
              (n, r) =>
                n + r.cells.filter(c => c.over > 0 || c.util > 100).length,
              0,
            ),
            idleDays: wl.table.reduce(
              (n, r) => n + r.cells.reduce((m, c) => m + c.idle, 0),
              0,
            ),
            gapDays: wl.gaps.reduce((n, g) => n + g.days, 0),
            maxSlip: Math.max(0, ...UNITS.map(u => out[u.uid].slip)),
            spills: UNITS.filter(u => out[u.uid].spill).length,
            critical: risks.filter(r => r.sev === "critical").length,
            expired: risks.filter(r => r.sev === "expired").length,
            warning: risks.filter(r => r.sev === "warning").length,
            codDate,
            codMet: codDate <= d(MS.cod.date),
            lcDate,
            lcMet: lcDate <= d(MS.lcNotice.date),
            relDate,
            relMet: relDate <= d(MS.rel23.date),
            overSprints: sp.filter(s => s.over).map(s => s.name),
            notify,
          };
          return {
            units: out,
            tasks,
            sprints: sp,
            deps,
            risks,
            chain,
            summary,
            wl,
          };
        }
        function workload(out, sp, ov, deps) {
          const persons = Object.keys(PEOPLE);
          const daily = {};
          persons.forEach(p => (daily[p] = new Array(DAYS).fill(0)));
          UNITS.forEach(u => {
            const s = out[u.uid];
            for (let i = diffDays(s.start, T0); i <= diffDays(s.end, T0); i++)
              if (i >= 0 && i < DAYS) daily[WHO(u)][i]++;
          });
          const isWork = i => {
            const wd = addDays(T0, i).getDay();
            return wd !== 0 && wd !== 6;
          };
          const outAt = (p, i) =>
            ov.out.some(
              o =>
                o.who === p &&
                addDays(T0, i) >= d(o.from) &&
                addDays(T0, i) <= d(o.to),
            );
          const table = persons.map(p => ({
            p,
            name: PEOPLE[p],
            cells: sp.map(s => {
              let avail = 0,
                load = 0,
                over = 0,
                idle = 0;
              for (
                let i = diffDays(d(s.start), T0);
                i <= diffDays(d(s.end), T0);
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
          const perDay = [];
          for (let i = 0; i < DAYS; i++) {
            const work = isWork(i);
            const avail = work ? persons.filter(p => !outAt(p, i)).length : 0;
            const load = persons.reduce((n, p) => n + daily[p][i], 0);
            const inSprint = sp.some(
              x => addDays(T0, i) >= d(x.start) && addDays(T0, i) <= d(x.end),
            );
            perDay.push({
              i,
              work,
              avail,
              load,
              inSprint,
              util: avail ? Math.round((100 * load) / avail) : 0,
              over: persons.filter(p => daily[p][i] > 1).length,
            });
          }
          const gaps = [];
          TASKS.forEach(t =>
            t.units.forEach((u, i) => {
              if (!i) return;
              const prev = out[t.units[i - 1].uid],
                cur = out[u.uid];
              const g = diffDays(cur.start, prev.end) - 1;
              if (g >= 2) {
                const why =
                  cur.pushedBy && cur.pushedBy !== u.prev
                    ? `waits for ${unitLabel(cur.pushedBy)}`
                    : cur.outHit
                      ? `${PEOPLE[WHO(u)]} is out`
                      : "planned gap";
                gaps.push({
                  task: t.id,
                  from: t.units[i - 1],
                  to: u,
                  days: g,
                  why,
                });
              }
            }),
          );
          // idle reviewers: review steps whose reviewer has concurrent load > 1 (overcommitted while reviewing)
          gaps.sort((a, b) => b.days - a.days);
          return { table, gaps, daily, isWork, outAt, perDay };
        }
        let baselineSched = null;
        function baseline() {
          if (!baselineSched)
            baselineSched = compute(emptyOv(), state.asOf, null).units;
          return baselineSched;
        }
        function activeScenario() {
          return state.scenarios.find(s => s.id === state.active);
        }
        function activeOv() {
          const sc = activeScenario();
          if (state.view === "4d" && state.replay && sc.history.length)
            return sc.history[state.replay.idx];
          return sc.ov;
        }
        function schedFor(ov) {
          return compute(ov, state.asOf, baseline());
        }

        /* ---------- rendering ---------- */
        const wrap = document.getElementById("boardWrap");
        let rows = [],
          rowOf = {},
          taskRowOf = {},
          planeRow = {};
        const CAP_ROW = 16,
          CAP_HEAD = 24;
        function capStripHeight() {
          return CAP_HEAD + Object.keys(PEOPLE).length * CAP_ROW + 22 + 10;
        }
        function capStripSvg(sched, ov, y0) {
          const wl = sched.wl,
            persons = Object.keys(PEOPLE);
          let h = "";
          h += `<rect x="0" y="${y0}" width="${LABEL_W + DAYS * DW + 20}" height="${capStripHeight()}" fill="#fff"/><line x1="0" x2="${LABEL_W + DAYS * DW + 20}" y1="${y0}" y2="${y0}" stroke="var(--line)"/>`;
          h += `<text class="stage-lbl" x="12" y="${y0 + 16}">Capacity per day</text><text class="row-sub" x="150" y="${y0 + 16}">steps on each person per day · team row = steps ÷ people available</text>`;
          persons.forEach((pp, r) => {
            const y = y0 + CAP_HEAD + r * CAP_ROW;
            h += `<text class="row-lbl" x="12" y="${y + 12}">${PEOPLE[pp]}</text>`;
            for (let i = 0; i < DAYS; i++) {
              const x = LABEL_W + i * DW;
              const n = wl.daily[pp][i];
              const out = wl.outAt(pp, i);
              const work = wl.isWork(i);
              const inSprint = wl.perDay[i].inSprint;
              let fill = "#f3f4f6",
                txt = "";
              if (!work) fill = "#eceef1";
              else if (out) fill = "rgba(180,83,9,.35)";
              else if (n >= 2) {
                fill = "rgba(185,28,28,.55)";
                txt = n;
              } else if (n === 1) fill = "rgba(21,128,61,.35)";
              else if (inSprint) fill = "url(#hatch)";
              h += `<rect x="${x}" y="${y + 1}" width="${DW - 1}" height="${CAP_ROW - 2}" fill="${fill}"><title>${PEOPLE[pp]} ${fmt(addDays(T0, i))}: ${out ? "out" : !work ? "weekend" : n + " step" + (n === 1 ? "" : "s")}</title></rect>`;
              if (txt)
                h += `<text x="${x + DW / 2}" y="${y + 12}" text-anchor="middle" style="font-size:9.5px;fill:#fff;font-weight:700;pointer-events:none">${txt}</text>`;
            }
          });
          const ty = y0 + CAP_HEAD + persons.length * CAP_ROW + 4;
          h += `<text class="row-lbl" x="12" y="${ty + 13}" font-weight="600">Team</text>`;
          wl.perDay.forEach(dy => {
            const x = LABEL_W + dy.i * DW;
            let fill = "#eceef1";
            if (dy.work) {
              fill =
                dy.util > 100
                  ? "rgba(185,28,28,.6)"
                  : dy.util >= 50
                    ? "rgba(21,128,61,.45)"
                    : dy.util > 0
                      ? "rgba(180,83,9,.45)"
                      : dy.inSprint
                        ? "url(#hatch)"
                        : "#f3f4f6";
            }
            h += `<rect x="${x}" y="${ty + 1}" width="${DW - 1}" height="16" fill="${fill}"><title>Team ${fmt(addDays(T0, dy.i))}: ${dy.work ? `${dy.load} step-days ÷ ${dy.avail} people available = ${dy.util}%${dy.over ? ", " + dy.over + " overcommitted" : ""}` : "weekend"}</title></rect>`;
            if (dy.work && (addDays(T0, dy.i).getDay() === 1 || dy.util > 100))
              h += `<text x="${x + 1}" y="${ty + 13}" style="font-size:9px;fill:${dy.util > 100 ? "#fff" : "var(--ink)"};pointer-events:none">${dy.util}%</text>`;
          });
          return h;
        }
        function layoutFlat() {
          rows = [];
          rowOf = {};
          taskRowOf = {};
          let y = AXIS_H + 8;
          TASKS.forEach(t => {
            const open = state.expanded.has(t.id);
            rows.push({ kind: "task", id: t.id, y, open });
            taskRowOf[t.id] = y;
            y += ROW_H;
            if (open)
              t.units.forEach(u => {
                rows.push({ kind: "unit", uid: u.uid, y });
                rowOf[u.uid] = y;
                y += STEP_H;
              });
          });
          return y + PAD_BOTTOM + capStripHeight();
        }
        function layout3d() {
          planeRow = {};
          let maxRows = 0;
          STAGES.forEach(st => {
            let i = 0;
            TASKS.forEach(t => {
              if (t.path.some(p => p.stage === st.id)) {
                planeRow[t.id + ":" + st.id] = AXIS_H + 72 + i * ROW_H;
                i++;
              }
            });
            maxRows = Math.max(maxRows, i);
          });
          return AXIS_H + 72 + maxRows * ROW_H + 40;
        }
        function depthOffset(stageI) {
          const k = state.view === "3d" ? state.spread : 0;
          const back = STAGES.length - 1 - stageI;
          return { dx: back * 80 * k, dy: -back * 105 * k };
        }
        const stageI = id => STAGES.findIndex(s => s.id === id);
        function unitY(u) {
          if (state.view === "3d") return planeRow[u.task + ":" + u.stage] + 5;
          return rowOf[u.uid] !== undefined
            ? rowOf[u.uid] + 4
            : taskRowOf[u.task] + 5;
        }
        function barPos(uid, sched) {
          const u = UNIT[uid],
            s = sched.units[uid],
            o = depthOffset(stageI(u.stage));
          return {
            x: X(s.start) + o.dx,
            y: unitY(u) + o.dy,
            w: Math.max(DW * s.dur - 2, 6),
            h: rowOf[uid] !== undefined ? 18 : 20,
          };
        }
        function linkPath(from, to, sched) {
          const a = barPos(from, sched),
            b = barPos(to, sched);
          const x1 = a.x + a.w,
            y1 = a.y + a.h / 2,
            x2 = b.x,
            y2 = b.y + b.h / 2;
          if (state.view === "3d") return `M${x1},${y1} L${x2},${y2}`;
          if (Math.abs(y1 - y2) < 1 && x2 >= x1) return `M${x1},${y1} H${x2}`;
          const mid = x1 + 8;
          if (x2 >= x1 + 16) return `M${x1},${y1} H${mid} V${y2} H${x2}`;
          return `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}`;
        }
        function sevClass(s) {
          for (const o of ["expired", "critical", "warning"])
            if (s.risks.some(r => r.sev === o)) return "risk-" + o;
          return "";
        }
        const people = u =>
          `${PEOPLE[WHO(u)]}${u.review ? " reviews" : ""}${REV(u) ? " · rev " + PEOPLE[REV(u)] : ""}${STK(u).length ? " · upd " + STK(u).join(", ") : ""}`;

        function render() {
          OVP = activeOv();
          scheduleSave();
          if (state.view !== "flat") {
            layoutFlat();
            return render3d();
          }
          const ov = activeOv(),
            sched = schedFor(ov),
            is3d = false;
          const height = is3d ? layout3d() : layoutFlat();
          if (is3d) layoutFlat(); // keep flat rows defined for label lookups
          const width =
            LABEL_W +
            DAYS * DW +
            (is3d ? Math.round(3 * 80 * state.spread) + 40 : 20);
          const top = is3d ? Math.round(3 * 105 * state.spread) + 24 : 0;
          const g = [];
          g.push(`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9ca3af" stroke-width="1.5"/></pattern>
    <pattern id="rev" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.55)" stroke-width="2"/></pattern>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9ca3af"/></marker></defs>`);
          const grid = (yTop, yBot, o = { dx: 0, dy: 0 }) => {
            let p = "";
            for (let i = 0; i < DAYS; i++) {
              const wd = addDays(T0, i).getDay();
              if (wd === 0 || wd === 6)
                p += `<rect x="${LABEL_W + i * DW + o.dx}" y="${yTop + o.dy}" width="${DW}" height="${yBot - yTop}" fill="#f3f4f6"/>`;
            }
            sched.sprints.forEach((s, i) => {
              if (i % 2 === 0)
                p += `<rect x="${X(d(s.start)) + o.dx}" y="${yTop + o.dy}" width="${X(addDays(d(s.end), 1)) - X(d(s.start))}" height="${yBot - yTop}" fill="rgba(29,78,216,.05)"/>`;
            });
            Object.values(MS).forEach(
              m =>
                (p += `<line x1="${X(d(m.date)) + o.dx}" x2="${X(d(m.date)) + o.dx}" y1="${yTop + o.dy}" y2="${yBot + o.dy}" stroke="${m.color}" stroke-dasharray="4 3" stroke-width="1.5"/>`),
            );
            p += `<line class="asof" x1="${X(d(state.asOf)) + o.dx}" x2="${X(d(state.asOf)) + o.dx}" y1="${yTop + o.dy}" y2="${yBot + o.dy}"/>`;
            return p;
          };
          if (is3d) {
            for (let i = STAGES.length - 1; i >= 0; i--) {
              const st = STAGES[i],
                o = depthOffset(i);
              const ys = Object.entries(planeRow)
                .filter(([k]) => k.endsWith(":" + st.id))
                .map(([, y]) => y);
              const yTop = Math.min(...ys) - 8,
                yBot = Math.max(...ys) + ROW_H;
              g.push(
                `<g><rect class="plane" x="${LABEL_W - 8 + o.dx}" y="${yTop - 22 + o.dy}" width="${DAYS * DW + 16}" height="${yBot - yTop + 30}" rx="6"/><text class="stage-lbl" x="${LABEL_W + o.dx}" y="${yTop - 7 + o.dy}" fill="${st.color}">${st.label}</text>${grid(yTop, yBot, o)}`,
              );
              Object.entries(planeRow)
                .filter(([k]) => k.endsWith(":" + st.id))
                .forEach(([k, y]) => {
                  const t = TASK[k.split(":")[0]];
                  g.push(
                    `<text class="row-key" x="${LABEL_W - 14 + o.dx}" y="${y + 17 + o.dy}" text-anchor="end">${t.id}</text>`,
                  );
                  const seg = t.path.find(p => p.stage === st.id);
                  ov.out
                    .filter(x => x.who === seg.who || x.who === seg.rev)
                    .forEach(x =>
                      g.push(
                        `<rect class="out" x="${X(d(x.from)) + o.dx}" y="${y + 3 + o.dy}" width="${X(addDays(d(x.to), 1)) - X(d(x.from))}" height="${ROW_H - 6}"/>`,
                      ),
                    );
                });
              g.push(`</g>`);
            }
          } else {
            g.push(grid(AXIS_H, height));
            rows.forEach(r => {
              if (r.kind === "task") {
                const t = TASK[r.id];
                g.push(
                  `<rect x="0" y="${r.y}" width="${width}" height="${ROW_H}" fill="${r.open ? "var(--band)" : "transparent"}"/><g class="twist" data-toggle="${t.id}" tabindex="0" role="button" aria-expanded="${r.open}" aria-label="${r.open ? "Collapse" : "Expand"} ${t.id}"><rect x="6" y="${r.y + 6}" width="18" height="18" rx="3" fill="#fff" stroke="var(--line)"/><text x="15" y="${r.y + 20}" text-anchor="middle" style="font-size:12px;fill:var(--ink-2)">${r.open ? "−" : "+"}</text></g><text class="row-key" x="30" y="${r.y + 12}">${t.id}</text><text class="row-lbl" x="30" y="${r.y + 25}">${t.title}</text>`,
                );
              } else {
                const u = UNIT[r.uid];
                g.push(
                  `<text class="row-lbl" x="40" y="${r.y + 17}"><tspan fill="${STAGE[u.stage].color}" font-weight="600">${STAGE[u.stage].label.split(" ")[0]} · ${u.name}</tspan> <tspan class="row-sub">${people(u)}</tspan></text>`,
                );
                ov.out
                  .filter(o => o.who === WHO(u))
                  .forEach(o =>
                    g.push(
                      `<rect class="out" x="${X(d(o.from))}" y="${r.y + 2}" width="${X(addDays(d(o.to), 1)) - X(d(o.from))}" height="${STEP_H - 4}"/>`,
                    ),
                  );
              }
            });
          }
          // axis
          g.push(`<g class="axis">`);
          for (let i = 0; i < DAYS; i++) {
            const dt = addDays(T0, i);
            if (dt.getDay() === 1)
              g.push(
                `<text x="${LABEL_W + i * DW + 2}" y="${AXIS_H - 14}">${fmt(dt)}</text><line x1="${LABEL_W + i * DW}" x2="${LABEL_W + i * DW}" y1="${AXIS_H - 10}" y2="${AXIS_H}" stroke="#d1d5db"/>`,
              );
          }
          sched.sprints.forEach((s, i) => {
            const x1 = X(d(s.start)),
              x2 = X(addDays(d(s.end), 1));
            g.push(
              `<rect x="${x1}" y="4" width="${x2 - x1}" height="22" fill="${i % 2 ? "#eef2ff" : "#e0e7ff"}" rx="4"/><text class="sprint-lbl" x="${x1 + 6}" y="19">${s.name}</text><text class="sprint-load ${s.over ? "over" : ""}" x="${x2 - 6}" y="19" text-anchor="end">${s.load}/${CAPACITY}d${s.over ? " over" : ""}</text>`,
            );
            if (i < sched.sprints.length - 1)
              g.push(
                `<g class="sbound" data-sbound="${s.id}" tabindex="0" role="slider" aria-label="${s.name} end"><rect x="${x2 - 5}" y="2" width="10" height="26" rx="3"/><line x1="${x2}" x2="${x2}" y1="2" y2="28" stroke="var(--accent)" stroke-width="2"/></g>`,
              );
          });
          Object.values(MS).forEach((m, i) =>
            g.push(
              `<text class="ms-lbl" x="${X(d(m.date)) + 3}" y="${AXIS_H - 2 + (i % 2) * 12}" fill="${m.color}">${m.name} ${fmt(d(m.date))}</text>`,
            ),
          );
          g.push(
            `<text class="ms-lbl" x="${X(d(state.asOf)) - 3}" y="${AXIS_H - 2}" fill="var(--accent)" text-anchor="end">as of ${fmt(d(state.asOf))}</text></g>`,
          );
          // links: explicit cross-task + chain links (chain drawn only when both ends are on separate rows)
          g.push(`<g id="links">`);
          UNITS.forEach(u =>
            sched.deps[u.uid].forEach(p => {
              const isChain = u.prev === p;
              if (isChain && !is3d && rowOf[u.uid] === undefined) return; // collapsed row: chain is implicit
              g.push(
                `<path class="link ${isChain ? "chainlink" : ""} ${sched.chain.has(u.uid) ? "chain" : ""} ${sched.units[u.uid].pushedBy === p ? "tight" : ""}" data-link="${p}>${u.uid}" d="${linkPath(p, u.uid, sched)}" marker-end="url(#arr)"><title>${unitLabel(p)} → ${unitLabel(u.uid)}. Click to remove.</title></path>`,
              );
            }),
          );
          g.push(`</g>`);
          UNITS.forEach(u => {
            const b = baseline()[u.uid],
              o = depthOffset(stageI(u.stage));
            const pos = barPos(u.uid, sched);
            g.push(
              `<rect class="ghost" data-ghost="${u.uid}" x="${X(b.start) + o.dx}" y="${pos.y}" width="${Math.max(DW * b.dur - 2, 6)}" height="${pos.h}" style="opacity:${sched.units[u.uid].moved ? 1 : 0}"/>`,
            );
          });
          UNITS.forEach(u => {
            const p = barPos(u.uid, sched),
              s = sched.units[u.uid];
            g.push(`<g class="bar ${s.moved ? "moved" : ""} ${s.done ? "done" : ""} ${u.review ? "review" : ""} ${sevClass(s)}" data-bar="${u.uid}" tabindex="0" role="button" aria-label="${unitLabel(u.uid)}" transform="translate(${p.x},${p.y})" style="--stage:${STAGE[u.stage].color}">
      <rect class="body" width="${p.w}" height="${p.h}"/>${u.review ? `<rect class="revpat" width="${p.w}" height="${p.h}" fill="url(#rev)" rx="4"/>` : ""}
      <text x="5" y="${p.h - 6}">${barText(u, s, p.w)}</text>
      <rect class="grip" data-grip="${u.uid}" x="${p.w - 6}" y="2" width="6" height="${p.h - 4}" rx="2"/>
      <circle class="lh" data-lh="${u.uid}" cx="${p.w + 6}" cy="${p.h / 2}" r="5"/>
    </g>`);
          });
          g.push(
            `<g id="capstrip">${capStripSvg(sched, ov, height - capStripHeight() - 2)}</g>`,
          );
          wrap.className = is3d ? "scene" : "scroll";
          wrap.innerHTML = `<svg id="gantt" width="${width}" height="${height + top}" viewBox="0 ${-top} ${width} ${height + top}" xmlns="http://www.w3.org/2000/svg">${g.join("")}</svg>`;
          if (is3d)
            document.getElementById("gantt").style.transform =
              `perspective(1400px) rotateX(${state.tilt}deg)`;
          wrap.classList.toggle("linkmode", state.linkMode);
          renderChrome(sched);
        }
        function barText(u, s, w) {
          const slip = s.slip ? ` ${s.slip > 0 ? "+" : ""}${s.slip}d` : "";
          const who = PEOPLE[WHO(u)][0];
          if (w < 30) return "";
          if (w < 60) return `${u.name.slice(0, 4)}${slip}`;
          if (w < 110) return `${u.name} · ${who}${slip}`;
          return `${u.name} · ${PEOPLE[WHO(u)]}${u.review ? " (review)" : ""}${slip}`;
        }
        function refresh() {
          OVP = activeOv();
          scheduleSave();
          if (state.view !== "flat") return render3d(true);
          const svg = document.getElementById("gantt");
          if (!svg) return render();
          const ov = activeOv(),
            sched = schedFor(ov);
          UNITS.forEach(u => {
            const el = svg.querySelector(`[data-bar="${u.uid}"]`);
            if (!el) return;
            const p = barPos(u.uid, sched),
              s = sched.units[u.uid];
            el.setAttribute("transform", `translate(${p.x},${p.y})`);
            el.querySelector("rect.body").setAttribute("width", p.w);
            const rp = el.querySelector(".revpat");
            if (rp) rp.setAttribute("width", p.w);
            el.querySelector(".grip").setAttribute("x", p.w - 6);
            el.querySelector(".lh").setAttribute("cx", p.w + 6);
            el.querySelector("text").textContent = barText(u, s, p.w);
            el.className.baseVal = `bar ${s.moved ? "moved" : ""} ${s.done ? "done" : ""} ${u.review ? "review" : ""} ${sevClass(s)} ${el.classList.contains("dragging") ? "dragging" : ""} ${state.linkFrom === u.uid ? "link-src" : ""}`;
            const gh = svg.querySelector(`[data-ghost="${u.uid}"]`);
            gh.style.opacity = s.moved ? 1 : 0;
          });
          svg.querySelectorAll("[data-link]").forEach(el => {
            const [p, c] = el.dataset.link.split(">");
            el.setAttribute("d", linkPath(p, c, sched));
            el.classList.toggle("tight", sched.units[c].pushedBy === p);
          });
          const cs = svg.querySelector("#capstrip");
          if (cs) {
            const h = +svg.getAttribute("height");
            cs.innerHTML = capStripSvg(sched, ov, h - capStripHeight() - 2);
          }
          renderChrome(sched);
        }
        /* ---------- true 3D: stages are floors, lanes are people (or tasks), time runs along the floor ---------- */
        const cam = { yaw: 0.62, pitch: -0.52, dist: 2600, zoom: 1 };
        const W3 = { day: 12, lane: 64, floor: 110, boxH: 26 };
        function lanes3d() {
          return state.lanesBy === "task"
            ? TASKS.map(t => ({ key: t.id, label: t.id }))
            : Object.keys(PEOPLE).map(k => ({ key: k, label: PEOPLE[k] }));
        }
        function laneOf(u) {
          return lanes3d().findIndex(
            l => l.key === (state.lanesBy === "task" ? u.task : WHO(u)),
          );
        }
        const floorY = stage => (STAGES.length - 1 - stageI(stage)) * W3.floor;
        let view3 = { w: 980, h: 640, cx: 490, cy: 330 };
        function toCam(x, y, z) {
          const L = lanes3d().length;
          const X = x - (DAYS * W3.day) / 2,
            Y = y - ((STAGES.length - 1) * W3.floor + W3.boxH) / 2,
            Z = z - ((L - 1) * W3.lane) / 2;
          const cy = Math.cos(cam.yaw),
            sy = Math.sin(cam.yaw);
          const x1 = X * cy + Z * sy,
            z1 = -X * sy + Z * cy;
          const cp = Math.cos(cam.pitch),
            sp = Math.sin(cam.pitch);
          const y2 = Y * cp - z1 * sp,
            z2 = Y * sp + z1 * cp;
          return { x: x1, y: y2, z: z2 };
        }
        function toScreen(c) {
          const f = cam.dist / (cam.dist + c.z);
          return {
            x: view3.cx + c.x * f * cam.zoom,
            y: view3.cy - c.y * f * cam.zoom,
            f: f * cam.zoom,
          };
        }
        const P3 = (x, y, z) => toScreen(toCam(x, y, z));
        function unitBox(u, s) {
          const li = laneOf(u),
            y = floorY(u.stage);
          return {
            x0: diffDays(s.start, T0) * W3.day,
            x1: (diffDays(s.end, T0) + 1) * W3.day - 2,
            y0: y + 2,
            y1: y + 2 + W3.boxH,
            z0: li * W3.lane - 20,
            z1: li * W3.lane + 20,
          };
        }
        const FACES = [
          [
            [1, 0, 0],
            [1, 1, 0],
            [1, 1, 1],
            [1, 0, 1],
          ],
          [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0],
            [0, 0, 0],
          ],
          [
            [0, 1, 0],
            [0, 1, 1],
            [1, 1, 1],
            [1, 1, 0],
          ],
          [
            [0, 0, 0],
            [1, 0, 0],
            [1, 0, 1],
            [0, 0, 1],
          ],
          [
            [0, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
            [0, 1, 1],
          ],
          [
            [0, 0, 0],
            [0, 1, 0],
            [1, 1, 0],
            [1, 0, 0],
          ],
        ];
        const FACE_SHADE = [0.82, 0.82, 1.18, 0.6, 1.0, 1.0];
        function shade(hex, k) {
          const n = parseInt(hex.slice(1), 16);
          const r = Math.min(255, Math.round(((n >> 16) & 255) * k)),
            g = Math.min(255, Math.round(((n >> 8) & 255) * k)),
            b = Math.min(255, Math.round((n & 255) * k));
          return `rgb(${r},${g},${b})`;
        }
        function visibleFace(cs) {
          const a = cs[0],
            b = cs[1],
            c = cs[2];
          const ux = b.x - a.x,
            uy = b.y - a.y,
            uz = b.z - a.z,
            vx = c.x - a.x,
            vy = c.y - a.y,
            vz = c.z - a.z;
          const nx = uy * vz - uz * vy,
            ny = uz * vx - ux * vz,
            nz = ux * vy - uy * vx;
          const tx = -a.x,
            ty = -a.y,
            tz = -cam.dist - a.z;
          return nx * tx + ny * ty + nz * tz > 0;
        }
        function quad(pts) {
          return (
            "M" +
            pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L") +
            " Z"
          );
        }
        function boxFaces(u, s) {
          const b = unitBox(u, s);
          const C = (i, j, k) =>
            toCam(i ? b.x1 : b.x0, j ? b.y1 : b.y0, k ? b.z1 : b.z0);
          return FACES.map((f, k) => {
            const cs = f.map(([i, j, l]) => C(i, j, l));
            const depth = cs.reduce((n, c) => n + c.z, 0) / 4;
            return {
              k,
              cs,
              depth,
              visible: visibleFace(cs),
              d: quad(cs.map(toScreen)),
            };
          });
        }
        function render3d(patch) {
          const ov = activeOv(),
            sched = schedFor(ov),
            lanes = lanes3d(),
            L = lanes.length;
          const existing = document.getElementById("gantt3");
          if (patch && existing && existing.dataset.lanes === String(L)) {
            UNITS.forEach(u => {
              const s = sched.units[u.uid];
              const faces = boxFaces(u, s);
              const g = existing.querySelector(`[data-bar="${u.uid}"]`);
              if (!g) return;
              faces.forEach(f => {
                const el = g.querySelector(`[data-face="${f.k}"]`);
                if (el) {
                  el.setAttribute("d", f.d);
                  el.style.display = f.visible ? "" : "none";
                }
              });
              g.className.baseVal = `box ${s.moved ? "moved" : ""} ${sevClass(s)} ${state.linkFrom === u.uid ? "link-src" : ""}`;
              const b = unitBox(u, s),
                lp = P3(b.x0 + 3, b.y1, b.z0 + 2);
              const t = g.querySelector("text");
              if (t) {
                t.setAttribute("x", lp.x);
                t.setAttribute("y", lp.y - 3);
                t.textContent = labelFor3d(u, s, b);
              }
              const lh = g.querySelector(".lh");
              if (lh) {
                const hp = P3(b.x1 + 8, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
                lh.setAttribute("cx", hp.x);
                lh.setAttribute("cy", hp.y);
              }
            });
            existing.querySelectorAll("[data-link]").forEach(el => {
              const [p, c] = el.dataset.link.split(">");
              const [x1, y1, x2, y2] = linkPts(p, c, sched);
              el.setAttribute("x1", x1);
              el.setAttribute("y1", y1);
              el.setAttribute("x2", x2);
              el.setAttribute("y2", y2);
              el.classList.toggle("tight", sched.units[c].pushedBy === p);
            });
            drawSlabs(existing.querySelector("#slabs"), sched, ov);
            renderChrome(sched);
            return;
          }
          view3 = {
            w: Math.max(600, wrap.clientWidth || 900),
            h: 640,
            cx: 0,
            cy: 0,
          };
          view3.cx = view3.w / 2;
          view3.cy = view3.h / 2 + 10;
          if (!cam.userZoom)
            cam.zoom = Math.max(0.45, Math.min(1, view3.w / 1150));
          const g = [];
          g.push(
            `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9ca3af" stroke-width="1.5"/></pattern></defs>`,
          );
          const zMin = -W3.lane * 0.6,
            zMax = (L - 0.4) * W3.lane,
            xMin = -12,
            xMax = DAYS * W3.day + 12,
            topY = (STAGES.length - 1) * W3.floor + W3.boxH + 30;
          // floors, far to near
          const floors = STAGES.map(st => {
            const y = floorY(st.id) - 1;
            const pts = [
              [xMin, y, zMin],
              [xMax, y, zMin],
              [xMax, y, zMax],
              [xMin, y, zMax],
            ];
            const cs = pts.map(p => toCam(...p));
            return { st, y, cs, depth: cs.reduce((n, c) => n + c.z, 0) / 4 };
          }).sort((a, b) => b.depth - a.depth);
          floors.forEach(fl => {
            const st = fl.st,
              y = fl.y;
            let h = `<g data-orbit="1"><path class="floor" d="${quad(fl.cs.map(toScreen))}" fill="${st.color}" fill-opacity=".07"/>`;
            sched.sprints.forEach((s, i) => {
              if (i % 2) return;
              const x0 = diffDays(d(s.start), T0) * W3.day,
                x1 = (diffDays(d(s.end), T0) + 1) * W3.day;
              h += `<path d="${quad(
                [
                  [x0, y, zMin],
                  [x1, y, zMin],
                  [x1, y, zMax],
                  [x0, y, zMax],
                ].map(p => P3(...p)),
              )}" fill="rgba(29,78,216,.06)"/>`;
            });
            for (let i = 0; i < DAYS; i++) {
              if (addDays(T0, i).getDay() !== 1) continue;
              const x = i * W3.day;
              const a = P3(x, y, zMin),
                b = P3(x, y, zMax);
              h += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#e5e7eb"/>`;
              if (st.id === "marketing") {
                const lp = P3(x + 2, y, zMax + 10);
                h += `<text class="lane-lbl" x="${lp.x}" y="${lp.y + 10}" font-size="${(10 * lp.f).toFixed(1)}">${fmt(addDays(T0, i))}</text>`;
              }
            }
            const lp = P3(xMin, y + 4, zMin - 6);
            h += `<text class="stage-lbl" x="${lp.x}" y="${lp.y}" fill="${st.color}" font-size="${(13 * lp.f).toFixed(1)}" text-anchor="end">${st.label.split(" ")[0]}</text>`;
            lanes.forEach((ln, i) => {
              const p = P3(xMin - 6, y + 2, i * W3.lane);
              h += `<text class="lane-lbl" x="${p.x}" y="${p.y + 4}" text-anchor="end" font-size="${(11 * p.f).toFixed(1)}">${ln.label}</text>`;
            });
            h += `</g>`;
            g.push(h);
          });
          g.push(`<g id="slabs"></g>`);
          // links (behind boxes)
          g.push(`<g id="links3">`);
          UNITS.forEach(u =>
            sched.deps[u.uid].forEach(p => {
              const isChain = u.prev === p;
              const [x1, y1, x2, y2] = linkPts(p, u.uid, sched);
              g.push(
                `<line class="link3 ${isChain ? "chainlink" : ""} ${sched.units[u.uid].pushedBy === p ? "tight" : ""}" data-link="${p}>${u.uid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${unitLabel(p)} → ${unitLabel(u.uid)}${isChain ? " (step chain)" : ". Click to remove."}</title></line>`,
              );
            }),
          );
          g.push(`</g>`);
          // boxes sorted far to near
          const boxes = UNITS.map(u => {
            const s = sched.units[u.uid];
            const faces = boxFaces(u, s);
            return {
              u,
              s,
              faces,
              depth: faces.reduce((n, f) => n + f.depth, 0) / 6,
            };
          }).sort((a, b) => b.depth - a.depth);
          boxes.forEach(({ u, s, faces }) => {
            const b = unitBox(u, s),
              lp = P3(b.x0 + 3, b.y1, b.z0 + 2),
              hp = P3(b.x1 + 8, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
            const col = s.done ? "#9ca3af" : STAGE[u.stage].color;
            g.push(
              `<g class="box ${s.moved ? "moved" : ""} ${sevClass(s)}" data-bar="${u.uid}" tabindex="0" role="button" aria-label="${unitLabel(u.uid)}">${faces.map(f => `<path class="face" data-face="${f.k}" d="${f.d}" fill="${shade(col, FACE_SHADE[f.k] * (u.review ? 1.12 : 1))}" ${u.review && f.k === 2 ? 'fill-opacity=".85"' : ""} style="${f.visible ? "" : "display:none"}"/>`).join("")}<text x="${lp.x}" y="${lp.y - 3}" font-size="${(11 * lp.f).toFixed(1)}">${labelFor3d(u, s, b)}</text><circle class="lh" data-lh="${u.uid}" cx="${hp.x}" cy="${hp.y}" r="5" fill="#fff" stroke="var(--accent)"/></g>`,
            );
          });
          // milestone + as-of walls (translucent, drawn last)
          const wall = (x, color, label, op, dash) => {
            const pts = [
              [x, -6, zMin],
              [x, topY, zMin],
              [x, topY, zMax],
              [x, -6, zMax],
            ];
            const tp = P3(x, topY + 4, zMin);
            return `<path class="wall" d="${quad(pts.map(p => P3(...p)))}" fill="${color}" fill-opacity="${op}" stroke="${color}" ${dash ? "" : 'stroke-dasharray="none"'}/><text class="ms-lbl" x="${tp.x}" y="${tp.y - 4}" fill="${color}" font-size="${(11 * tp.f).toFixed(1)}">${label}</text>`;
          };
          Object.values(MS).forEach(m =>
            g.push(
              wall(
                diffDays(d(m.date), T0) * W3.day,
                m.color.startsWith("var")
                  ? {
                      "var(--exp)": "#c2410c",
                      "var(--accent)": "#1d4ed8",
                      "var(--crit)": "#b91c1c",
                    }[m.color]
                  : m.color,
                `${m.name} ${fmt(d(m.date))}`,
                0.06,
                true,
              ),
            ),
          );
          g.push(
            wall(
              diffDays(d(state.asOf), T0) * W3.day,
              "#1d4ed8",
              `as of ${fmt(d(state.asOf))}`,
              0.04,
              false,
            ),
          );
          wrap.className = "scroll";
          wrap.innerHTML = `<svg id="gantt3" data-lanes="${L}" width="${view3.w}" height="${view3.h}" viewBox="0 0 ${view3.w} ${view3.h}" xmlns="http://www.w3.org/2000/svg" style="touch-action:none;background:linear-gradient(#fff,#f3f4f6)">${g.join("")}</svg>`;
          drawSlabs(document.getElementById("slabs"), sched, ov);
          wrap.classList.toggle("linkmode", state.linkMode);
          renderChrome(sched);
        }
        function labelFor3d(u, s, b) {
          const w = (b.x1 - b.x0) * P3(b.x0, b.y1, b.z0).f;
          if (w < 26) return "";
          const slip = s.slip ? ` ${s.slip > 0 ? "+" : ""}${s.slip}d` : "";
          if (w < 70) return `${u.name.slice(0, 4)}${slip}`;
          return `${u.task.slice(4)} ${u.name}${slip}`;
        }
        function linkPts(from, to, sched) {
          const a = UNIT[from],
            b = UNIT[to],
            ba = unitBox(a, sched.units[from]),
            bb = unitBox(b, sched.units[to]);
          const p1 = P3(ba.x1, ba.y1, (ba.z0 + ba.z1) / 2),
            p2 = P3(bb.x0, bb.y1, (bb.z0 + bb.z1) / 2);
          return [
            p1.x.toFixed(1),
            p1.y.toFixed(1),
            p2.x.toFixed(1),
            p2.y.toFixed(1),
          ];
        }
        function drawSlabs(el, sched, ov) {
          if (!el) return;
          const wl = sched.wl;
          let h = "";
          const y = -5;
          if (state.lanesBy !== "task")
            Object.keys(PEOPLE).forEach((p, li) => {
              const z0 = li * W3.lane - 24,
                z1 = li * W3.lane + 24;
              let run = null;
              const flush = () => {
                if (!run) return;
                const x0 = run.s * W3.day,
                  x1 = (run.e + 1) * W3.day;
                h += `<path class="slab ${run.k}" d="${quad(
                  [
                    [x0, y, z0],
                    [x1, y, z0],
                    [x1, y, z1],
                    [x0, y, z1],
                  ].map(q => P3(...q)),
                )}"><title>${PEOPLE[p]}: ${run.k === "over" ? "overcommitted, " + run.n + " steps at once" : run.k === "out" ? "out" : "no work assigned"} ${fmt(addDays(T0, run.s))}–${fmt(addDays(T0, run.e))}</title></path>`;
                run = null;
              };
              for (let i = 0; i < DAYS; i++) {
                const inSprint = sched.sprints.some(
                  s =>
                    addDays(T0, i) >= d(s.start) && addDays(T0, i) <= d(s.end),
                );
                const k = wl.outAt(p, i)
                  ? "out"
                  : wl.daily[p][i] > 1
                    ? "over"
                    : wl.daily[p][i] === 0 && wl.isWork(i) && inSprint
                      ? "idle"
                      : null;
                if (run && (k !== run.k || !k)) flush();
                if (k && !run) run = { k, s: i, e: i, n: wl.daily[p][i] };
                else if (k && run) {
                  run.e = i;
                  run.n = Math.max(run.n, wl.daily[p][i]);
                }
              }
              flush();
            });
          // team utilization per day along the front edge of the ground floor
          const z0 = -W3.lane * 0.62 - 16,
            z1 = -W3.lane * 0.62 - 2;
          wl.perDay.forEach(dy => {
            if (!dy.work) return;
            const x0 = dy.i * W3.day,
              x1 = (dy.i + 1) * W3.day;
            const fill =
              dy.util > 100
                ? "rgba(185,28,28,.6)"
                : dy.util >= 50
                  ? "rgba(21,128,61,.45)"
                  : dy.util > 0
                    ? "rgba(180,83,9,.45)"
                    : dy.inSprint
                      ? "rgba(156,163,175,.35)"
                      : "transparent";
            h += `<path d="${quad(
              [
                [x0, y, z0],
                [x1, y, z0],
                [x1, y, z1],
                [x0, y, z1],
              ].map(q => P3(...q)),
            )}" fill="${fill}"><title>Team ${fmt(addDays(T0, dy.i))}: ${dy.load} step-days ÷ ${dy.avail} people = ${dy.util}%</title></path>`;
          });
          const lp = P3(-14, y, (z0 + z1) / 2);
          h += `<text class="lane-lbl" x="${lp.x}" y="${lp.y + 4}" text-anchor="end" font-size="${(10.5 * lp.f).toFixed(1)}">Team/day</text>`;
          el.innerHTML = h;
        }
        function renderChrome(sched) {
          const sc = activeScenario(),
            ov = activeOv();
          document.getElementById("scenTabs").innerHTML = state.scenarios
            .map(s => {
              const sm = compute(s.ov, state.asOf, baseline()).summary;
              const delta = s.locked
                ? `<span class="lock">current plan</span>`
                : `<span class="delta"><b>${sm.moved}</b> steps moved · <b>${sm.spills}</b> spills · <b>${sm.critical + sm.expired}</b> critical · <b>${sm.warning}</b> warn</span>`;
              return `<div class="tab" role="tab" tabindex="0" data-scen="${s.id}" aria-selected="${s.id === state.active}">${s.name} ${delta}</div>`;
            })
            .join("");
          document.getElementById("commitBtn").disabled =
            sc.locked || !sc.ov.changes.length;
          document.getElementById("resetScen").disabled = sc.locked;
          document
            .getElementById("linkMode")
            .setAttribute("aria-pressed", state.linkMode);
          document.getElementById("linkMode").textContent = state.linkMode
            ? state.linkFrom
              ? `Linking from ${unitLabel(state.linkFrom)}… click target`
              : "Add link: click source step"
            : "Add link";
          const v = state.view;
          document.getElementById("hint").innerHTML =
            v !== "flat"
              ? `<span class="k">Floors are stages (planning on top), lanes run back in depth, time runs along each floor. Drag empty space to orbit, wheel to zoom. Drag a box along the floor to move it in time, or across lanes to reassign it to that person.</span>
       <label class="k">Lanes <select id="lanesBy"><option value="person" ${state.lanesBy !== "task" ? "selected" : ""}>people</option><option value="task" ${state.lanesBy === "task" ? "selected" : ""}>tasks</option></select></label>
       <span class="k"><span class="sw" style="background:rgba(185,28,28,.35)"></span> overcommitted (two steps at once)</span><span class="k"><span class="sw" style="background:repeating-linear-gradient(45deg,#9ca3af 0 1px,transparent 1px 4px)"></span> no work in sprint</span><span class="k"><span class="sw" style="background:rgba(180,83,9,.25)"></span> out</span>
       <button id="resetCam" class="ghost">Reset view</button>`
              : `<span class="k">bars are steps, coloured by stage:</span>${STAGES.map(s => `<span class="k"><span class="sw" style="background:${s.color}"></span>${s.label.split(" ")[0]}</span>`).join("")}<span class="k"><span class="sw" style="background:#64748b;background-image:repeating-linear-gradient(-45deg,rgba(255,255,255,.55) 0 2px,transparent 2px 5px)"></span> review / QA, worked by the reviewer</span><span class="k"><span class="sw" style="border:1.5px dashed var(--ghost)"></span> where it was</span><span class="k"><span class="sw" style="border:2px solid var(--crit)"></span> critical</span><span class="k"><span class="sw" style="border:2px solid var(--warn)"></span> warning</span><span class="k">+ expands a task into its steps · drag a step to move it, its right edge to change duration, a link to remove it</span>`;
          if (v !== "flat") {
            document.getElementById("lanesBy").onchange = e => {
              state.lanesBy = e.target.value;
              render();
            };
            document.getElementById("resetCam").onclick = () => {
              cam.yaw = 0.62;
              cam.pitch = -0.52;
              cam.userZoom = false;
              render();
            };
          }
          const tb = document.getElementById("timebar");
          tb.hidden = v !== "4d";
          if (v === "4d") {
            const hist = sc.history;
            const idx = state.replay ? state.replay.idx : hist.length - 1;
            tb.innerHTML = `<label>As-of date <input type="range" id="asof" min="0" max="${DAYS - 1}" value="${diffDays(d(state.asOf), T0)}"> <b>${fmt(d(state.asOf))}</b></label>
      <label>Replay edits <input type="range" id="replay" min="0" max="${Math.max(hist.length - 1, 0)}" value="${Math.max(idx, 0)}" ${hist.length ? "" : "disabled"}> <b>${hist.length ? `step ${idx + 1} / ${hist.length}` : "no edits yet"}</b></label>
      <button id="play" ${hist.length > 1 ? "" : "disabled"}>▶ Play ripple</button>
      <span class="empty">Scrub the as-of date to watch date rules turn from warning to expired; replay steps through this scenario's edits as motion.</span>`;
            document.getElementById("asof").oninput = e => {
              state.asOf = iso(addDays(T0, +e.target.value));
              baselineSched = null;
              render();
            };
            document.getElementById("replay").oninput = e => {
              state.replay = { idx: +e.target.value };
              refresh();
            };
            document.getElementById("play").onclick = () => {
              let i = 0;
              state.replay = { idx: 0 };
              refresh();
              const tm = setInterval(() => {
                i++;
                if (i >= hist.length) {
                  clearInterval(tm);
                  state.replay = null;
                  refresh();
                  return;
                }
                state.replay = { idx: i };
                refresh();
              }, 700);
            };
          }
          const rl = document.getElementById("risks");
          const vis = sched.risks.filter(r => r.sev !== "info");
          rl.innerHTML =
            (vis.length
              ? vis
                  .sort(
                    (a, b) =>
                      ["expired", "critical", "warning"].indexOf(a.sev) -
                      ["expired", "critical", "warning"].indexOf(b.sev),
                  )
                  .map(
                    r =>
                      `<li><span class="pill ${r.sev}">${r.sev}</span><span><b>${r.rule}</b> — ${r.msg}</span></li>`,
                  )
                  .join("")
              : `<li class="empty">No risks. COD ${fmt(sched.summary.codDate)} ≤ ${fmt(d(MS.cod.date))}; LC notice ${fmt(sched.summary.lcDate)} ≤ ${fmt(d(MS.lcNotice.date))}.</li>`) +
            (Object.keys(sched.summary.notify).length
              ? `<li style="margin-top:6px"><span class="pill info">update</span><span>${Object.entries(
                  sched.summary.notify,
                )
                  .map(([k, v]) => `<b>${k}</b>: ${v.join("; ")}`)
                  .join("<br>")}</span></li>`
              : "");
          const wl = sched.wl;
          document.getElementById("workload").innerHTML =
            `<table class="wl"><tr><th></th>${sched.sprints.map(s => `<th>${s.name.replace("Sprint ", "S")}</th>`).join("")}</tr>${wl.table
              .map(
                r =>
                  `<tr><th>${r.name}</th>${r.cells
                    .map(c => {
                      const cls =
                        c.avail === 0
                          ? "none"
                          : c.over > 0 || c.util > 100
                            ? "over"
                            : c.util < 50
                              ? "under"
                              : "ok";
                      return `<td class="${cls}" title="${r.name} ${c.sprint}: ${c.load} step-days over ${c.avail} available days${c.over ? ", " + c.over + " days with two steps at once" : ""}${c.idle ? ", " + c.idle + " idle days" : ""}">${c.avail === 0 ? "out" : c.util + "%"}${c.over ? " ⚠" : ""}</td>`;
                    })
                    .join("")}</tr>`,
              )
              .join(
                "",
              )}</table><div class="empty" style="margin-top:6px">% = step-days assigned ÷ working days available. Over 100% or two steps on one day = overcommitted; under 50% = undercommitted.</div>`;
          document.getElementById("gaps").innerHTML = wl.gaps.length
            ? wl.gaps
                .slice(0, 6)
                .map(
                  gp =>
                    `<li><span class="pill ${gp.days >= 5 ? "warning" : "info"}">${gp.days}d wait</span><span><b>${gp.task}</b> between ${gp.from.name} and ${gp.to.name}: ${gp.why}</span></li>`,
                )
                .join("")
            : `<li class="empty">No waits of two days or more between steps.</li>`;
          document.getElementById("changes").innerHTML = ov.changes.length
            ? ov.changes.map(c => `<li>· ${c}</li>`).join("")
            : `<li class="empty">${sc.locked ? "Baseline is read-only. Create a scenario, or drag a step and one is created for you." : "No changes yet."}</li>`;
          Object.keys(OUT_PRESETS).forEach(k => {
            document.getElementById(k).checked = ov.out.some(
              o => o.label === OUT_PRESETS[k].label,
            );
          });
          const cmp = document.getElementById("compare");
          cmp.hidden = !state.compare;
          if (state.compare) renderCompare();
          document.getElementById("decisions").innerHTML = state.decisions
            .length
            ? state.decisions
                .map(
                  x =>
                    `<li><span class="pill info">D${x.n}</span><span><b>${x.title}</b><br><span class="changes">${x.why || "no reason given"} · ${x.when}</span></span></li>`,
                )
                .join("")
            : `<li class="empty">Nothing committed yet.</li>`;
        }
        function renderCompare() {
          const cols = state.scenarios.map(s => ({
            s,
            sm: compute(s.ov, state.asOf, baseline()).summary,
          }));
          const rowsDef = [
            [
              "Steps moved (tasks)",
              c => `${c.sm.moved} (${c.sm.movedTasks})`,
              null,
            ],
            ["Max slip (days)", c => c.sm.maxSlip, "low"],
            ["Sprint spills", c => c.sm.spills, "low"],
            ["Critical / expired", c => c.sm.critical + c.sm.expired, "low"],
            ["Warnings", c => c.sm.warning, "low"],
            [
              "PPA COD readiness",
              c =>
                fmt(c.sm.codDate) +
                (c.sm.codMet ? " ✓" : " ✗ after " + fmt(d(MS.cod.date))),
              null,
            ],
            [
              "LC notice sent",
              c =>
                fmt(c.sm.lcDate) +
                (c.sm.lcMet ? " ✓" : " ✗ after " + fmt(d(MS.lcNotice.date))),
              null,
            ],
            [
              "Release 2.3",
              c => fmt(c.sm.relDate) + (c.sm.relMet ? " ✓" : " ✗ slips"),
              null,
            ],
            [
              "Sprints over capacity",
              c => c.sm.overSprints.join(", ") || "none",
              null,
            ],
            [
              "Stakeholders to update",
              c => Object.keys(c.sm.notify).join(", ") || "—",
              null,
            ],
            ["Overcommitted person-sprints", c => c.sm.overCells, "low"],
            ["Idle person-days in sprints", c => c.sm.idleDays, "low"],
            ["Waiting days between steps", c => c.sm.gapDays, "low"],
            [
              "Changes",
              c =>
                c.s.ov.changes.length
                  ? `<span class="changes">${c.s.ov.changes.join("<br>")}</span>`
                  : '<span class="changes">—</span>',
              null,
            ],
          ];
          let h = `<table class="cmp"><tr><th></th>${cols.map(c => `<th>${c.s.name}</th>`).join("")}</tr>`;
          rowsDef.forEach(([label, f, dir]) => {
            const vals = cols.map(f);
            let best = null,
              worst = null;
            if (dir === "low" && cols.length > 1) {
              const nums = vals.map(Number);
              best = Math.min(...nums);
              worst = Math.max(...nums);
              if (best === worst) best = worst = null;
            }
            h += `<tr><th>${label}</th>${vals.map(v => `<td class="${dir && best !== null ? (Number(v) === best ? "best" : Number(v) === worst ? "worst" : "") : ""}">${v}</td>`).join("")}</tr>`;
          });
          document.getElementById("compareBody").innerHTML = h + "</table>";
        }

        /* ---------- interactions ---------- */
        function ensureScenario() {
          let sc = activeScenario();
          if (sc.locked) {
            sc = newScenario();
            toast(
              `Baseline is the current plan. Created ${sc.name} so you can experiment.`,
            );
          }
          return sc;
        }
        function newScenario() {
          const n = state.scenarios.length;
          const sc = {
            id: "sc" + ++seq,
            name: "Scenario " + String.fromCharCode(64 + n),
            locked: false,
            ov: emptyOv(),
            history: [],
          };
          state.scenarios.push(sc);
          state.active = sc.id;
          state.replay = null;
          render();
          return sc;
        }
        function snapshot(sc, label) {
          sc.ov.changes.push(label);
          sc.history.push(clone(sc.ov));
          state.replay = null;
        }

        let drag = null;
        wrap.addEventListener("pointerdown", e => {
          const grip = e.target.closest("[data-grip]"),
            bar = e.target.closest("[data-bar]"),
            sb = e.target.closest("[data-sbound]"),
            lh = e.target.closest("[data-lh]"),
            tg = e.target.closest("[data-toggle]");
          if (tg) {
            const id = tg.dataset.toggle;
            state.expanded.has(id)
              ? state.expanded.delete(id)
              : state.expanded.add(id);
            render();
            return;
          }
          if (lh || (state.linkMode && bar)) {
            e.preventDefault();
            return handleLink(bar.dataset.bar);
          }
          if (sb) {
            drag = {
              kind: "sbound",
              id: sb.dataset.sbound,
              x0: e.clientX,
              base: schedFor(activeOv()).sprints.find(
                s => s.id === sb.dataset.sbound,
              ).end,
              sc: null,
              applied: 0,
            };
            return;
          }
          if (
            !bar &&
            state.view === "flat" &&
            !e.target.closest("[data-link]")
          ) {
            drag = {
              kind: "pan",
              x0: e.clientX,
              y0: e.clientY,
              sl: wrap.scrollLeft,
              st: wrap.scrollTop,
            };
            wrap.classList.add("panning");
            e.preventDefault();
            return;
          }
          if (!bar) {
            if (
              state.view !== "flat" &&
              !e.target.closest("[data-link]") &&
              !e.target.closest(".lh")
            ) {
              drag = {
                kind: "orbit",
                x0: e.clientX,
                y0: e.clientY,
                yaw0: cam.yaw,
                pitch0: cam.pitch,
              };
              document.getElementById("gantt3")?.classList.add("orbiting");
              e.preventDefault();
            }
            return;
          }
          const uid = bar.dataset.bar;
          const s = schedFor(activeOv()).units[uid];
          drag = {
            kind: grip ? "resize" : "move",
            uid,
            x0: e.clientX,
            y0: e.clientY,
            baseStart: iso(s.start),
            baseDur: s.dur,
            sc: null,
            applied: 0,
            px: 0,
          };
          if (state.view !== "flat") {
            const u = UNIT[uid],
              b = unitBox(u, s);
            const p0 = P3(b.x0, b.y1, (b.z0 + b.z1) / 2),
              p1 = P3(b.x0 + W3.day, b.y1, (b.z0 + b.z1) / 2);
            drag.dayVec = [p1.x - p0.x, p1.y - p0.y];
            if (state.lanesBy !== "task" && !grip) {
              OVP = activeOv();
              const p2 = P3(b.x0, b.y1, (b.z0 + b.z1) / 2 + W3.lane);
              drag.laneVec = [p2.x - p0.x, p2.y - p0.y];
              drag.lane0 = laneOf(u);
              drag.who0 = WHO(u);
            }
          }
          document
            .querySelector(`[data-bar="${uid}"]`)
            ?.classList.add("dragging");
          e.preventDefault();
        });
        window.addEventListener("pointermove", e => {
          if (!drag) return;
          if (drag.kind === "pan") {
            wrap.scrollLeft = drag.sl - (e.clientX - drag.x0);
            wrap.scrollTop = drag.st - (e.clientY - drag.y0);
            return;
          }
          drag.px = Math.max(
            drag.px || 0,
            Math.abs(e.clientX - drag.x0) +
              Math.abs(e.clientY - (drag.y0 ?? e.clientY)),
          );
          if (drag.kind === "orbit") {
            cam.yaw = drag.yaw0 + (e.clientX - drag.x0) * 0.006;
            cam.pitch = Math.max(
              -1.35,
              Math.min(0.25, drag.pitch0 + (e.clientY - drag.y0) * 0.006),
            );
            render3d();
            document.getElementById("gantt3")?.classList.add("orbiting");
            return;
          }
          let days,
            dl = 0;
          if (drag.dayVec) {
            const [ax, ay] = drag.dayVec,
              dx = e.clientX - drag.x0,
              dy = e.clientY - drag.y0;
            if (drag.laneVec) {
              const [bx, by] = drag.laneVec,
                det = ax * by - ay * bx;
              if (Math.abs(det) > 1e-3) {
                days = Math.round((dx * by - dy * bx) / det);
                dl = Math.round((ax * dy - ay * dx) / det);
              } else
                days = Math.round((dx * ax + dy * ay) / (ax * ax + ay * ay));
            } else days = Math.round((dx * ax + dy * ay) / (ax * ax + ay * ay));
          } else days = Math.round((e.clientX - drag.x0) / DW);
          if (drag.laneVec) {
            const L = lanes3d().length;
            dl = Math.max(-drag.lane0, Math.min(L - 1 - drag.lane0, dl));
          }
          if (days === drag.applied && dl === (drag.dl || 0)) return;
          drag.applied = days;
          drag.dl = dl;
          if (!drag.sc) {
            drag.sc = ensureScenario();
            const pp = drag.sc.ov.people[drag.uid];
            drag.pp0 = pp ? { ...pp } : null;
          }
          const ov = drag.sc.ov;
          if (drag.laneVec) {
            const target = lanes3d()[drag.lane0 + dl].key;
            if (dl === 0) {
              if (drag.pp0) ov.people[drag.uid] = { ...drag.pp0 };
              else delete ov.people[drag.uid];
            } else
              ov.people[drag.uid] = {
                ...(ov.people[drag.uid] || {}),
                who: target,
              };
            tip.style.display = dl ? "block" : "none";
            if (dl) {
              tip.innerHTML = `Reassign to <b>${PEOPLE[target]}</b>${days ? ` · ${days > 0 ? "+" : ""}${days}d` : ""}`;
              tip.style.left = e.clientX + 14 + "px";
              tip.style.top = e.clientY + 14 + "px";
            }
          }
          if (drag.kind === "move")
            ov.starts[drag.uid] = iso(addDays(d(drag.baseStart), days));
          else if (drag.kind === "resize")
            ov.durs[drag.uid] = Math.max(1, drag.baseDur + days);
          else ov.bounds[drag.id] = iso(addDays(d(drag.base), days));
          refresh();
        });
        window.addEventListener("pointerup", e => {
          if (!drag) return;
          if (drag.kind === "pan") {
            drag = null;
            wrap.classList.remove("panning");
            return;
          }
          if (
            (drag.kind === "move" || drag.kind === "resize") &&
            !drag.applied &&
            (drag.px || 0) < 5
          ) {
            const uid = drag.uid;
            drag = null;
            document
              .querySelectorAll(".bar.dragging")
              .forEach(el => el.classList.remove("dragging"));
            openPop(uid, e.clientX, e.clientY);
            return;
          }
          if (drag.kind === "orbit") {
            drag = null;
            document.getElementById("gantt3")?.classList.remove("orbiting");
            return;
          }
          const days = drag.applied,
            sc = drag.sc;
          document
            .querySelectorAll(".bar.dragging")
            .forEach(el => el.classList.remove("dragging"));
          tip.style.display = "none";
          if (drag.dl) {
            const who = lanes3d()[drag.lane0 + drag.dl].key;
            if (!days) delete sc.ov.starts[drag.uid];
            snapshot(
              sc,
              `${unitLabel(drag.uid)} reassigned ${PEOPLE[drag.who0]} → ${PEOPLE[who]}${days ? `, start ${days > 0 ? "+" : ""}${days}d` : ""}`,
            );
            toast(
              `${unitLabel(drag.uid)} reassigned to ${PEOPLE[who]}. Check the Workload panel for the new load.`,
            );
          } else if (days) {
            if (drag.kind === "move")
              snapshot(
                sc,
                `${unitLabel(drag.uid)} start ${days > 0 ? "+" : ""}${days}d → ${fmt(d(sc.ov.starts[drag.uid]))}`,
              );
            else if (drag.kind === "resize")
              snapshot(
                sc,
                `${unitLabel(drag.uid)} ${drag.baseDur}d → ${sc.ov.durs[drag.uid]}d`,
              );
            else
              snapshot(
                sc,
                `${BASE_SPRINTS.find(s => s.id === drag.id).name} end → ${fmt(d(sc.ov.bounds[drag.id]))}`,
              );
          }
          drag = null;
          refresh();
          if (pop.uid) fillPop();
        });
        wrap.addEventListener("click", e => {
          const link = e.target.closest("[data-link]");
          if (!link) return;
          const [from, to] = link.dataset.link.split(">");
          const sc = ensureScenario();
          if (UNIT[to].prev === from) {
            toast(
              "That is the step chain inside one task; it cannot be removed, only re-timed.",
            );
            return;
          }
          if (BASE_LINKS.some(l => l.from === from && l.to === to))
            sc.ov.rmLinks.push({ from, to });
          else
            sc.ov.addLinks = sc.ov.addLinks.filter(
              l => !(l.from === from && l.to === to),
            );
          snapshot(sc, `link ${unitLabel(from)} → ${unitLabel(to)} removed`);
          render();
        });
        function handleLink(uid) {
          if (!state.linkMode) state.linkMode = true;
          if (!state.linkFrom) {
            state.linkFrom = uid;
            refresh();
            return;
          }
          if (state.linkFrom === uid) {
            state.linkFrom = null;
            refresh();
            return;
          }
          const sc = ensureScenario(),
            deps = effectiveDeps(sc.ov),
            from = state.linkFrom,
            to = uid;
          if (deps[to].has(from)) toast("That link already exists.");
          else if (wouldCycle(deps, from, to))
            toast(
              `Cannot link ${unitLabel(from)} → ${unitLabel(to)}: it would create a cycle.`,
            );
          else {
            sc.ov.addLinks.push({ from, to });
            snapshot(sc, `link ${unitLabel(from)} → ${unitLabel(to)} added`);
          }
          state.linkFrom = null;
          state.linkMode = false;
          render();
        }
        wrap.addEventListener("keydown", e => {
          const tg = e.target.closest?.("[data-toggle]");
          if (tg && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            const id = tg.dataset.toggle;
            state.expanded.has(id)
              ? state.expanded.delete(id)
              : state.expanded.add(id);
            render();
            return;
          }
          const bar = e.target.closest?.("[data-bar]");
          if (!bar) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const sc = ensureScenario();
            const uid = bar.dataset.bar;
            const s = schedFor(sc.ov).units[uid];
            const days = e.key === "ArrowRight" ? 1 : -1;
            sc.ov.starts[uid] = iso(addDays(s.start, days));
            snapshot(
              sc,
              `${unitLabel(uid)} start ${days > 0 ? "+" : ""}${days}d → ${fmt(d(sc.ov.starts[uid]))}`,
            );
            refresh();
            document.querySelector(`[data-bar="${uid}"]`)?.focus();
          }
        });
        const tip = document.getElementById("tip");
        wrap.addEventListener("pointermove", e => {
          const bar = e.target.closest("[data-bar]");
          if (!bar || drag) {
            tip.style.display = "none";
            return;
          }
          const uid = bar.dataset.bar,
            u = UNIT[uid],
            t = TASK[u.task],
            s = schedFor(activeOv()).units[uid],
            b = baseline()[uid];
          tip.innerHTML = `<b>${t.id} ${t.title}</b> · ${STAGE[u.stage].label} · <b>${u.name}</b> ${s.dur}d<br>${u.review ? `Reviewer ${PEOPLE[WHO(u)]} works this step` : `Assignee ${PEOPLE[WHO(u)]}${REV(u) ? ` · reviewer ${PEOPLE[REV(u)]}` : ""}`}${STK(u).length ? `<br>Update / ask: ${STK(u).join(", ")}` : ""}<br>${fmt(s.start)} → ${fmt(s.end)}${s.moved ? ` (was ${fmt(b.start)} → ${fmt(b.end)}, ${s.slip > 0 ? "+" : ""}${s.slip}d)` : ""}${s.pushedBy ? `<br>pushed by ${unitLabel(s.pushedBy)}` : ""}${s.risks.map(r => `<span class="r ${r.sev}">${r.rule}: ${r.msg}</span>`).join("")}`;
          tip.style.display = "block";
          tip.style.left = e.clientX + 14 + "px";
          tip.style.top = e.clientY + 14 + "px";
        });
        wrap.addEventListener(
          "pointerleave",
          () => (tip.style.display = "none"),
        );
        wrap.addEventListener(
          "wheel",
          e => {
            if (state.view === "flat") return;
            e.preventDefault();
            cam.userZoom = true;
            cam.zoom = Math.max(
              0.4,
              Math.min(3, cam.zoom * (e.deltaY < 0 ? 1.1 : 0.9)),
            );
            render3d();
          },
          { passive: false },
        );
        document.querySelectorAll("[data-view]").forEach(
          b =>
            (b.onclick = () => {
              state.view = b.dataset.view;
              state.replay = null;
              document
                .querySelectorAll("[data-view]")
                .forEach(x => x.setAttribute("aria-selected", x === b));
              render();
            }),
        );
        document.getElementById("scenTabs").addEventListener("click", e => {
          const t = e.target.closest("[data-scen]");
          if (t) {
            state.active = t.dataset.scen;
            state.replay = null;
            render();
          }
        });
        document.getElementById("scenTabs").addEventListener("keydown", e => {
          const t = e.target.closest("[data-scen]");
          if (t && (e.key === "Enter" || e.key === " ")) {
            state.active = t.dataset.scen;
            state.replay = null;
            render();
          }
        });
        document.getElementById("newScen").onclick = () => newScenario();
        document.getElementById("linkMode").onclick = () => {
          state.linkMode = !state.linkMode;
          state.linkFrom = null;
          render();
        };
        document.getElementById("resetScen").onclick = () => {
          const sc = activeScenario();
          if (sc.locked) return;
          sc.ov = emptyOv();
          sc.history = [];
          state.replay = null;
          render();
        };
        document.getElementById("compareBtn").onclick = () => {
          state.compare = !state.compare;
          document
            .getElementById("compareBtn")
            .setAttribute("aria-pressed", state.compare);
          renderChrome(schedFor(activeOv()));
          if (state.compare)
            document
              .getElementById("compare")
              .scrollIntoView({ behavior: "smooth" });
        };
        Object.keys(OUT_PRESETS).forEach(
          k =>
            (document.getElementById(k).onchange = e => {
              const sc = ensureScenario();
              const p = OUT_PRESETS[k];
              if (e.target.checked) {
                sc.ov.out.push(p);
                snapshot(sc, p.label);
              } else {
                sc.ov.out = sc.ov.out.filter(o => o.label !== p.label);
                snapshot(sc, `${p.label} removed`);
              }
              render();
            }),
        );

        const modal = document.getElementById("modal");
        document.getElementById("commitBtn").onclick = () => {
          const sc = activeScenario(),
            sched = schedFor(sc.ov);
          const moved = UNITS.filter(u => sched.units[u.uid].moved);
          const mt = [...new Set(moved.map(u => u.task))];
          document.getElementById("dlgBody").innerHTML =
            `<p>Commit <b>${sc.name}</b> to the plan. This writes:</p><ul>
    <li>${moved.length} step date changes across ${mt.length} tasks (${mt.join(", ") || "none"})</li>
    <li>${sc.ov.addLinks.length + sc.ov.rmLinks.length} dependency link changes · ${Object.keys(sc.ov.bounds).length} sprint boundary changes · ${sc.ov.out.length} availability notes</li>
    <li>Stakeholders to update: ${Object.keys(sched.summary.notify).join(", ") || "none"}</li></ul>
    <p>Risks after commit: ${sched.summary.critical + sched.summary.expired} critical, ${sched.summary.warning} warnings.</p>`;
          modal.hidden = false;
          document.getElementById("dlgWhy").focus();
        };
        document.getElementById("dlgCancel").onclick = () =>
          (modal.hidden = true);
        document.getElementById("dlgOk").onclick = () => {
          const sc = activeScenario(),
            sched = schedFor(sc.ov),
            why = document.getElementById("dlgWhy").value.trim();
          const moved = UNITS.filter(u => sched.units[u.uid].moved);
          const mt = [...new Set(moved.map(u => u.task))];
          // write dates: first step keeps task start; every step's duration; explicit starts become the task start when they were the first step
          TASKS.forEach(t => {
            t.start = iso(sched.units[t.units[0].uid].start);
            t.units.forEach(u => {
              u.dur = sched.units[u.uid].dur;
              const seg = t.path.find(p => p.stage === u.stage);
              const st = seg.steps.find(x => x[0] === u.step);
              if (st) st[1] = u.dur;
            });
          });
          BASE_LINKS = BASE_LINKS.filter(
            l => !sc.ov.rmLinks.some(r => r.from === l.from && r.to === l.to),
          ).concat(sc.ov.addLinks);
          BASE_SPRINTS.forEach((s, i) => {
            const e = sched.sprints[i];
            s.start = e.start;
            s.end = e.end;
          });
          // keep explicit later-step starts as gaps: store as per-unit start overrides in the baseline via task start only when first step; otherwise carried as a fixed start
          Object.entries(sc.ov.starts).forEach(([uid, dt]) => {
            const u = UNIT[uid];
            if (u.prev) BASE_STARTS[uid] = dt;
          });
          Object.entries(sc.ov.people || {}).forEach(([uid, pp]) => {
            BASE_PEOPLE[uid] = { ...(BASE_PEOPLE[uid] || {}), ...pp };
          });
          const notes = Object.entries(sc.ov.notes || {})
            .filter(([, v]) => v)
            .map(([uid, v]) => `${unitLabel(uid)}: ${v}`);
          state.decisions.unshift({
            n: state.decisions.length + 1,
            title: `${sc.name} committed: ${mt.join(", ") || "no moves"}${sc.ov.addLinks.length + sc.ov.rmLinks.length ? ", links changed" : ""} · update ${Object.keys(sched.summary.notify).join(", ") || "nobody"}`,
            why: [why, ...notes].filter(Boolean).join(" · "),
            when: new Date().toLocaleString([], {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
          state.scenarios = [
            {
              id: "base",
              name: "Baseline",
              locked: true,
              ov: emptyOv(),
              history: [],
            },
          ];
          state.active = "base";
          baselineSched = null;
          state.compare = false;
          state.replay = null;
          modal.hidden = true;
          document.getElementById("dlgWhy").value = "";
          closePop();
          render();
          toast(
            `Committed. ${moved.length} steps updated on ${mt.join(", ") || "no tasks"}; decision entry D${state.decisions.length} recorded; ${Object.keys(sched.summary.notify).join(", ") || "nobody"} to update.`,
          );
        };

        /* ---------- editable popover ---------- */
        const popEl = document.createElement("div");
        popEl.className = "pop";
        popEl.hidden = true;
        popEl.setAttribute("role", "dialog");
        popEl.setAttribute("aria-label", "Edit step");
        document.body.appendChild(popEl);
        const pop = { uid: null };
        function openPop(uid, x, y) {
          pop.uid = uid;
          fillPop();
          popEl.hidden = false;
          const r = popEl.getBoundingClientRect();
          popEl.style.left =
            Math.max(8, Math.min(x + 12, innerWidth - r.width - 8)) + "px";
          popEl.style.top =
            Math.max(8, Math.min(y + 12, innerHeight - r.height - 8)) + "px";
          popEl.querySelector("input,select")?.focus();
        }
        function closePop() {
          pop.uid = null;
          popEl.hidden = true;
        }
        function editOv(label, fn) {
          const sc = ensureScenario();
          fn(sc.ov);
          snapshot(sc, label);
          render();
          fillPop();
        }
        function fillPop() {
          if (!pop.uid) return;
          const uid = pop.uid,
            u = UNIT[uid],
            t = TASK[u.task],
            ov = activeOv();
          OVP = ov;
          const sched = schedFor(ov),
            s = sched.units[uid],
            b = baseline()[uid],
            sc = activeScenario();
          const opts = (sel, none) =>
            (none ? `<option value="">— none —</option>` : "") +
            Object.entries(PEOPLE)
              .map(
                ([k, v]) =>
                  `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`,
              )
              .join("");
          const incoming = [...sched.deps[uid]].filter(p => p !== u.prev);
          const outgoing = UNITS.filter(
            x => sched.deps[x.uid].has(uid) && x.prev !== uid,
          ).map(x => x.uid);
          const candidates = UNITS.filter(
            x =>
              x.task !== u.task &&
              !sched.deps[uid].has(x.uid) &&
              !wouldCycle(sched.deps, x.uid, uid),
          );
          const ch = k => (ov[k] && ov[k][uid] !== undefined ? "changed" : "");
          const pch = k =>
            ov.people[uid] && ov.people[uid][k] !== undefined ? "changed" : "";
          popEl.innerHTML = `<button class="close" aria-label="Close" data-pa="close">×</button>
    <h4>${t.id} · ${STAGE[u.stage].label.split(" ")[0]} · ${u.name}</h4>
    <div class="sub">${t.title}${sc.locked ? " · edits create a new scenario" : " · editing " + sc.name}</div>
    <div class="grid">
      <label for="pStart">Start</label><input id="pStart" type="date" class="${ch("starts")}" value="${iso(s.start)}" min="${iso(T0)}" max="${iso(T1)}">
      <label for="pDur">Duration</label><input id="pDur" type="number" min="1" max="40" class="${ch("durs")}" value="${s.dur}">
      <label>Ends</label><span>${fmt(s.end)}${s.slip ? ` <span class="pill ${s.slip > 0 ? "warning" : "ok"}">${s.slip > 0 ? "+" : ""}${s.slip}d vs plan</span>` : ""}${s.pushedBy ? `<br><span class="changes">held by ${unitLabel(s.pushedBy)}</span>` : ""}</span>
      <label for="pWho">${u.review ? "Reviewer (works)" : "Assignee"}</label><select id="pWho" class="${pch("who")}">${opts(WHO(u))}</select>
      ${u.review ? "" : `<label for="pRev">Reviewer</label><select id="pRev" class="${pch("rev")}">${opts(REV(u), true)}</select>`}
      <label for="pStk">Update / ask</label><input id="pStk" class="${pch("stk")}" value="${STK(u).join(", ")}" placeholder="e.g. Lender, CFO">
      <label>Depends on</label><div class="deps">${u.prev ? `<div class="dep"><span>${unitLabel(u.prev)} <span class="changes">(previous step)</span></span></div>` : ""}${incoming.map(p => `<div class="dep"><span>${unitLabel(p)}</span><button data-pa="rm" data-from="${p}" title="Remove this link">×</button></div>`).join("")}
        <select id="pAdd"><option value="">+ add dependency…</option>${candidates.map(x => `<option value="${x.uid}">${unitLabel(x.uid)}</option>`).join("")}</select></div>
      <label>Blocks</label><div class="changes">${outgoing.map(unitLabel).join("<br>") || "—"}</div>
      <label for="pNote">Note</label><textarea id="pNote" placeholder="Why this changed; goes to the decision record on commit">${(ov.notes && ov.notes[uid]) || ""}</textarea>
    </div>
    ${s.risks.length ? `<div class="rk">${s.risks.map(r => `<div><span class="pill ${r.sev}">${r.sev}</span> ${r.msg}</div>`).join("")}</div>` : ""}
    <div class="foot"><button data-pa="reset" ${ch("starts") || ch("durs") || ov.people[uid] ? "" : "disabled"}>Reset step</button><span class="changes">Changes apply live to the scenario</span><button class="primary" data-pa="close">Done</button></div>`;
          const q = id => popEl.querySelector("#" + id);
          q("pStart").onchange = e => {
            if (!e.target.value) return;
            editOv(
              `${unitLabel(uid)} start → ${fmt(d(e.target.value))}`,
              o => (o.starts[uid] = e.target.value),
            );
          };
          q("pDur").onchange = e => {
            const v = Math.max(1, +e.target.value || 1);
            editOv(
              `${unitLabel(uid)} ${s.dur}d → ${v}d`,
              o => (o.durs[uid] = v),
            );
          };
          const setP = (k, v, label) =>
            editOv(label, o => {
              o.people[uid] = { ...(o.people[uid] || {}), [k]: v };
            });
          q("pWho").onchange = e =>
            setP(
              "who",
              e.target.value,
              `${unitLabel(uid)} ${u.review ? "reviewer" : "assignee"} → ${PEOPLE[e.target.value]}`,
            );
          if (q("pRev"))
            q("pRev").onchange = e =>
              setP(
                "rev",
                e.target.value || null,
                `${unitLabel(uid)} reviewer → ${PEOPLE[e.target.value] || "none"}`,
              );
          q("pStk").onchange = e =>
            setP(
              "stk",
              e.target.value
                .split(",")
                .map(x => x.trim())
                .filter(Boolean),
              `${unitLabel(uid)} stakeholders → ${e.target.value || "none"}`,
            );
          q("pAdd").onchange = e => {
            const from = e.target.value;
            if (!from) return;
            editOv(`link ${unitLabel(from)} → ${unitLabel(uid)} added`, o =>
              o.addLinks.push({ from, to: uid }),
            );
          };
          q("pNote").onchange = e => {
            const sc2 = ensureScenario();
            sc2.ov.notes[uid] = e.target.value;
            scheduleSave();
          };
          popEl.querySelectorAll("[data-pa]").forEach(
            btn =>
              (btn.onclick = () => {
                const a = btn.dataset.pa;
                if (a === "close") return closePop();
                if (a === "rm") {
                  const from = btn.dataset.from;
                  editOv(
                    `link ${unitLabel(from)} → ${unitLabel(uid)} removed`,
                    o => {
                      if (BASE_LINKS.some(l => l.from === from && l.to === uid))
                        o.rmLinks.push({ from, to: uid });
                      o.addLinks = o.addLinks.filter(
                        l => !(l.from === from && l.to === uid),
                      );
                    },
                  );
                }
                if (a === "reset")
                  editOv(`${unitLabel(uid)} reset`, o => {
                    delete o.starts[uid];
                    delete o.durs[uid];
                    delete o.people[uid];
                  });
              }),
          );
        }
        document.addEventListener("pointerdown", e => {
          if (
            !popEl.hidden &&
            !popEl.contains(e.target) &&
            !e.target.closest("[data-bar]")
          )
            closePop();
        });
        document.addEventListener("keydown", e => {
          if (e.key === "Escape" && !popEl.hidden) return closePop();
          if (
            (e.metaKey || e.ctrlKey) &&
            e.key.toLowerCase() === "z" &&
            !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
          ) {
            e.preventDefault();
            undo();
          }
        });

        /* ---------- undo ---------- */
        function undo() {
          const sc = activeScenario();
          if (sc.locked || !sc.history.length) return toast("Nothing to undo.");
          const last = sc.history.pop();
          sc.ov = sc.history.length
            ? clone(sc.history[sc.history.length - 1])
            : emptyOv();
          render();
          fillPop();
          toast(`Undid: ${last.changes[last.changes.length - 1] || "change"}`);
        }
        document.getElementById("undoBtn").onclick = undo;

        /* ---------- zoom ---------- */
        function setZoom(nw, anchorClientX) {
          nw = Math.max(4, Math.min(40, nw));
          if (nw === DW) return;
          const r = wrap.getBoundingClientRect();
          const ax = anchorClientX ?? r.left + r.width / 2;
          const dayAt = (wrap.scrollLeft + ax - r.left - LABEL_W) / DW;
          DW = nw;
          render();
          wrap.scrollLeft = Math.max(0, dayAt * DW + LABEL_W - (ax - r.left));
          document.getElementById("zoomLbl").textContent =
            Math.round((DW / 12) * 100) + "%";
        }
        document.getElementById("zoomIn").onclick = () =>
          setZoom(Math.round(DW * 1.25));
        document.getElementById("zoomOut").onclick = () =>
          setZoom(Math.round(DW / 1.25));
        document.getElementById("zoomFit").onclick = () => {
          setZoom(Math.floor((wrap.clientWidth - LABEL_W - 24) / DAYS));
          wrap.scrollLeft = 0;
        };
        document.getElementById("zoomToday").onclick = () => {
          if (state.view !== "flat") return;
          wrap.scrollLeft = Math.max(
            0,
            X(d(state.asOf)) - wrap.clientWidth / 3,
          );
        };
        wrap.addEventListener(
          "wheel",
          e => {
            if (state.view !== "flat" || !(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            setZoom(
              Math.round(DW * (e.deltaY < 0 ? 1.15 : 1 / 1.15)) ||
                DW + (e.deltaY < 0 ? 1 : -1),
              e.clientX,
            );
          },
          { passive: false },
        );

        /* ---------- persistence (this browser only) ---------- */
        const STORE_KEY = "databonder-roadmap-sim-shared-v1";
        let saveTm = null;
        function scheduleSave() {
          clearTimeout(saveTm);
          saveTm = setTimeout(saveNow, 250);
        }
        function saveNow() {
          try {
            const data = {
              v: 1,
              scenarios: state.scenarios,
              active: state.active,
              view: state.view,
              asOf: state.asOf,
              lanesBy: state.lanesBy,
              expanded: [...state.expanded],
              decisions: state.decisions,
              seq,
              DW,
              cam: { yaw: cam.yaw, pitch: cam.pitch },
              base: {
                tasks: TASKS.map(t => ({
                  id: t.id,
                  title: t.title,
                  start: t.start,
                  gates: t.gates,
                  path: t.path,
                })),
                links: BASE_LINKS,
                sprints: BASE_SPRINTS,
                people: BASE_PEOPLE,
                starts: BASE_STARTS,
              },
            };
            localStorage.setItem(STORE_KEY, JSON.stringify(data));
            const l = document.getElementById("savedLbl");
            if (l)
              l.textContent =
                "Saved in this browser · " +
                new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
          } catch (e) {
            const l = document.getElementById("savedLbl");
            if (l) l.textContent = "Not saved (browser storage unavailable)";
          }
        }
        function loadSaved() {
          let data = null;
          try {
            data = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
          } catch (e) {
            return;
          }
          if (!data || data.v !== 1) return;
          try {
            TASKS = data.base.tasks;
            BASE_LINKS = data.base.links;
            BASE_SPRINTS.splice(0, BASE_SPRINTS.length, ...data.base.sprints);
            BASE_PEOPLE = data.base.people || {};
            BASE_STARTS = data.base.starts || {};
            buildUnits();
            state.scenarios = data.scenarios.map(sc => ({
              ...sc,
              ov: { ...emptyOv(), ...sc.ov },
            }));
            state.active = data.active;
            state.view = data.view || "flat";
            state.asOf = data.asOf || state.asOf;
            state.lanesBy = data.lanesBy || "person";
            state.expanded = new Set(data.expanded || []);
            state.decisions = data.decisions || [];
            seq = data.seq || 0;
            DW = data.DW || 12;
            if (data.cam) {
              cam.yaw = data.cam.yaw;
              cam.pitch = data.cam.pitch;
            }
            if (!state.scenarios.some(s => s.id === state.active))
              state.active = "base";
            document
              .querySelectorAll("[data-view]")
              .forEach(x =>
                x.setAttribute("aria-selected", x.dataset.view === state.view),
              );
            document.getElementById("zoomLbl").textContent =
              Math.round((DW / 12) * 100) + "%";
          } catch (e) {
            console.warn("Saved prototype data ignored", e);
          }
        }
        document.getElementById("resetData").onclick = () => {
          try {
            localStorage.removeItem(STORE_KEY);
          } catch (e) {}
          location.reload();
        };

        let toastTm;
        function toast(msg) {
          const el = document.getElementById("toast");
          el.textContent = msg;
          el.classList.add("show");
          clearTimeout(toastTm);
          toastTm = setTimeout(() => el.classList.remove("show"), 3600);
        }
        loadSaved();
        window.proto = {
          state,
          TASKS,
          UNITS,
          UNIT,
          compute,
          render,
          refresh,
          newScenario,
          ensureScenario,
          snapshot,
          schedFor,
          activeOv,
          d,
          iso,
          addDays,
        };
        render();
      })();
