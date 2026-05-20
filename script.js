/* =========================================================
   Chans Cams — interactivity
   Depends on:
     - data/equipment.js     (CATEGORIES, EQUIPMENT)
     - data/scheduling.js    (DEFAULT_DISCOUNT_RULES, DEFAULT_BOOKINGS, DEFAULT_BLACKOUTS)
     - modules/engine.js     (Engine.*)
     - modules/calendar.js   (ChanCalendar.*)
     - modules/admin.js      (ChanAdmin.*)
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtMoney = (n) =>
    n.toLocaleString("en-US", {
      style: "currency", currency: "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    });
  const fmtDateShort = (iso) => {
    if (!iso) return "";
    const d = Engine.util.fromISO(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const STORAGE_CART       = "chancams.cart.v2";       // { id: { qty, start?, end? } }

  /* ---------- Year ---------- */
  $("#year") && ($("#year").textContent = new Date().getFullYear());

  /* ---------- Nav: scroll state + mobile menu ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("nav--scrolled", window.scrollY > 8);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menuToggle = $("#menuToggle");
  const navLinks = $(".nav__links");
  menuToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  $$(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Category icons ---------- */
  const ICONS = {
    camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3l2-3h8l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></svg>`,
    lens:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/></svg>`,
    mount:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/></svg>`,
    rig:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M2 9v6M22 9v6M9 2h6M9 22h6"/></svg>`,
    monitor:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>`,
    power:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M20 10v4h2v-4z"/><path d="M6 10v4M10 10v4"/></svg>`,
    support:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"/><circle cx="12" cy="9" r="2"/><path d="M12 11l-6 11M12 11l6 11M12 11v11"/></svg>`,
    media:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v6h8V3"/><path d="M8 14h8M8 18h5"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12a9 9 0 0 0 18 0"/><path d="M12 3v18"/></svg>`,
    case:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M3 12h18"/></svg>`,
  };

  /* ---------- State ---------- */
  let activeCategory = "all";
  let searchTerm = "";
  let cart = loadCart();   // { id: { qty: 1, start?: iso, end?: iso } }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_CART);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      // Migrate v1 ({ id: 1 }) → v2 ({ id: { qty: 1 } })
      const out = {};
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === "number") out[k] = { qty: v };
        else if (v && typeof v === "object") out[k] = v;
      });
      return out;
    } catch { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); } catch {}
  }

  /** Open the per-item calendar and persist the picked dates into the cart. */
  function pickDatesAndAddToCart(item) {
    ChanCalendar.open(item, {
      start: cart[item.id]?.start,
      end:   cart[item.id]?.end,
      onAdd: ({ start, end }) => {
        cart[item.id] = { qty: 1, start, end };
        saveCart();
        renderCatalog();
        renderCart();
        openDrawer();
      },
    });
  }

  /* ---------- Filter chips ---------- */
  const filterGroup = $("#filterGroup");
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-chip" + (cat.id === activeCategory ? " is-active" : "");
    btn.type = "button";
    btn.textContent = cat.label;
    btn.dataset.category = cat.id;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      $$(".filter-chip", filterGroup).forEach((b) =>
        b.classList.toggle("is-active", b.dataset.category === activeCategory)
      );
      renderCatalog();
    });
    filterGroup.appendChild(btn);
  });

  /* ---------- Search ---------- */
  const searchInput = $("#searchInput");
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderCatalog();
  });

  /* ---------- Catalog rendering ---------- */
  const grid = $("#catalogGrid");
  const emptyMsg = $("#catalogEmpty");

  function getFilteredEquipment() {
    return EQUIPMENT.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (!searchTerm) return true;
      const haystack = [
        item.name, item.tagline, item.summary, item.mount, item.category,
        ...(item.specs || []),
      ].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  function categoryLabel(id) {
    const c = CATEGORIES.find((c) => c.id === id);
    return c ? c.label.replace(/s$/, "") : id;
  }

  /** Today's posted rate for this item, factoring in any active per-day rule. */
  function todaysRate(item) {
    const today = new Date();
    const rule = Engine.pricing.dailyRuleFor(item, today);
    if (!rule) return { rate: item.daily, rule: null };
    const pct = rule.discountPercent || 0;
    return { rate: Math.round(item.daily * (1 - pct / 100) * 100) / 100, rule };
  }

  function renderCatalog() {
    const items = getFilteredEquipment();
    grid.innerHTML = "";

    if (items.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    items.forEach((item) => {
      const inCart = !!cart[item.id];
      const cartEntry = cart[item.id];
      const today = todaysRate(item);

      const specsHtml = (item.specs || []).slice(0, 4).map((s) => `<li>${s}</li>`).join("");
      const badgeHtml = item.badge
        ? `<span class="card__badge">${item.badge}</span>`
        : "";

      const todayRuleHtml = today.rule
        ? `<span class="card__rule-flag" style="--c:${today.rule.color || 'var(--accent)'}">
             ${today.rule.discountPercent >= 0 ? "−" : "+"}${Math.abs(today.rule.discountPercent)}% · ${today.rule.name}
           </span>`
        : "";

      const dateChipHtml = cartEntry?.start && cartEntry?.end
        ? `<span class="card__dates" title="Selected dates">
             ${fmtDateShort(cartEntry.start)} → ${fmtDateShort(cartEntry.end)}
           </span>`
        : "";

      const visualClass = "card__visual" + (item.image ? " card__visual--photo" : "");
      const imgHtml = item.image
        ? `<img class="card__img" src="${item.image}" alt="${item.name}" loading="lazy"
                 onerror="this.classList.add('is-broken')" />`
        : "";

      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="${visualClass}">
          ${imgHtml}
          ${badgeHtml}
          <span class="card__categoryTag">${categoryLabel(item.category)}</span>
          <span class="card__icon">${ICONS[item.category] || ICONS.camera}</span>
        </div>
        <div class="card__body">
          <h3 class="card__title">${item.name}</h3>
          <p class="card__tag">${item.tagline}${item.mount ? ` · ${item.mount}` : ""}</p>
          <ul class="card__specs">${specsHtml}</ul>
          ${todayRuleHtml}
          <div class="card__foot">
            <div class="card__price">
              <strong>${fmtMoney(today.rate)}</strong>
              <span>per day · retail ${fmtMoney(item.retail)}</span>
              ${dateChipHtml}
            </div>
            <div class="card__actions">
              <button class="card__dates-btn" data-dates="${item.id}" aria-label="Check availability for ${item.name}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Dates
              </button>
              <button class="card__add ${inCart ? "is-added" : ""}" data-add="${item.id}" aria-label="Add ${item.name} to cart">
                ${inCart
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added`
                  : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add`}
              </button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.add;
        if (cart[id]) {
          delete cart[id];
          saveCart();
          renderCatalog();
          renderCart();
          return;
        }
        const item = EQUIPMENT.find((i) => i.id === id);
        if (item) pickDatesAndAddToCart(item);
      });
    });
    grid.querySelectorAll("[data-dates]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = EQUIPMENT.find((i) => i.id === btn.dataset.dates);
        if (item) pickDatesAndAddToCart(item);
      });
    });
  }

  /* ---------- Cart drawer ---------- */
  const drawer    = $("#cartDrawer");
  const backdrop  = $("#cartBackdrop");
  const cartList  = $("#cartList");
  const cartTotal = $("#cartTotal");
  const cartCount = $("#cartCount");
  const cartButton  = $("#cartButton");
  const cartClose = $("#cartClose");
  const cartCheckout = $("#cartCheckout");

  const formCartList  = $("#formCartList");
  const formCartEmpty = $("#formCartEmpty");

  /**
   * Resolve a date range for a cart item. Every cart line is priced over its
   * own pickup → return window; legacy entries without dates are surfaced as
   * "needs dates" lines so the user can attach a range before checkout.
   */
  function resolveLine(itemId) {
    const entry = cart[itemId];
    if (!entry) return null;
    const item = EQUIPMENT.find((i) => i.id === itemId);
    if (!item) return null;

    if (entry.start && entry.end) {
      const s = Engine.util.fromISO(entry.start);
      const e = Engine.util.fromISO(entry.end);
      const r = Engine.pricing.calculateRental(item, s, e);
      return { item, source: "dates", start: entry.start, end: entry.end, days: r.length, total: r.total, breakdown: r };
    }
    return { item, source: "none", start: null, end: null, days: 0, total: 0, breakdown: null };
  }

  function totalCartPrice() {
    return Object.keys(cart).reduce((sum, id) => {
      const line = resolveLine(id);
      return line ? sum + line.total : sum;
    }, 0);
  }
  function hasUndatedItems() {
    return Object.keys(cart).some((id) => {
      const line = resolveLine(id);
      return line && line.source === "none";
    });
  }

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 250);
    document.body.style.overflow = "";
  }
  cartButton.addEventListener("click", openDrawer);
  cartClose.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  cartCheckout.addEventListener("click", () => {
    closeDrawer();
    setTimeout(() => {
      $("#contact").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 280);
  });

  function renderCart() {
    const ids = Object.keys(cart);
    cartCount.textContent = ids.length;
    drawer.classList.toggle("has-items", ids.length > 0);

    // Drawer list
    cartList.innerHTML = "";
    ids.forEach((id) => {
      const line = resolveLine(id);
      if (!line) return;
      const { item, days, total, breakdown, source, start, end } = line;

      const needsDates = source !== "dates";
      const datesLabel = needsDates
        ? `<span class="cart-line__needs">Pick a pickup → return date to price this item.</span>`
        : `${fmtDateShort(start)} → ${fmtDateShort(end)} · ${days} ${days === 1 ? "day" : "days"}`;
      const savings = breakdown && breakdown.savings > 0
        ? `<span class="cart-line__savings">Saves ${fmtMoney(breakdown.savings)}</span>`
        : "";
      const totalDisplay = needsDates ? "—" : fmtMoney(total);

      const li = document.createElement("li");
      if (needsDates) li.className = "cart-line--needs-dates";
      li.innerHTML = `
        <div class="cart-drawer__item">
          <div class="cart-line__head">
            <h4>${item.name}</h4>
            <a class="cart-remove" data-remove="${id}" href="#" aria-label="Remove ${item.name}">×</a>
          </div>
          <div class="cart-line__meta">
            <span>${datesLabel}</span>
            ${savings}
          </div>
          <div class="cart-line__foot">
            <strong>${totalDisplay}</strong>
            <button class="cart-line__edit" data-edit="${id}">${needsDates ? "Pick dates" : "Change dates"}</button>
          </div>
        </div>
      `;
      cartList.appendChild(li);
    });

    cartList.querySelectorAll("[data-remove]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        delete cart[a.dataset.remove];
        saveCart();
        renderCart();
        renderCatalog();
      })
    );
    cartList.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = EQUIPMENT.find((i) => i.id === btn.dataset.edit);
        if (!item) return;
        closeDrawer();
        pickDatesAndAddToCart(item);
      })
    );

    cartTotal.textContent = fmtMoney(totalCartPrice());
    const undated = hasUndatedItems();
    cartCheckout.classList.toggle("is-disabled", undated);
    cartCheckout.setAttribute("aria-disabled", String(undated));

    // Form-side cart preview
    if (ids.length === 0) {
      formCartEmpty.hidden = false;
      formCartList.hidden = true;
      formCartList.innerHTML = "";
    } else {
      formCartEmpty.hidden = true;
      formCartList.hidden = false;
      formCartList.innerHTML = ids.map((id) => {
        const line = resolveLine(id);
        if (!line) return "";
        const dateLabel = line.source === "dates"
          ? `${fmtDateShort(line.start)} → ${fmtDateShort(line.end)}`
          : `<em class="cart-line__needs-inline">needs dates</em>`;
        const totalLabel = line.source === "dates" ? fmtMoney(line.total) : "—";
        return `<li><span>${line.item.name} <em class="muted small">${dateLabel}</em></span><span>${totalLabel}</span></li>`;
      }).join("") +
      `<li style="margin-top:6px;border-top:1px solid var(--line-soft);padding-top:8px">
         <span><strong>Estimated subtotal</strong></span>
         <span><strong>${fmtMoney(totalCartPrice())}</strong></span>
       </li>`;
    }
  }

  /* ---------- Quote form ---------- */
  const form = $("#quoteForm");
  const notice = $("#quoteNotice");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const required = ["name", "email", "pickup", "return"];
    for (const f of required) {
      if (!String(data.get(f) || "").trim()) {
        notice.hidden = false;
        notice.classList.add("is-error");
        notice.textContent = "Please fill out the highlighted fields so we can get back to you.";
        form.querySelector(`[name="${f}"]`)?.focus();
        return;
      }
    }

    const pickup = new Date(data.get("pickup"));
    const ret    = new Date(data.get("return"));
    if (ret < pickup) {
      notice.hidden = false;
      notice.classList.add("is-error");
      notice.textContent = "Return date must be on or after pickup.";
      return;
    }

    try {
      const lines = Object.keys(cart).map((id) => resolveLine(id)).filter(Boolean);
      const payload = {
        ...Object.fromEntries(data.entries()),
        cart,
        estimated: totalCartPrice(),
        lines: lines.map((l) => ({
          itemId: l.item.id, name: l.item.name, start: l.start, end: l.end,
          days: l.days, total: l.total,
        })),
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem("chancams.lastQuote.v1", JSON.stringify(payload));
    } catch {}

    notice.hidden = false;
    notice.classList.remove("is-error");
    const itemCount = Object.keys(cart).length;
    notice.textContent =
      itemCount > 0
        ? `Thanks — we received your request for ${itemCount} item${itemCount === 1 ? "" : "s"}. We'll reply within one business day.`
        : `Thanks — we received your request. We'll reply within one business day.`;
    form.reset();
  });

  /* ---------- Subscribe to engine changes (admin edits update the catalog/cart live) ---------- */
  Engine.state.subscribe(() => {
    renderCatalog();
    renderCart();
  });

  /* ---------- Reveal-on-scroll ---------- */
  const initialReveals = $$(".section-head, .process__steps li, .about__card, .quote-form, .contact__meta, .hero__stats > div");
  initialReveals.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  initialReveals.forEach((el) => io.observe(el));

  const mo = new MutationObserver(() => {
    $$(".card").forEach((el) => {
      if (!el.classList.contains("reveal")) {
        el.classList.add("reveal");
        io.observe(el);
      }
    });
  });
  mo.observe(grid, { childList: true });

  /* ---------- Initial paint ---------- */
  renderCatalog();
  renderCart();
})();
