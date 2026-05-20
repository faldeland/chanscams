/**
 * Per-item rental calendar (modal).
 *
 * Usage:
 *   ChanCalendar.open(item, { onAdd: ({start, end, total}) => {} });
 *
 * - Two months side-by-side on desktop, one month on mobile.
 * - Click a date to set the pickup, click again to set return.
 * - Booked + blackout days are shown but not selectable.
 * - Each day shows a tiny badge with the active discount/surcharge.
 * - A live per-day price breakdown updates as you select.
 */

(function (global) {
  "use strict";

  const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const fmtMoney = (n) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    });
  const fmtDate = (d) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  let currentItem = null;
  let viewMonth = null;       // first-of-month Date
  let startSel = null;        // Date or null
  let endSel = null;          // Date or null
  let hoverDate = null;
  let onAddCallback = null;
  let unsubscribe = null;
  // Day-cell registry keyed by ISO date. Rebuilt by render(); hover updates
  // mutate these cells in place so the DOM stays stable during selection.
  const cellsByISO = new Map();

  /* ---------- DOM refs (looked up on open) ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  function ensureMarkup() {
    if (document.getElementById("calendarModal")) return;
    const overlay = document.createElement("div");
    overlay.id = "calendarModal";
    overlay.className = "modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="modal__backdrop" data-close></div>
      <div class="modal__panel modal__panel--calendar" role="document">
        <header class="modal__head">
          <div class="cal-item">
            <div class="cal-item__thumb" id="calItemThumb" hidden></div>
            <div class="cal-item__meta">
              <span class="eyebrow" id="calItemMount"></span>
              <h3 id="calItemName"></h3>
              <p class="muted small" id="calItemRate"></p>
            </div>
          </div>
          <button class="icon-btn" data-close aria-label="Close availability">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div class="cal-toolbar">
          <button class="cal-nav" id="calPrev" aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="cal-toolbar__range" id="calToolbarRange"></span>
          <button class="cal-nav" id="calNext" aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button class="cal-clear" id="calClear">Clear selection</button>
        </div>

        <div class="cal-grids" id="calGrids" role="grid"></div>

        <div class="cal-legend">
          <span><i class="dot dot--avail"></i> Available</span>
          <span><i class="dot dot--booked"></i> Booked</span>
          <span><i class="dot dot--blackout"></i> Maintenance</span>
          <span><i class="dot dot--discount"></i> Discount</span>
          <span><i class="dot dot--surcharge"></i> Surcharge</span>
        </div>

        <div class="cal-summary" id="calSummary">
          <p class="muted small">Pick a pickup date to start.</p>
        </div>

        <footer class="modal__foot">
          <div class="cal-total">
            <span class="muted small">Estimated total</span>
            <strong id="calTotal">—</strong>
          </div>
          <button class="btn btn--primary" id="calAdd" disabled>Add booking to cart</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
    $("#calPrev", overlay).addEventListener("click", () => stepMonth(-1));
    $("#calNext", overlay).addEventListener("click", () => stepMonth(1));
    $("#calClear", overlay).addEventListener("click", () => {
      startSel = endSel = null;
      render();
    });
    $("#calAdd", overlay).addEventListener("click", () => {
      if (!startSel || !endSel || !onAddCallback) return;
      const result = Engine.pricing.calculateRental(currentItem, startSel, endSel);
      if (!result) return;
      onAddCallback({
        item: currentItem,
        start: Engine.util.toISO(startSel),
        end:   Engine.util.toISO(endSel),
        days:  result.length,
        total: result.total,
        breakdown: result,
      });
      close();
    });
  }

  function stepMonth(delta) {
    const next = new Date(viewMonth);
    next.setMonth(next.getMonth() + delta);
    viewMonth = next;
    render();
  }

  function open(item, opts = {}) {
    ensureMarkup();
    currentItem = item;
    onAddCallback = opts.onAdd || null;

    const today = Engine.util.startOfDay(new Date());
    viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startSel = opts.start ? Engine.util.fromISO(opts.start) : null;
    endSel   = opts.end   ? Engine.util.fromISO(opts.end)   : null;
    hoverDate = null;

    if (unsubscribe) unsubscribe();
    unsubscribe = Engine.state.subscribe(() => render());

    const modal = document.getElementById("calendarModal");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";

    render();
  }

  function close() {
    const modal = document.getElementById("calendarModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    currentItem = null;
    onAddCallback = null;
  }

  /* ---------- Rendering ---------- */
  function render() {
    if (!currentItem) return;
    const modal = document.getElementById("calendarModal");
    $("#calItemMount", modal).textContent =
      `${currentItem.category.toUpperCase()}${currentItem.mount ? " · " + currentItem.mount : ""}`;
    $("#calItemName", modal).textContent = currentItem.name;
    $("#calItemRate", modal).textContent =
      `Base rate ${fmtMoney(currentItem.daily)} / day · retail ${fmtMoney(currentItem.retail)}`;

    const thumb = $("#calItemThumb", modal);
    if (currentItem.image) {
      thumb.hidden = false;
      thumb.innerHTML = `<img src="${currentItem.image}" alt="${currentItem.name}"
        onerror="this.parentNode.hidden = true" />`;
    } else {
      thumb.hidden = true;
      thumb.innerHTML = "";
    }

    // Header range label
    const left = new Date(viewMonth);
    const right = new Date(viewMonth);
    right.setMonth(right.getMonth() + 1);
    $("#calToolbarRange", modal).textContent =
      `${MONTH_NAMES[left.getMonth()]} ${left.getFullYear()} – ${MONTH_NAMES[right.getMonth()]} ${right.getFullYear()}`;

    // Two months side-by-side (CSS will collapse to one on mobile via media query)
    const grids = $("#calGrids", modal);
    grids.innerHTML = "";
    cellsByISO.clear();
    grids.appendChild(renderMonth(left));
    grids.appendChild(renderMonth(right));

    renderSummary();
  }

  function renderMonth(monthStart) {
    const wrap = document.createElement("div");
    wrap.className = "cal-month";
    const monthLabel = document.createElement("div");
    monthLabel.className = "cal-month__head";
    monthLabel.textContent = `${MONTH_NAMES[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
    wrap.appendChild(monthLabel);

    const dow = document.createElement("div");
    dow.className = "cal-month__dow";
    WEEKDAY_SHORT.forEach((w) => {
      const c = document.createElement("span");
      c.textContent = w;
      dow.appendChild(c);
    });
    wrap.appendChild(dow);

    const grid = document.createElement("div");
    grid.className = "cal-month__grid";

    const firstWeekday = monthStart.getDay();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const today = Engine.util.startOfDay(new Date());

    // Pad leading blanks
    for (let i = 0; i < firstWeekday; i++) {
      const blank = document.createElement("span");
      blank.className = "cal-day cal-day--pad";
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      const unavailable = Engine.availability.isItemUnavailableOn(currentItem.id, date);
      const isPast = date < today;
      const rule = Engine.pricing.dailyRuleFor(currentItem, date);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      cell.setAttribute("role", "gridcell");

      if (isPast) cell.classList.add("is-past");
      if (unavailable) {
        cell.classList.add(unavailable.reason === "booked" ? "is-booked" : "is-blackout");
        cell.title = unavailable.reason === "booked" ? "Already booked" : "Maintenance / blackout";
      } else if (rule) {
        const pct = rule.discountPercent || 0;
        cell.classList.add(pct >= 0 ? "is-discount" : "is-surcharge");
        cell.title = `${rule.name}: ${pct >= 0 ? "-" : "+"}${Math.abs(pct)}%`;
      }

      const inner = document.createElement("span");
      inner.className = "cal-day__num";
      inner.textContent = d;
      cell.appendChild(inner);

      if (!unavailable && rule) {
        const badge = document.createElement("span");
        badge.className = "cal-day__badge";
        const pct = rule.discountPercent || 0;
        badge.textContent = `${pct >= 0 ? "−" : "+"}${Math.abs(pct)}%`;
        badge.style.background = rule.color || "var(--accent)";
        cell.appendChild(badge);
      }

      const disabled = isPast || !!unavailable;
      cell.disabled = disabled;
      cellsByISO.set(Engine.util.toISO(date), cell);
      if (!disabled) {
        cell.addEventListener("click", () => handleSelect(date));
        cell.addEventListener("mouseenter", () => {
          if (!startSel || endSel) return;
          if (hoverDate && hoverDate.getTime() === date.getTime()) return;
          hoverDate = date;
          updateSelectionClasses();
        });
      }

      grid.appendChild(cell);
    }

    // Apply current selection/range highlight to the just-built cells.
    updateSelectionClasses();

    wrap.appendChild(grid);
    return wrap;
  }

  function effectiveRange() {
    if (startSel && endSel) {
      return startSel <= endSel
        ? { start: startSel, end: endSel }
        : { start: endSel, end: startSel };
    }
    if (startSel && hoverDate && !endSel) {
      return startSel <= hoverDate
        ? { start: startSel, end: hoverDate }
        : { start: hoverDate, end: startSel };
    }
    if (startSel) return { start: startSel, end: startSel };
    return null;
  }

  /**
   * Mutate only the selection-state classes on existing cells. Called both
   * from render() (after cells are rebuilt) and from hover events (without
   * rebuilding the DOM, so clicks aren't interrupted mid-press).
   */
  function updateSelectionClasses() {
    const range = effectiveRange();
    const s = range ? range.start.getTime() : null;
    const e = range ? range.end.getTime()   : null;
    cellsByISO.forEach((cell, iso) => {
      cell.classList.remove("is-start", "is-end", "is-selected", "is-in-range");
      if (!range) return;
      const t = Engine.util.fromISO(iso).getTime();
      if (t === s && t === e) cell.classList.add("is-start", "is-end", "is-selected");
      else if (t === s) cell.classList.add("is-start", "is-selected");
      else if (t === e) cell.classList.add("is-end", "is-selected");
      else if (t > s && t < e) cell.classList.add("is-in-range");
    });
  }

  function handleSelect(date) {
    // First click → set start.
    // Click before start → reset start.
    // Click after start with no end → set end (if no conflicts).
    // Click after both selected → restart selection.
    if (!startSel || (startSel && endSel)) {
      startSel = date;
      endSel = null;
      hoverDate = null;
    } else {
      // We have a start, no end yet.
      if (date < startSel) {
        startSel = date;
        endSel = null;
        hoverDate = null;
      } else {
        // Block if range overlaps a booking/blackout.
        const conflict = Engine.availability.hasConflict(currentItem.id, startSel, date);
        if (conflict) {
          startSel = date;
          endSel = null;
          hoverDate = null;
          flashMessage(conflict === "booked"
            ? "Dates collide with an existing booking."
            : "Dates fall during scheduled maintenance.");
          render();
          return;
        }
        endSel = date;
      }
    }
    render();
  }

  function flashMessage(msg) {
    const summary = document.getElementById("calSummary");
    if (!summary) return;
    summary.classList.add("is-warning");
    summary.innerHTML = `<p class="cal-warn">${msg}</p>`;
    setTimeout(() => summary.classList.remove("is-warning"), 1500);
  }

  function renderSummary() {
    const summary = document.getElementById("calSummary");
    const total = document.getElementById("calTotal");
    const addBtn = document.getElementById("calAdd");

    if (!startSel) {
      summary.innerHTML = `<p class="muted small">Pick a pickup date to start.</p>`;
      total.textContent = "—";
      addBtn.disabled = true;
      return;
    }
    if (!endSel) {
      summary.innerHTML = `
        <p><strong>Pickup:</strong> ${fmtDate(startSel)}
        <span class="muted">· now pick a return date</span></p>
      `;
      total.textContent = "—";
      addBtn.disabled = true;
      return;
    }

    const result = Engine.pricing.calculateRental(currentItem, startSel, endSel);
    if (!result) {
      addBtn.disabled = true;
      return;
    }

    const rows = result.days.map((d) => {
      const label = d.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const ruleTag = d.rule
        ? `<span class="cal-row__rule" style="--c:${d.rule.color || 'var(--accent)'}">${d.rule.name} ${d.rule.discountPercent >= 0 ? "−" : "+"}${Math.abs(d.rule.discountPercent)}%</span>`
        : "";
      return `
        <tr>
          <td>${label}</td>
          <td class="num">${d.rule ? `<s>${fmtMoney(d.base)}</s>` : ""}<strong>${fmtMoney(d.rate)}</strong></td>
          <td>${ruleTag}</td>
        </tr>
      `;
    }).join("");

    summary.innerHTML = `
      <div class="cal-summary__head">
        <div>
          <span class="muted small">${result.length} day${result.length === 1 ? "" : "s"}</span>
          <strong>${fmtDate(startSel)} → ${fmtDate(endSel)}</strong>
        </div>
        <div class="cal-summary__totals">
          <span class="muted small">Subtotal ${fmtMoney(result.dailySubtotal)}</span>
          ${result.lengthRule ? `<span class="muted small">${result.lengthRule.name} −${fmtMoney(result.lengthDiscount)}</span>` : ""}
          <strong>${fmtMoney(result.total)}</strong>
        </div>
      </div>
      <div class="cal-breakdown">
        <table>
          <thead><tr><th>Day</th><th class="num">Rate</th><th>Rule</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    total.textContent = fmtMoney(result.total);
    addBtn.disabled = false;
  }

  global.ChanCalendar = { open, close };
})(window);
