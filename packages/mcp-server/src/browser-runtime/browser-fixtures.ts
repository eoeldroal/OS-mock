function shellStyles(title: string, body: string, script = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Ubuntu", system-ui, sans-serif;
        background: #f4f6f8;
        color: #1f2937;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top right, rgba(233,84,32,0.12), transparent 28%),
          linear-gradient(180deg, #f7f8fb 0%, #eef2f6 100%);
      }
      .page {
        width: min(980px, calc(100vw - 48px));
        margin: 28px auto 40px;
        padding: 28px;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(255,255,255,0.94);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(233, 84, 32, 0.1);
        color: #b45309;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 18px 0 10px;
        font-size: 34px;
        line-height: 1.1;
        color: #111827;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.6;
      }
      .muted {
        color: #64748b;
        font-size: 14px;
      }
      .panel {
        margin-top: 22px;
        padding: 18px;
        border-radius: 16px;
        border: 1px solid rgba(203, 213, 225, 0.8);
        background: #fff;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 700;
        color: #334155;
      }
      input, textarea, button {
        font: inherit;
      }
      input, textarea {
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
      }
      textarea {
        min-height: 120px;
        resize: vertical;
      }
      button {
        border: 0;
        border-radius: 12px;
        padding: 12px 16px;
        background: #e95420;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      button.secondary {
        background: #0f172a;
      }
      .cards {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }
      .card {
        width: 100%;
        text-align: left;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid #d7dee7;
        background: #fff;
        color: #0f172a;
      }
      .card.active {
        border-color: rgba(233, 84, 32, 0.7);
        box-shadow: 0 0 0 3px rgba(233, 84, 32, 0.12);
      }
      .code {
        font-family: "Ubuntu Mono", ui-monospace, monospace;
        color: #0f172a;
      }
      .empty {
        padding: 16px;
        border-radius: 14px;
        background: #f8fafc;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${body}
    </main>
    ${script ? `<script>${script}</script>` : ""}
  </body>
</html>`;
}

function renderStartFixture() {
  return shellStyles(
    "OS Mock Start Page",
    `
      <div class="eyebrow">OS Mock</div>
      <h1>OS Mock Start Page</h1>
      <p>Use the address bar to open a task page such as briefing.local, catalog.local, or intake.local. This stable start page avoids network-dependent failures before the task actually begins.</p>
      <section class="panel grid">
        <div>
          <span class="label">Task pages</span>
          <p class="code">briefing.local</p>
          <p class="code">catalog.local</p>
          <p class="code">intake.local</p>
        </div>
        <div>
          <span class="label">Workflow reminder</span>
          <p>Open the requested local page, extract the visible field, and record it in the note or file named by the task.</p>
        </div>
      </section>
    `
  );
}

function renderBriefingFixture() {
  return shellStyles(
    "Dock Briefing",
    `
      <div class="eyebrow">Ops Memo</div>
      <h1>Quarterly Dock Briefing</h1>
      <p>Review the dock rollout notes before updating the local workspace log. This page mirrors the lightweight reading and extraction style that appears in real browser-based desktop tasks.</p>
      <section class="panel grid">
        <div>
          <span class="label">Shift Window</span>
          <p>Tuesday 14:00 to 16:00 KST</p>
        </div>
        <div>
          <span class="label">Coordinator</span>
          <p class="code">OPS-482</p>
        </div>
        <div>
          <span class="label">Reminder</span>
          <p>Keep the browser and saved note aligned while validating the rollout.</p>
        </div>
      </section>
    `
  );
}

function renderCatalogFixture() {
  const body = `
    <div class="eyebrow">Research Catalog</div>
    <h1>Operations Catalog</h1>
    <p>Search the task catalog, open the matching item, and capture the requested field in a local note.</p>
    <section class="panel">
      <form id="catalog-search">
        <label class="label" for="catalog-query">Search catalog</label>
        <div class="grid" style="grid-template-columns: minmax(0, 1fr) auto;">
          <input id="catalog-query" name="q" placeholder="Try: kernel backlog" autocomplete="off" />
          <button type="submit">Search</button>
        </div>
      </form>
      <div id="catalog-results" class="cards" aria-live="polite"></div>
      <div id="catalog-detail" class="panel" style="display:none;"></div>
    </section>
  `;
  const script = `
    const entries = [
      { id: "kernel-backlog", title: "Kernel backlog", owner: "OPS-482", detail: "Resolve the overnight queue drift before the dock rehearsal." },
      { id: "mail-audit", title: "Mail audit", owner: "MSG-204", detail: "Verify archived responses before the Thursday report." },
      { id: "terminal-rollup", title: "Terminal rollup", owner: "CLI-119", detail: "Capture the current working directory and append it to the handoff note." }
    ];
    const form = document.getElementById("catalog-search");
    const input = document.getElementById("catalog-query");
    const results = document.getElementById("catalog-results");
    const detail = document.getElementById("catalog-detail");

    function renderResults(query) {
      const normalized = query.trim().toLowerCase();
      const matches = entries.filter((entry) => entry.title.toLowerCase().includes(normalized));
      results.innerHTML = "";
      if (matches.length === 0) {
        results.innerHTML = '<div class="empty">No matching entries yet. Try the exact task name.</div>';
        return;
      }
      for (const entry of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "card";
        button.dataset.entryId = entry.id;
        button.innerHTML = '<div class="muted">Catalog item</div><div style="font-size:18px;font-weight:800;margin-top:6px;">' + entry.title + '</div><div class="muted" style="margin-top:8px;">Click to inspect the owner code and rollout note.</div>';
        button.addEventListener("click", () => openEntry(entry.id));
        results.appendChild(button);
      }
    }

    function openEntry(entryId) {
      const entry = entries.find((candidate) => candidate.id === entryId);
      if (!entry) return;
      location.hash = 'entry=' + entry.id;
      for (const button of results.querySelectorAll('.card')) {
        button.classList.toggle('active', button.dataset.entryId === entry.id);
      }
      detail.style.display = 'block';
      detail.innerHTML = '<div class="muted">Catalog detail</div><h2 style="margin:8px 0 6px;">' + entry.title + '</h2><p>' + entry.detail + '</p><div class="grid" style="margin-top:14px;"><div><span class="label">Owner code</span><div class="code">' + entry.owner + '</div></div><div><span class="label">Status</span><div>Ready for review</div></div></div>';
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      renderResults(input.value);
    });

    const initialHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('entry');
    if (initialHash) {
      renderResults(initialHash.replace('-', ' '));
      openEntry(initialHash);
    } else {
      results.innerHTML = '<div class="empty">Search for an item to reveal its detail panel.</div>';
    }
  `;
  return shellStyles("Ops Catalog", body, script);
}

function renderIntakeFixture() {
  const body = `
    <div class="eyebrow">Access Intake</div>
    <h1>Workspace Access Intake</h1>
    <p>Submit the request form and capture the confirmation code that appears after a successful handoff.</p>
    <section class="panel">
      <form id="intake-form">
        <div class="grid">
          <label>
            <span class="label">Name</span>
            <input name="name" autocomplete="off" />
          </label>
          <label>
            <span class="label">Team</span>
            <input name="team" autocomplete="off" />
          </label>
        </div>
        <label style="display:block;margin-top:14px;">
          <span class="label">Purpose</span>
          <textarea name="purpose"></textarea>
        </label>
        <div style="display:flex;justify-content:flex-end;margin-top:16px;">
          <button type="submit" class="secondary">Submit Request</button>
        </div>
      </form>
      <div id="intake-confirmation" class="panel" style="display:none;"></div>
    </section>
  `;
  const script = `
    const form = document.getElementById('intake-form');
    const confirmation = document.getElementById('intake-confirmation');
    const code = 'INT-417';

    function showConfirmation(payload) {
      location.hash = 'submitted=intake-417';
      confirmation.style.display = 'block';
      confirmation.innerHTML =
        '<div class="muted">Request accepted</div>' +
        '<h2 style="margin:8px 0 6px;">Access request queued</h2>' +
        '<p>' + payload.name + ' from ' + payload.team + ' is now scheduled for review.</p>' +
        '<div style="margin-top:14px;"><span class="label">Confirmation code</span><div class="code">' + code + '</div></div>';
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      showConfirmation({
        name: data.get('name') || 'Unknown requester',
        team: data.get('team') || 'Unassigned team'
      });
    });

    if (location.hash.includes('submitted=intake-417')) {
      showConfirmation({ name: 'Nari Kim', team: 'Release Ops' });
    }
  `;
  return shellStyles("Access Intake", body, script);
}

export function isBrowserFixtureUrl(url: string) {
  return url.startsWith("osmock://browser-fixtures/");
}

export function resolveBrowserFixtureUrl(url: string, baseUrl: string) {
  if (!isBrowserFixtureUrl(url)) {
    return url;
  }
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return url.replace("osmock://browser-fixtures", `${normalizedBase}/browser-fixtures`);
}

export function renderBrowserFixturePage(fixtureId: string) {
  if (fixtureId === "start") {
    return renderStartFixture();
  }
  if (fixtureId === "briefing") {
    return renderBriefingFixture();
  }
  if (fixtureId === "catalog") {
    return renderCatalogFixture();
  }
  if (fixtureId === "intake") {
    return renderIntakeFixture();
  }
  return undefined;
}
