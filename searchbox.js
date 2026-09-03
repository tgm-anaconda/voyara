// Suchmaske mit vier Reitern: Hotels, Ferienwohnungen, Mietwagen, Flüge.
// Jeder Reiter zeigt eigene Felder. Bei Unterkünften lässt sich der Flug
// optional dazubuchen. Der Zustand wandert als URL-Parameter weiter.

const SearchBox = (() => {
  const MAX_ROOMS = 4;
  const MAX_PER_ROOM = 6;

  let rooms = [{ adults: 2, children: 0, childAges: [] }];
  let mountEl = null;
  let onSubmit = null;
  let activeType = "hotel";
  let withFlight = false;

  const AIRPORTS = ["Berlin (BER)", "Bremen (BRE)", "Düsseldorf (DUS)", "Frankfurt (FRA)", "Hamburg (HAM)", "Hannover (HAJ)", "Köln (CGN)", "Leipzig (LEJ)", "München (MUC)", "Nürnberg (NUE)", "Stuttgart (STR)"];

  function totals() {
    return {
      adults: rooms.reduce((s, r) => s + r.adults, 0),
      children: rooms.reduce((s, r) => s + r.children, 0),
      rooms: rooms.length,
    };
  }

  function summaryText() {
    const t = totals();
    const parts = [`${t.adults} Erwachsene${t.adults === 1 ? "r" : ""}`];
    if (t.children > 0) parts.push(`${t.children} Kind${t.children === 1 ? "" : "er"}`);
    if (activeType === "hotel") parts.push(`${t.rooms} Zimmer`);
    return parts.join(", ");
  }

  // Ortszeit, nicht UTC - sonst rutscht das Datum abends um einen Tag zurueck
  const isoDate = (d) => Reisedaten.alsIso(d);

  // Der Standardzeitraum kommt aus Reisedaten, damit Suchmaske und
  // Saisonrechnung nicht auseinanderlaufen.
  function defaultDates() {
    const { von, bis } = Reisedaten.standard();
    return { start: von, end: bis };
  }

  function destinationOptions() {
    // Ziele zuerst - danach sucht man am haeufigsten
    const ziele = ZIELE.map((z) => z.name);
    const laender = [...new Set(ZIELE.map((z) => z.land))].sort();
    const regions = [...new Set([...HOTELS, ...APARTMENTS].map((h) => h.region))].sort();
    const names = [...HOTELS, ...APARTMENTS].map((h) => h.name);
    return [...ziele, ...laender, ...regions, ...names]
      .map((d) => `<option value="${d}"></option>`).join("");
  }

  function fieldsFor(type, initial) {
    const guestField = `
      <div class="field">
        <label for="sbGuests">${type === "flight" ? "Passagiere" : "Reisende" + (type === "hotel" ? " & Zimmer" : "")}</label>
        <button type="button" class="guest-trigger" id="sbGuests">${summaryText()}</button>
        <div class="guest-pop" id="sbGuestPop" hidden>
          <div id="sbRooms"></div>
          ${type === "hotel" ? '<button type="button" class="link-btn" id="sbAddRoom">+ Weiteres Zimmer</button>' : ""}
          <button type="button" class="btn btn-primary btn-block btn-sm" id="sbApply">Übernehmen</button>
        </div>
      </div>`;

    if (type === "car") {
      return `
      <div class="field">
        <label for="sbDest">Abholstation</label>
        <input class="input" type="text" id="sbDest" list="sbDestList" placeholder="z. B. Flughafen Palma" value="${initial.q || "Flughafen Palma (PMI)"}" />
        <datalist id="sbDestList">
          <option value="Flughafen Palma (PMI)"></option>
          <option value="Palma Hafen"></option>
          <option value="Shuttle vom Flughafen"></option>
        </datalist>
      </div>
      <div class="field"><label for="sbFrom">Abholung</label><input class="input" type="date" id="sbFrom" value="${initial.from}" /></div>
      <div class="field"><label for="sbTo">Rückgabe</label><input class="input" type="date" id="sbTo" value="${initial.to}" /></div>
      <div class="field">
        <label for="sbAge">Alter der Fahrer:in</label>
        <select class="select" id="sbAge">
          <option value="25+" selected>25 Jahre oder älter</option>
          <option value="21-24">21 bis 24 Jahre</option>
          <option value="18-20">18 bis 20 Jahre</option>
        </select>
      </div>`;
    }

    if (type === "flight") {
      return `
      <div class="field">
        <label for="sbOrigin">Abflughafen</label>
        <select class="select" id="sbOrigin">
          <option value="">Alle Flughäfen</option>
          ${AIRPORTS.map((a) => `<option value="${a}" ${initial.q === a ? "selected" : ""}>${a}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="sbDest2">Ziel</label>
        <select class="select" id="sbDest2">
          <option value="">Alle Ziele</option>
          ${ZIELE.map((z) => `<option value="${z.id}" ${initial.ziel === z.id ? "selected" : ""}>${z.name} (${z.flughafen})</option>`).join("")}
        </select>
      </div>
      <div class="field"><label for="sbFrom">Hinflug</label><input class="input" type="date" id="sbFrom" value="${initial.from}" /></div>
      <div class="field"><label for="sbTo">Rückflug</label><input class="input" type="date" id="sbTo" value="${initial.to}" /></div>
      ${guestField}`;
    }

    // hotel + apartment
    return `
      <div class="field">
        <label for="sbDest">${type === "apartment" ? "Region oder Wohnung" : "Reiseziel oder Hotel"}</label>
        <input class="input" type="text" id="sbDest" list="sbDestList" placeholder="Wohin soll es gehen?" autocomplete="off" value="${initial.q || ""}" />
        <datalist id="sbDestList">${destinationOptions()}</datalist>
      </div>
      <div class="field"><label for="sbFrom">Anreise</label><input class="input" type="date" id="sbFrom" value="${initial.from}" /></div>
      <div class="field"><label for="sbTo">Abreise</label><input class="input" type="date" id="sbTo" value="${initial.to}" /></div>
      ${guestField}`;
  }

  function template(initial) {
    const tabs = [
      { key: "hotel", label: "Hotels" },
      { key: "apartment", label: "Ferienwohnungen" },
      { key: "car", label: "Mietwagen" },
      { key: "flight", label: "Flüge" },
    ];
    const showFlightAddon = activeType === "hotel" || activeType === "apartment";

    return `
<div class="searchbox-tabs">
  ${tabs.map((t) => `<button type="button" class="searchbox-tab ${t.key === activeType ? "active" : ""}" data-type="${t.key}">${t.label}</button>`).join("")}
</div>
<form class="searchbox-grid type-${activeType}" id="sbForm">
  ${fieldsFor(activeType, initial)}
  <button type="submit" class="btn btn-accent" style="height:41px">Suchen</button>
</form>
${showFlightAddon ? `
<label class="flight-addon">
  <input type="checkbox" id="sbWithFlight" ${withFlight ? "checked" : ""} />
  <span>Flug dazubuchen — wir zeigen dir passende Verbindungen zum Ziel</span>
</label>` : ""}`;
  }

  function renderRooms() {
    const list = mountEl.querySelector("#sbRooms");
    if (!list) return;
    const singleRoom = activeType !== "hotel";

    list.innerHTML = rooms
      .map((room, i) => {
        const people = room.adults + room.children;
        const ages = room.childAges
          .map((age, ci) => `
        <div class="child-age-row">
          <span>Alter Kind ${ci + 1}</span>
          <select data-room="${i}" data-child="${ci}" class="js-age">
            ${Array.from({ length: 18 }, (_, a) => `<option value="${a}" ${age === a ? "selected" : ""}>${a} J.</option>`).join("")}
          </select>
        </div>`).join("");

        return `
      <div class="room-block">
        ${singleRoom ? "" : `<div class="room-block-head">
          <strong>Zimmer ${i + 1}</strong>
          ${rooms.length > 1 ? `<button type="button" class="link-btn js-rm" data-room="${i}">entfernen</button>` : ""}
        </div>`}
        <div class="stepper-row">
          <span>Erwachsene</span>
          <div class="stepper">
            <button type="button" class="stepper-btn js-step" data-act="a-" data-room="${i}" ${room.adults <= 1 ? "disabled" : ""}>−</button>
            <span class="stepper-value">${room.adults}</span>
            <button type="button" class="stepper-btn js-step" data-act="a+" data-room="${i}" ${people >= MAX_PER_ROOM ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="stepper-row">
          <span>Kinder</span>
          <div class="stepper">
            <button type="button" class="stepper-btn js-step" data-act="c-" data-room="${i}" ${room.children <= 0 ? "disabled" : ""}>−</button>
            <span class="stepper-value">${room.children}</span>
            <button type="button" class="stepper-btn js-step" data-act="c+" data-room="${i}" ${people >= MAX_PER_ROOM ? "disabled" : ""}>+</button>
          </div>
        </div>
        ${ages}
      </div>`;
      })
      .join("");

    const addBtn = mountEl.querySelector("#sbAddRoom");
    if (addBtn) addBtn.style.display = rooms.length >= MAX_ROOMS ? "none" : "block";

    list.querySelectorAll(".js-step").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = rooms[+btn.dataset.room];
        const act = btn.dataset.act;
        if (act === "a+") r.adults++;
        if (act === "a-" && r.adults > 1) r.adults--;
        if (act === "c+") { r.children++; r.childAges.push(6); }
        if (act === "c-" && r.children > 0) { r.children--; r.childAges.pop(); }
        renderRooms();
      })
    );
    list.querySelectorAll(".js-age").forEach((sel) =>
      sel.addEventListener("change", () => { rooms[+sel.dataset.room].childAges[+sel.dataset.child] = +sel.value; })
    );
    list.querySelectorAll(".js-rm").forEach((btn) =>
      btn.addEventListener("click", () => { rooms.splice(+btn.dataset.room, 1); renderRooms(); })
    );
  }

  function currentQuery() {
    const t = totals();
    const get = (id) => mountEl.querySelector(id)?.value || "";
    const q = activeType === "flight" ? get("#sbOrigin") : get("#sbDest");
    const query = {
      type: activeType,
      q: q.trim(),
      from: get("#sbFrom"),
      to: get("#sbTo"),
      adults: t.adults,
      children: t.children,
    };
    if (activeType === "hotel") query.rooms = t.rooms;
    if (activeType === "flight") {
      const ziel = mountEl.querySelector("#sbDest2")?.value;
      if (ziel) query.ziel = ziel;
    }
    if (activeType === "car") query.age = get("#sbAge");
    if (withFlight) query.flight = "1";
    return query;
  }

  function wire(initial) {
    // Reiter wechseln
    mountEl.querySelectorAll(".searchbox-tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        activeType = tab.dataset.type;
        // Nur Hotels kennen mehrere Zimmer. Ohne dieses Zusammenlegen zaehlte
        // ein Flug die Reisenden aller Zimmer, zeigte aber nur eines an.
        if (activeType !== "hotel" && rooms.length > 1) {
          const t = totals();
          const erwachsene = Math.max(1, Math.min(t.adults, MAX_PER_ROOM));
          const kinder = Math.max(0, Math.min(t.children, MAX_PER_ROOM - erwachsene));
          rooms = [{ adults: erwachsene, children: kinder, childAges: Array.from({ length: kinder }, () => 6) }];
        }
        render(initial);
      })
    );

    const trigger = mountEl.querySelector("#sbGuests");
    const pop = mountEl.querySelector("#sbGuestPop");
    if (trigger && pop) {
      renderRooms();
      trigger.textContent = summaryText();
      trigger.addEventListener("click", (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; });
      mountEl.querySelector("#sbApply").addEventListener("click", () => { trigger.textContent = summaryText(); pop.hidden = true; });
      const addBtn = mountEl.querySelector("#sbAddRoom");
      if (addBtn) addBtn.addEventListener("click", () => {
        if (rooms.length < MAX_ROOMS) { rooms.push({ adults: 2, children: 0, childAges: [] }); renderRooms(); }
      });
      document.addEventListener("click", (e) => {
        if (!pop.hidden && !pop.contains(e.target) && e.target !== trigger) {
          trigger.textContent = summaryText();
          pop.hidden = true;
        }
      });
    }

    const from = mountEl.querySelector("#sbFrom");
    const to = mountEl.querySelector("#sbTo");
    if (from && to) {
      from.min = isoDate(new Date());
      to.min = from.value;   // sonst laesst sich vor dem ersten Wechsel ein Rueckreisedatum vor der Anreise waehlen
      from.addEventListener("change", () => {
        to.min = from.value;
        if (to.value <= from.value) {
          const next = new Date(from.value);
          next.setDate(next.getDate() + (activeType === "car" ? 3 : 7));
          to.value = isoDate(next);
        }
      });
    }

    const flightBox = mountEl.querySelector("#sbWithFlight");
    if (flightBox) flightBox.addEventListener("change", () => { withFlight = flightBox.checked; });

    mountEl.querySelector("#sbForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const query = currentQuery();
      if (onSubmit) onSubmit(query);
      else window.location.href = `results.html?${new URLSearchParams(query).toString()}`;
    });
  }

  function render(initial) {
    mountEl.innerHTML = template(initial);
    wire(initial);
  }

  function mount(selector, options = {}) {
    mountEl = document.querySelector(selector);
    if (!mountEl) return;
    onSubmit = options.onSubmit || null;

    const params = new URLSearchParams(window.location.search);
    const d = defaultDates();
    activeType = params.get("type") || options.type || "hotel";
    withFlight = params.get("flight") === "1";

    const initial = {
      ziel: params.get("ziel") || "",
      q: params.get("q") || options.q || "",
      from: params.get("from") || d.start,
      to: params.get("to") || d.end,
    };

    if (params.get("adults")) {
      const a = Math.max(1, +params.get("adults"));
      const c = Math.max(0, +(params.get("children") || 0));
      const r = Math.max(1, +(params.get("rooms") || 1));
      rooms = Array.from({ length: r }, (_, i) => ({
        adults: i === 0 ? Math.max(1, a - (r - 1)) : 1,
        children: i === 0 ? c : 0,
        childAges: i === 0 ? Array.from({ length: c }, () => 6) : [],
      }));
    }

    render(initial);
  }

  return { mount, currentQuery, get type() { return activeType; } };
})();
