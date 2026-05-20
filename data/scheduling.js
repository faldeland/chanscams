/**
 * Seed data for scheduling: default discount rules and example bookings.
 *
 * On first load the engine copies these into localStorage; from then on the
 * admin panel reads/writes localStorage. To reset to defaults, clear the
 * keys "chancams.bookings.v1", "chancams.rules.v1", "chancams.blackouts.v1".
 */

const DEFAULT_DISCOUNT_RULES = [
  {
    id: "rule-weekday-deal",
    name: "Mon–Thu Weekday Deal",
    type: "dayOfWeek",
    days: [1, 2, 3, 4], // Mon, Tue, Wed, Thu
    discountPercent: 10,
    appliesTo: "all",
    active: true,
    priority: 10,
    color: "#5eb6ff",
  },
  {
    id: "rule-weekend-premium",
    name: "Weekend Cinema Special",
    type: "dayOfWeek",
    days: [5, 6, 0], // Fri, Sat, Sun
    discountPercent: 15,
    appliesTo: "all",
    active: true,
    priority: 20,
    color: "#f4b740",
  },
  {
    id: "rule-off-season",
    name: "Off-Season Q1 Rate",
    type: "dateRange",
    start: "2026-01-08",
    end: "2026-02-28",
    discountPercent: 25,
    appliesTo: "all",
    active: true,
    priority: 40,
    color: "#7be3a1",
  },
  {
    id: "rule-holiday-surcharge",
    name: "Holiday Premium",
    type: "specificDates",
    dates: ["2026-12-24", "2026-12-25", "2026-12-31", "2026-01-01"],
    discountPercent: -25, // negative = surcharge
    appliesTo: "all",
    active: true,
    priority: 100,
    color: "#ff7a7a",
  },
  {
    id: "rule-length-week",
    name: "5+ Day Long Rental",
    type: "length",
    minDays: 5,
    // "weeklyMultiplier" semantics: 5 days bills as 4 days per item, so 20% off
    // when triggered. The engine applies this on top of per-day rules.
    discountPercent: 20,
    appliesTo: "all",
    active: true,
    priority: 1,
    color: "#a89cf0",
    builtIn: true, // mirrors the weeklyMultiplier on each item
  },
];

const DEFAULT_BOOKINGS = [
  {
    id: "bk-demo-1",
    itemId: "pyxis-12k",
    start: "2026-06-02",
    end: "2026-06-06",
    customer: "Northwind Productions",
    status: "confirmed",
    notes: "Doc shoot · 4-camera multicam",
  },
  {
    id: "bk-demo-2",
    itemId: "dzo-arles-prime-set",
    start: "2026-06-04",
    end: "2026-06-08",
    customer: "Hollow Pine Films",
    status: "confirmed",
    notes: "Narrative short",
  },
  {
    id: "bk-demo-3",
    itemId: "portkeys-lh7p",
    start: "2026-05-29",
    end: "2026-05-31",
    customer: "Cobalt Studio",
    status: "pending",
  },
];

const DEFAULT_BLACKOUTS = [
  {
    id: "bl-demo-1",
    itemId: "pyxis-12k",
    start: "2026-07-04",
    end: "2026-07-05",
    reason: "Sensor calibration & firmware update",
  },
];
