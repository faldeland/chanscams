/**
 * Scheduling + pricing engine.
 *
 * Exposes a global `Engine` namespace consumed by calendar.js, admin.js, and
 * the main script.js. State lives in localStorage so the admin panel can
 * mutate it without a backend; swap the load/save functions for fetch() when
 * you wire a real API.
 *
 * Depends on:
 *   - data/equipment.js   (EQUIPMENT, CATEGORIES)
 *   - data/scheduling.js  (DEFAULT_DISCOUNT_RULES, DEFAULT_BOOKINGS, DEFAULT_BLACKOUTS)
 */

(function (global) {
  "use strict";

  const KEYS = {
    bookings:  "chancams.bookings.v1",
    rules:     "chancams.rules.v1",
    blackouts: "chancams.blackouts.v1",
  };

  /* ---------- localStorage helpers ---------- */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  /* ---------- Seed defaults on first run ---------- */
  if (!localStorage.getItem(KEYS.bookings))  save(KEYS.bookings,  DEFAULT_BOOKINGS);
  if (!localStorage.getItem(KEYS.rules))     save(KEYS.rules,     DEFAULT_DISCOUNT_RULES);
  if (!localStorage.getItem(KEYS.blackouts)) save(KEYS.blackouts, DEFAULT_BLACKOUTS);

  /* ---------- State accessors ---------- */
  const listeners = new Set();
  function notify() { listeners.forEach((fn) => fn()); }

  const state = {
    getBookings:  () => load(KEYS.bookings,  []),
    getRules:     () => load(KEYS.rules,     []),
    getBlackouts: () => load(KEYS.blackouts, []),
    setBookings:  (v) => { save(KEYS.bookings,  v); notify(); },
    setRules:     (v) => { save(KEYS.rules,     v); notify(); },
    setBlackouts: (v) => { save(KEYS.blackouts, v); notify(); },
    subscribe:    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    resetAll: () => {
      save(KEYS.bookings,  DEFAULT_BOOKINGS);
      save(KEYS.rules,     DEFAULT_DISCOUNT_RULES);
      save(KEYS.blackouts, DEFAULT_BLACKOUTS);
      notify();
    },
  };

  /* ---------- Date helpers (work in local time, midnight-aligned) ---------- */
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function toISO(d) {
    const x = startOfDay(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function fromISO(s) {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(d, n) {
    const x = startOfDay(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function daysBetween(a, b) {
    const ms = startOfDay(b) - startOfDay(a);
    return Math.round(ms / 86400000) + 1; // inclusive
  }
  function rangeIncludes(rangeStart, rangeEnd, date) {
    const t = startOfDay(date).getTime();
    return t >= startOfDay(rangeStart).getTime() &&
           t <= startOfDay(rangeEnd).getTime();
  }
  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return startOfDay(aStart) <= startOfDay(bEnd) &&
           startOfDay(aEnd)   >= startOfDay(bStart);
  }

  /* ---------- Availability ---------- */
  function isItemUnavailableOn(itemId, date) {
    const iso = toISO(date);
    const blockedByBooking = state.getBookings().some((b) =>
      b.itemId === itemId &&
      b.status !== "cancelled" &&
      iso >= b.start && iso <= b.end
    );
    if (blockedByBooking) return { reason: "booked" };
    const blockedByBlackout = state.getBlackouts().some((b) =>
      b.itemId === itemId &&
      iso >= b.start && iso <= b.end
    );
    if (blockedByBlackout) return { reason: "blackout" };
    return null;
  }

  function hasConflict(itemId, start, end, ignoreBookingId) {
    const s = startOfDay(start), e = startOfDay(end);
    const booked = state.getBookings().some((b) =>
      b.id !== ignoreBookingId &&
      b.itemId === itemId &&
      b.status !== "cancelled" &&
      rangesOverlap(s, e, fromISO(b.start), fromISO(b.end))
    );
    if (booked) return "booked";
    const blocked = state.getBlackouts().some((b) =>
      b.itemId === itemId &&
      rangesOverlap(s, e, fromISO(b.start), fromISO(b.end))
    );
    if (blocked) return "blackout";
    return null;
  }

  /* ---------- Rule matching ---------- */
  function ruleAppliesToItem(rule, item) {
    if (!rule.appliesTo || rule.appliesTo === "all") return true;
    if (Array.isArray(rule.appliesTo)) return rule.appliesTo.includes(item.id);
    if (typeof rule.appliesTo === "string") {
      if (rule.appliesTo.startsWith("category:")) {
        return item.category === rule.appliesTo.slice("category:".length);
      }
      return rule.appliesTo === item.id || rule.appliesTo === item.category;
    }
    return false;
  }

  function ruleMatchesDate(rule, date) {
    switch (rule.type) {
      case "dayOfWeek":
        return Array.isArray(rule.days) && rule.days.includes(date.getDay());
      case "dateRange":
        return toISO(date) >= rule.start && toISO(date) <= rule.end;
      case "specificDates":
        return Array.isArray(rule.dates) && rule.dates.includes(toISO(date));
      default:
        return false; // "length" handled separately
    }
  }

  /** Highest-priority per-day rule for (item, date). */
  function dailyRuleFor(item, date, allRules = state.getRules()) {
    const candidates = allRules
      .filter((r) => r.active && r.type !== "length" && ruleAppliesToItem(r, item) && ruleMatchesDate(r, date))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return candidates[0] || null;
  }

  function lengthRuleFor(item, days, allRules = state.getRules()) {
    return allRules
      .filter((r) =>
        r.active &&
        r.type === "length" &&
        ruleAppliesToItem(r, item) &&
        days >= (r.minDays || 1)
      )
      .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))[0] || null;
  }

  /* ---------- Pricing ---------- */
  /**
   * Calculate cost of renting `item` from `start` through `end` (inclusive).
   * Returns a detailed breakdown including a per-day table.
   *
   *  Pricing order:
   *   1. Each day starts at `item.daily`.
   *   2. The highest-priority matching per-day rule is applied (% off or surcharge).
   *   3. The sum is then reduced by the best matching length rule, if any.
   */
  function calculateRental(item, start, end, opts = {}) {
    const allRules = opts.rules || state.getRules();
    const s = startOfDay(start);
    const e = startOfDay(end);
    if (e < s) return null;

    const days = [];
    let cursor = new Date(s);
    while (cursor <= e) {
      const rule = dailyRuleFor(item, cursor, allRules);
      const base = item.daily;
      const pct = rule ? (rule.discountPercent || 0) : 0;
      const rate = Math.round(base * (1 - pct / 100) * 100) / 100;
      days.push({
        date: new Date(cursor),
        iso: toISO(cursor),
        weekday: cursor.getDay(),
        base,
        rate,
        rule,
      });
      cursor = addDays(cursor, 1);
    }

    const dailySubtotal = days.reduce((sum, d) => sum + d.rate, 0);
    const lengthRule = lengthRuleFor(item, days.length, allRules);
    let lengthDiscount = 0;
    if (lengthRule) {
      lengthDiscount = Math.round(dailySubtotal * (lengthRule.discountPercent / 100) * 100) / 100;
    }

    const total = Math.max(0, Math.round((dailySubtotal - lengthDiscount) * 100) / 100);
    const baselineNoRules = item.daily * days.length;

    return {
      item,
      days,
      length: days.length,
      dailySubtotal,
      lengthRule,
      lengthDiscount,
      total,
      baselineNoRules,
      savings: Math.round((baselineNoRules - total) * 100) / 100,
    };
  }

  /* ---------- Mutations (used by admin.js) ---------- */
  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const mutations = {
    upsertBooking(booking) {
      const list = state.getBookings();
      const i = list.findIndex((b) => b.id === booking.id);
      if (i >= 0) list[i] = { ...list[i], ...booking };
      else list.push({ ...booking, id: booking.id || uid("bk") });
      state.setBookings(list);
    },
    deleteBooking(id) {
      state.setBookings(state.getBookings().filter((b) => b.id !== id));
    },
    upsertBlackout(b) {
      const list = state.getBlackouts();
      const i = list.findIndex((x) => x.id === b.id);
      if (i >= 0) list[i] = { ...list[i], ...b };
      else list.push({ ...b, id: b.id || uid("bl") });
      state.setBlackouts(list);
    },
    deleteBlackout(id) {
      state.setBlackouts(state.getBlackouts().filter((b) => b.id !== id));
    },
    upsertRule(rule) {
      const list = state.getRules();
      const i = list.findIndex((r) => r.id === rule.id);
      if (i >= 0) list[i] = { ...list[i], ...rule };
      else list.push({ ...rule, id: rule.id || uid("rule") });
      state.setRules(list);
    },
    deleteRule(id) {
      state.setRules(state.getRules().filter((r) => r.id !== id));
    },
    toggleRule(id) {
      const list = state.getRules().map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      );
      state.setRules(list);
    },
  };

  /* ---------- Public API ---------- */
  global.Engine = {
    state,
    mutations,
    pricing: { calculateRental, dailyRuleFor, lengthRuleFor },
    availability: { isItemUnavailableOn, hasConflict },
    util: { startOfDay, toISO, fromISO, addDays, daysBetween, rangeIncludes, uid },
    keys: KEYS,
  };
})(window);
