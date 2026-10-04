# Career tracker

## Dashboard image-to-code refinement

The generated desktop reference informed a 1.6:1 two-column overview: activity and
recent applications on the left, next actions and strong-fit statistics on the right.
Current-stage counts now form a compact horizontal strip below the six metrics.
Use open metric cells, individual flat section frames, 16px gutters and 20px section
insets. Headings are 17px semibold, dashboard values 30px, and row labels 12–13px.
Typography uses locally served Inter (400/500/600/700, SIL Open Font License),
with tabular numerals for scores and statistics and system-font fallbacks.

The reference's example values, shortened company names, daily-average denominator
and decorative color differences are not data specifications. Render original data
and preserve existing metric definitions and meaningful stage colors.
The chart shows real daily counts with a minimum axis ceiling of two, retaining
date/count accessible descriptions. Responsive layouts stack sections and retain
the existing edit dialogs, navigation, imports, exports and data model.

Primary reference: [Linear DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md).

This is a frequently used personal workspace, with an approved emphasis on clarity,
density and speed. Adapt the reference's restrained dark surfaces, hairline separators
and compact navigation. Use native Apple/system typography and blue actions.
Avoid marketing sections, gradients, oversized cards and decorative motion.

## Audit and decisions

- Large summary cards and the chart delayed access to applications. Put six compact
  metrics in Overview, with follow-ups, activity, stage counts and recent applications.
- Full histories in pipeline cards obscured comparison. Group compact rows by current
  stage and show stage progress, latest event and next action.
- The application form was the only detail view. Open a right-side summary with
  chronological history and notes, then enter the preserved editor explicitly.
- Search omitted events and actions. Search those fields too, and provide filter reset.
- Separate application dates, event dates and follow-up deadlines; do not imply that
  an event date is a next-action deadline.
- Display scores >=4 as Good, >=4.5 as Exceptional, 3–<4 as Okay, <3 as Low.
  Existing internal band names and numeric scores remain unchanged.

## Tokens and responsive behavior

- Canvas #101113; surface #151618; elevated #191b1e; separator #26292e.
- System font stack, 14px body, 12–13px application rows, 28px page title.
- 210px sidebar, compact 38px navigation, 32px content inset.
- Desktop summary metrics are one strip; smaller widths reflow to three or two columns.
- Below 700px navigation becomes horizontal and the detail panel uses the full viewport.
- Tables scroll inside their container. Keep focus indicators, labeled controls,
  Radix dialog focus management, and existing light-mode support.

## Data boundary

Only frontend presentation changes. Do not change lib/model.ts, lib/seed.ts, API routes,
database schema, migrations, import/export formats or live saved applications.
Opening, filtering and inspecting an application never persist changes. Existing
save/import/delete controls remain explicit user actions.
