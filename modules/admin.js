/**
 * Admin panel.
 *
 * Triggered by:
 *   - URL hash `#admin`
 *   - Footer "Admin" link
 *   - Ctrl/Cmd + Shift + A
 *
 * Tabs: Bookings · Discount Rules · Blackouts · Settings
 *
 * Persists via Engine.state.* (localStorage). Swap those calls for fetch()
 * to back this with a real API.
 */

(function (global) {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const fmtMoney = (n) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 });

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const TYPE_LABELS = {
    dayOfWeek:     "By weekday",
    dateRange:     "Date range",
    specificDates: "Specific dates",
    length:        "Rental length",
  };

  let activeTab = "bookings";
  let unsubscribe = null;

  /* ---------- Markup ---------- */
  function ensureMarkup() {
    if (document.getElementById("adminPanel")) return;

    const panel = document.createElement("div");
    panel.id = "adminPanel";
    panel.className = "admin";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <header class="admin__head">
        <div class="admin__brand">
          <span class="brand">
            <span class="brand__mark"><span class="brand__dot"></span></span>
            <span class="brand__text">CHAN<span class="brand__accent">CAMS</span></span>
          </span>
          <span class="admin__tag">Admin</span>
        </div>
        <nav class="admin__tabs" role="tablist">
          <button data-tab="bookings"  class="admin__tab is-active" role="tab">Bookings</button>
          <button data-tab="rules"     class="admin__tab" role="tab">Discount Rules</button>
          <button data-tab="blackouts" class="admin__tab" role="tab">Blackouts</button>
          <button data-tab="settings"  class="admin__tab" role="tab">Settings</button>
        </nav>
        <div class="admin__actions">
          <a href="#top" class="btn btn--ghost btn--sm" id="adminExit">Exit admin</a>
        </div>
      </header>
      <main class="admin__body" id="adminBody"></main>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        panel.querySelectorAll(".admin__tab").forEach((t) =>
          t.classList.toggle("is-active", t.dataset.tab === activeTab)
        );
        render();
      });
    });
    $("#adminExit", panel).addEventListener("click", (e) => {
      e.preventDefault();
      close();
    });
  }

  /* ---------- Open / close ---------- */
  function open() {
    ensureMarkup();
    document.body.classList.add("admin-open");
    const panel = document.getElementById("adminPanel");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    if (unsubscribe) unsubscribe();
    unsubscribe = Engine.state.subscribe(() => render());
    render();
  }
  function close() {
    const panel = document.getElementById("adminPanel");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("admin-open");
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (location.hash === "#admin") history.replaceState(null, "", location.pathname);
  }

  /* ---------- Rendering ---------- */
  function render() {
    const body = document.getElementById("adminBody");
    if (!body) return;
    if (activeTab === "bookings")  body.innerHTML = renderBookings();
    if (activeTab === "rules")     body.innerHTML = renderRules();
    if (activeTab === "blackouts") body.innerHTML = renderBlackouts();
    if (activeTab === "settings")  body.innerHTML = renderSettings();
    wireEvents(body);
  }

  function itemOptions(selectedId) {
    return EQUIPMENT
      .map((i) => `<option value="${i.id}" ${i.id === selectedId ? "selected" : ""}>${i.name}</option>`)
      .join("");
  }

  /* ---------- Bookings tab ---------- */
  function renderBookings() {
    const bookings = Engine.state.getBookings()
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));

    const rows = bookings.length === 0
      ? `<tr><td colspan="6" class="admin__empty">No bookings yet.</td></tr>`
      : bookings.map((b) => {
          const item = EQUIPMENT.find((i) => i.id === b.itemId);
          const days = Engine.util.daysBetween(Engine.util.fromISO(b.start), Engine.util.fromISO(b.end));
          return `
            <tr>
              <td>
                <strong>${item ? item.name : b.itemId}</strong>
                ${b.notes ? `<div class="muted small">${escapeHtml(b.notes)}</div>` : ""}
              </td>
              <td>${b.customer || "—"}</td>
              <td>${b.start} → ${b.end} <span class="muted small">(${days}d)</span></td>
              <td><span class="status-pill status-pill--${b.status}">${b.status}</span></td>
              <td>
                <button class="btn btn--ghost btn--sm" data-edit-booking="${b.id}">Edit</button>
                <button class="icon-btn icon-btn--danger" data-delete-booking="${b.id}" aria-label="Delete booking">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </td>
            </tr>
          `;
        }).join("");

    return `
      <section class="admin__section">
        <div class="admin__sectionHead">
          <div>
            <h2>Bookings <span class="muted">(${bookings.length})</span></h2>
            <p class="muted">Customer rentals occupying inventory. Cancelled bookings free up calendar days.</p>
          </div>
          <button class="btn btn--primary" id="newBooking">+ New booking</button>
        </div>
        <div class="admin__tableWrap">
          <table class="admin__table">
            <thead><tr><th>Item</th><th>Customer</th><th>Dates</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="admin__formCard" id="bookingForm" hidden>
          <h3 id="bookingFormTitle">New booking</h3>
          <form data-form="booking">
            <input type="hidden" name="id" />
            <div class="admin__row">
              <label>Item
                <select name="itemId" required>${itemOptions()}</select>
              </label>
              <label>Status
                <select name="status">
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <div class="admin__row">
              <label>Pickup<input type="date" name="start" required /></label>
              <label>Return<input type="date" name="end" required /></label>
            </div>
            <div class="admin__row">
              <label>Customer<input type="text" name="customer" placeholder="Studio / production name" /></label>
              <label>Notes<input type="text" name="notes" placeholder="Optional internal notes" /></label>
            </div>
            <div class="admin__formActions">
              <button type="button" class="btn btn--ghost btn--sm" data-cancel-form>Cancel</button>
              <button type="submit" class="btn btn--primary btn--sm">Save booking</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  /* ---------- Discount Rules tab ---------- */
  function renderRules() {
    const rules = Engine.state.getRules();

    const rows = rules.length === 0
      ? `<tr><td colspan="6" class="admin__empty">No rules yet.</td></tr>`
      : rules.map((r) => {
          const target = r.appliesTo === "all" || !r.appliesTo
            ? "All items"
            : Array.isArray(r.appliesTo)
              ? `${r.appliesTo.length} items`
              : (r.appliesTo.startsWith("category:")
                  ? `Category: ${r.appliesTo.slice("category:".length)}`
                  : r.appliesTo);

          const detail = r.type === "dayOfWeek"
            ? (r.days || []).map((d) => DOW_LABELS[d]).join(", ")
            : r.type === "dateRange"
              ? `${r.start} → ${r.end}`
              : r.type === "specificDates"
                ? (r.dates || []).join(", ")
                : `${r.minDays}+ days`;

          const pct = r.discountPercent || 0;
          const pctLabel = pct >= 0 ? `${pct}% off` : `${Math.abs(pct)}% surcharge`;

          return `
            <tr ${r.active ? "" : 'class="is-inactive"'}>
              <td>
                <strong>${escapeHtml(r.name)}</strong>
                <div class="muted small">${TYPE_LABELS[r.type] || r.type}: ${escapeHtml(detail)}</div>
              </td>
              <td><span class="pct-pill ${pct >= 0 ? "pct--off" : "pct--up"}">${pctLabel}</span></td>
              <td>${target}</td>
              <td><span class="muted">P${r.priority || 0}</span></td>
              <td>
                <label class="switch">
                  <input type="checkbox" data-toggle-rule="${r.id}" ${r.active ? "checked" : ""} />
                  <span class="switch__track"></span>
                </label>
              </td>
              <td>
                <button class="btn btn--ghost btn--sm" data-edit-rule="${r.id}">Edit</button>
                <button class="icon-btn icon-btn--danger" data-delete-rule="${r.id}" aria-label="Delete rule">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path></svg>
                </button>
              </td>
            </tr>
          `;
        }).join("");

    return `
      <section class="admin__section">
        <div class="admin__sectionHead">
          <div>
            <h2>Discount rules <span class="muted">(${rules.length})</span></h2>
            <p class="muted">Higher-priority per-day rules win. Length rules apply to the final subtotal. Use a negative percent to charge a surcharge.</p>
          </div>
          <button class="btn btn--primary" id="newRule">+ New rule</button>
        </div>
        <div class="admin__tableWrap">
          <table class="admin__table">
            <thead><tr><th>Rule</th><th>Adjustment</th><th>Applies to</th><th>Priority</th><th>Active</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="admin__formCard" id="ruleForm" hidden>
          <h3 id="ruleFormTitle">New rule</h3>
          <form data-form="rule">
            <input type="hidden" name="id" />
            <div class="admin__row">
              <label>Name<input type="text" name="name" required placeholder="Weekend Special" /></label>
              <label>Type
                <select name="type">
                  <option value="dayOfWeek">By weekday</option>
                  <option value="dateRange">Date range</option>
                  <option value="specificDates">Specific dates</option>
                  <option value="length">Rental length</option>
                </select>
              </label>
            </div>

            <div class="admin__row" data-rule-type="dayOfWeek">
              <fieldset class="admin__dow">
                <legend>Days</legend>
                ${DOW_LABELS.map((d, i) => `
                  <label class="admin__dowChip"><input type="checkbox" name="days" value="${i}" />${d}</label>
                `).join("")}
              </fieldset>
            </div>

            <div class="admin__row" data-rule-type="dateRange" hidden>
              <label>Start<input type="date" name="start" /></label>
              <label>End<input type="date" name="end" /></label>
            </div>

            <div class="admin__row" data-rule-type="specificDates" hidden>
              <label class="admin__full">Dates (comma-separated YYYY-MM-DD)
                <input type="text" name="dates" placeholder="2026-12-24, 2026-12-25" />
              </label>
            </div>

            <div class="admin__row" data-rule-type="length" hidden>
              <label>Minimum rental length (days)<input type="number" name="minDays" min="1" value="5" /></label>
            </div>

            <div class="admin__row">
              <label>Discount %
                <input type="number" name="discountPercent" required step="1" value="15" />
                <span class="muted small">positive = discount · negative = surcharge</span>
              </label>
              <label>Priority<input type="number" name="priority" value="10" /></label>
            </div>

            <div class="admin__row">
              <label>Applies to
                <select name="appliesTo">
                  <option value="all">All items</option>
                  <optgroup label="By category">
                    ${CATEGORIES.filter((c) => c.id !== "all").map((c) =>
                      `<option value="category:${c.id}">${c.label}</option>`
                    ).join("")}
                  </optgroup>
                  <optgroup label="Single item">
                    ${EQUIPMENT.map((i) => `<option value="${i.id}">${i.name}</option>`).join("")}
                  </optgroup>
                </select>
              </label>
              <label>Color (calendar badge)<input type="color" name="color" value="#f4b740" /></label>
            </div>

            <div class="admin__row">
              <label class="admin__check">
                <input type="checkbox" name="active" checked />
                Active
              </label>
            </div>

            <div class="admin__formActions">
              <button type="button" class="btn btn--ghost btn--sm" data-cancel-form>Cancel</button>
              <button type="submit" class="btn btn--primary btn--sm">Save rule</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  /* ---------- Blackouts tab ---------- */
  function renderBlackouts() {
    const list = Engine.state.getBlackouts()
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));

    const rows = list.length === 0
      ? `<tr><td colspan="4" class="admin__empty">No blackouts yet.</td></tr>`
      : list.map((b) => {
          const item = EQUIPMENT.find((i) => i.id === b.itemId);
          return `
            <tr>
              <td><strong>${item ? item.name : b.itemId}</strong></td>
              <td>${b.start} → ${b.end}</td>
              <td>${escapeHtml(b.reason || "—")}</td>
              <td>
                <button class="btn btn--ghost btn--sm" data-edit-blackout="${b.id}">Edit</button>
                <button class="icon-btn icon-btn--danger" data-delete-blackout="${b.id}" aria-label="Delete blackout">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path></svg>
                </button>
              </td>
            </tr>
          `;
        }).join("");

    return `
      <section class="admin__section">
        <div class="admin__sectionHead">
          <div>
            <h2>Blackouts <span class="muted">(${list.length})</span></h2>
            <p class="muted">Mark items as unavailable for maintenance, calibration, or internal use.</p>
          </div>
          <button class="btn btn--primary" id="newBlackout">+ New blackout</button>
        </div>
        <div class="admin__tableWrap">
          <table class="admin__table">
            <thead><tr><th>Item</th><th>Dates</th><th>Reason</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="admin__formCard" id="blackoutForm" hidden>
          <h3 id="blackoutFormTitle">New blackout</h3>
          <form data-form="blackout">
            <input type="hidden" name="id" />
            <div class="admin__row">
              <label>Item<select name="itemId" required>${itemOptions()}</select></label>
              <label>Reason<input type="text" name="reason" placeholder="Sensor cleaning, firmware…" /></label>
            </div>
            <div class="admin__row">
              <label>Start<input type="date" name="start" required /></label>
              <label>End<input type="date" name="end" required /></label>
            </div>
            <div class="admin__formActions">
              <button type="button" class="btn btn--ghost btn--sm" data-cancel-form>Cancel</button>
              <button type="submit" class="btn btn--primary btn--sm">Save blackout</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  /* ---------- Settings tab ---------- */
  function renderSettings() {
    const bookings = Engine.state.getBookings().length;
    const rules = Engine.state.getRules().length;
    const blackouts = Engine.state.getBlackouts().length;

    return `
      <section class="admin__section">
        <h2>Settings</h2>
        <p class="muted">All data is currently stored in this browser's localStorage. In production, replace the Engine.state get/set functions with a real API.</p>
        <div class="admin__statGrid">
          <div class="admin__stat"><strong>${bookings}</strong><span>bookings</span></div>
          <div class="admin__stat"><strong>${rules}</strong><span>discount rules</span></div>
          <div class="admin__stat"><strong>${blackouts}</strong><span>blackouts</span></div>
        </div>
        <div class="admin__dangerZone">
          <h3>Danger zone</h3>
          <p class="muted small">Reset all scheduling data to the original demo seeds. Cannot be undone.</p>
          <button class="btn btn--ghost btn--sm" id="resetAll">Reset to demo defaults</button>
        </div>
      </section>
    `;
  }

  /* ---------- Event wiring (delegated per tab) ---------- */
  function wireEvents(root) {
    // Bookings
    root.querySelector("#newBooking")?.addEventListener("click", () =>
      openBookingForm({ id: "", itemId: EQUIPMENT[0].id, status: "confirmed", start: "", end: "", customer: "", notes: "" })
    );
    root.querySelectorAll("[data-edit-booking]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const b = Engine.state.getBookings().find((x) => x.id === btn.dataset.editBooking);
        if (b) openBookingForm(b);
      })
    );
    root.querySelectorAll("[data-delete-booking]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (confirm("Delete this booking?")) Engine.mutations.deleteBooking(btn.dataset.deleteBooking);
      })
    );
    root.querySelector('form[data-form="booking"]')?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get("id") || undefined;
      Engine.mutations.upsertBooking({
        id,
        itemId: fd.get("itemId"),
        status: fd.get("status"),
        start: fd.get("start"),
        end: fd.get("end"),
        customer: fd.get("customer") || "",
        notes: fd.get("notes") || "",
      });
    });

    // Rules
    root.querySelector("#newRule")?.addEventListener("click", () =>
      openRuleForm({
        id: "", name: "", type: "dayOfWeek", days: [5, 6, 0],
        discountPercent: 15, priority: 10, appliesTo: "all",
        color: "#f4b740", active: true,
      })
    );
    root.querySelectorAll("[data-edit-rule]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = Engine.state.getRules().find((x) => x.id === btn.dataset.editRule);
        if (r) openRuleForm(r);
      })
    );
    root.querySelectorAll("[data-delete-rule]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (confirm("Delete this rule?")) Engine.mutations.deleteRule(btn.dataset.deleteRule);
      })
    );
    root.querySelectorAll("[data-toggle-rule]").forEach((cb) =>
      cb.addEventListener("change", () => Engine.mutations.toggleRule(cb.dataset.toggleRule))
    );

    const ruleForm = root.querySelector('form[data-form="rule"]');
    if (ruleForm) {
      ruleForm.querySelector('[name="type"]').addEventListener("change", (e) =>
        switchRuleType(ruleForm, e.target.value)
      );
      ruleForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const type = fd.get("type");
        const rule = {
          id: fd.get("id") || undefined,
          name: fd.get("name"),
          type,
          discountPercent: Number(fd.get("discountPercent")) || 0,
          priority: Number(fd.get("priority")) || 0,
          appliesTo: fd.get("appliesTo"),
          color: fd.get("color"),
          active: fd.get("active") === "on",
        };
        if (type === "dayOfWeek") rule.days = fd.getAll("days").map(Number);
        if (type === "dateRange") { rule.start = fd.get("start"); rule.end = fd.get("end"); }
        if (type === "specificDates") rule.dates = (fd.get("dates") || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (type === "length") rule.minDays = Number(fd.get("minDays")) || 1;
        Engine.mutations.upsertRule(rule);
      });
    }

    // Blackouts
    root.querySelector("#newBlackout")?.addEventListener("click", () =>
      openBlackoutForm({ id: "", itemId: EQUIPMENT[0].id, start: "", end: "", reason: "" })
    );
    root.querySelectorAll("[data-edit-blackout]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const b = Engine.state.getBlackouts().find((x) => x.id === btn.dataset.editBlackout);
        if (b) openBlackoutForm(b);
      })
    );
    root.querySelectorAll("[data-delete-blackout]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (confirm("Delete this blackout?")) Engine.mutations.deleteBlackout(btn.dataset.deleteBlackout);
      })
    );
    root.querySelector('form[data-form="blackout"]')?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Engine.mutations.upsertBlackout({
        id: fd.get("id") || undefined,
        itemId: fd.get("itemId"),
        start: fd.get("start"),
        end: fd.get("end"),
        reason: fd.get("reason") || "",
      });
    });

    // Cancel buttons
    root.querySelectorAll("[data-cancel-form]").forEach((btn) =>
      btn.addEventListener("click", () => {
        btn.closest(".admin__formCard").hidden = true;
      })
    );

    // Settings reset
    root.querySelector("#resetAll")?.addEventListener("click", () => {
      if (confirm("Reset all bookings, rules, and blackouts to demo defaults?")) {
        Engine.state.resetAll();
      }
    });
  }

  /* ---------- Form open helpers ---------- */
  function openBookingForm(b) {
    const card = $("#bookingForm");
    const form = card.querySelector("form");
    form.elements.id.value       = b.id || "";
    form.elements.itemId.value   = b.itemId;
    form.elements.status.value   = b.status || "confirmed";
    form.elements.start.value    = b.start || "";
    form.elements.end.value      = b.end || "";
    form.elements.customer.value = b.customer || "";
    form.elements.notes.value    = b.notes || "";
    $("#bookingFormTitle").textContent = b.id ? "Edit booking" : "New booking";
    card.hidden = false;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openBlackoutForm(b) {
    const card = $("#blackoutForm");
    const form = card.querySelector("form");
    form.elements.id.value     = b.id || "";
    form.elements.itemId.value = b.itemId;
    form.elements.start.value  = b.start || "";
    form.elements.end.value    = b.end   || "";
    form.elements.reason.value = b.reason || "";
    $("#blackoutFormTitle").textContent = b.id ? "Edit blackout" : "New blackout";
    card.hidden = false;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openRuleForm(r) {
    const card = $("#ruleForm");
    const form = card.querySelector("form");
    form.elements.id.value              = r.id || "";
    form.elements.name.value            = r.name || "";
    form.elements.type.value            = r.type || "dayOfWeek";
    form.elements.discountPercent.value = r.discountPercent ?? 15;
    form.elements.priority.value        = r.priority ?? 10;
    form.elements.appliesTo.value       = r.appliesTo || "all";
    form.elements.color.value           = r.color || "#f4b740";
    form.elements.active.checked        = r.active !== false;

    // type-specific fields
    Array.from(form.querySelectorAll('input[name="days"]')).forEach((cb) =>
      cb.checked = (r.days || []).includes(Number(cb.value))
    );
    if (r.type === "dateRange") {
      form.elements.start.value = r.start || "";
      form.elements.end.value   = r.end   || "";
    }
    if (r.type === "specificDates") {
      const datesInput = form.querySelector('input[name="dates"]');
      if (datesInput) datesInput.value = (r.dates || []).join(", ");
    }
    if (r.type === "length") {
      const md = form.querySelector('input[name="minDays"]');
      if (md) md.value = r.minDays || 5;
    }

    switchRuleType(form, r.type || "dayOfWeek");
    $("#ruleFormTitle").textContent = r.id ? "Edit rule" : "New rule";
    card.hidden = false;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function switchRuleType(form, type) {
    form.querySelectorAll("[data-rule-type]").forEach((row) => {
      row.hidden = row.dataset.ruleType !== type;
    });
  }

  /* ---------- Misc ---------- */
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- Global triggers ---------- */
  function bindGlobalTriggers() {
    if (location.hash === "#admin") open();
    window.addEventListener("hashchange", () => {
      if (location.hash === "#admin") open();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        open();
      }
    });
  }

  global.ChanAdmin = { open, close };
  bindGlobalTriggers();
})(window);
