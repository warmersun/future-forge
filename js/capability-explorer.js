/** Read-only, run-local capability evidence browser. */
import { buildCapabilityExplorerModel } from './capability-explorer-model.js';
import { mountTrendChart, destroyTrendChart, formatTrendValue } from './trend-chart.js?v=explorer-1';

let nextId = 0;
export function createCapabilityExplorer(host, dependencies = {}) {
  const doc = host.ownerDocument;
  const mount = dependencies.mountChart || dependencies.mountTrendChart || mountTrendChart;
  const dispose = dependencies.destroyChart || dependencies.destroyTrendChart || destroyTrendChart;
  const retry = dependencies.retry || dependencies.onRetry || dependencies.retryCatalog;
  const uid = `capability-description-${++nextId}`;
  let snapshot, model, identity, fingerprint, chart = null, destroyed = false, suspended = false;
  let collapsed = false, showAll = false, showMoreTrends = false, selectedYear = null, selectedRow = null;
  let selections = new Map(), expanded = new Set(), openRows = new Set(), resizeObserver, description, expandButton, rail, evidenceList, chartLayout;
  let activeGeneration = 0;
  const el = (tag, text, cls) => { const node = doc.createElement(tag); if (text != null) node.textContent = String(text); if (cls) node.className = cls; return node; };
  const appendText = (parent, tag, text, cls) => { const node = el(tag, text, cls); parent.append(node); return node; };
  function button(parent, text, action, value, focusKey) {
    const b = appendText(parent, 'button', text); b.type = 'button'; b.setAttribute('data-action', action);
    if (value != null) b.setAttribute('data-value', String(value));
    b.setAttribute('data-focus-key', focusKey || `${action}:${value ?? ''}`); return b;
  }
  function link(parent, label, url) {
    let parsed; try { parsed = new URL(url); } catch { parsed = null; }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) { appendText(parent, 'span', label); return; }
    const a = appendText(parent, 'a', label); a.href = parsed.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  }
  function clearChart() { activeGeneration++; if (chart) { dispose(chart); chart = null; } chartLayout = null; }
  function assumption(c) {
    if (!c) return '';
    if (c.kind === 'cagr') return `Compound annual growth: ${Number(c.annualRate) * 100}% per year`;
    if (c.kind === 'halving') return `Halves every ${c.periodYears} years`;
    if (c.kind === 'doubling') return `Doubles every ${c.periodYears} years`;
    return '';
  }
  function measure() {
    if (destroyed || !description || !expandButton) return;
    const isExpanded = expanded.has(model.selectedTrend?.id);
    if (isExpanded) { expandButton.hidden = false; return; }
    expandButton.hidden = !(description.scrollHeight > description.clientHeight + 1);
  }
  function placeRail(c) {
    if (destroyed || suspended || !rail || !c?.scales?.x || !c.chartArea) return;
    const focusedYear = rail.contains(doc.activeElement) ? Number(doc.activeElement.getAttribute('data-value')) : null;
    chartLayout = c; rail.replaceChildren();
    const groups = new Map();
    for (const row of model.evidence.all) {
      const x = c.scales.x.getPixelForValue(row.year);
      if (!Number.isFinite(x) || x < c.chartArea.left || x > c.chartArea.right) continue;
      if (!groups.has(row.year)) groups.set(row.year, []); groups.get(row.year).push(row);
    }
    // Merge nearby markers instead of allowing labels to overlap. Anchor each
    // group at the scale pixel of its first year; do not redistribute the scale.
    const clusters = [];
    for (const [year, rows] of [...groups].sort((a,b) => a[0] - b[0])) {
      const x = c.scales.x.getPixelForValue(year), last = clusters.at(-1);
      if (last && x - last.x < 120) { last.years.push(year); last.count += rows.length; }
      else clusters.push({ x, years: [year], count: rows.length });
    }
    rail.style.height = clusters.length ? '2.5rem' : '0px';
    for (const group of clusters) {
      const year = group.years[0], label = group.years.length > 1 ? `${year}–${group.years.at(-1)}` : String(year);
      const b = button(rail, group.count > 1 ? `${label} (${group.count})` : label, 'year', year);
      b.setAttribute('data-years', group.years.join(','));
      b.style.position = 'absolute'; b.style.left = `${group.x}px`; b.style.transform = 'translateX(-50%)';
      b.setAttribute('aria-label', `${label}: ${group.count} related ${group.count === 1 ? 'item' : 'items'}`);
      if (focusedYear != null && group.years.includes(focusedYear)) b.focus({preventScroll:true});
    }
  }
  function details(parent, row) {
    const d = appendText(parent, 'details', null); const s = appendText(d, 'summary', `${row.year} · ${row.kind} · ${row.headline}`);
    s.setAttribute('data-focus-key', `evidence:${row.id}`);
    d.open = openRows.has(row.id) || selectedRow === row.id || selectedYear?.includes(row.year);
    d.addEventListener('toggle', () => { if (d.open) openRows.add(row.id); else openRows.delete(row.id); });
    appendText(d, 'p', row.detail);
    appendText(d, 'p', `Claim band: ${row.claimBand} · ${Number(row.year) <= Number(snapshot.year) ? "At or before this quest's year" : "Ahead of this quest's year"}. Passing the date does not verify the claim.`);
    if (model.selectedTrend && (row.year < Math.min(model.selectedTrend.domain.start, Number(snapshot.year)) || row.year > Math.max(model.selectedTrend.domain.end, Number(snapshot.year)))) appendText(d, 'p', "Outside this chart's range");
    if (row.sourceNote) appendText(d, 'p', `Source note: ${row.sourceNote}`);
    if (row.attribution) {
      const a = row.attribution; const p = appendText(d, 'p', 'Attribution: ');
      if (a.url) link(p, a.name, a.url); else appendText(p, 'span', a.name);
      if (a.date) appendText(p, 'span', ` · ${a.date}`); if (a.quote) appendText(d, 'blockquote', a.quote);
    }
    if (row.scenarioGrant) {
      const grant = row.scenarioGrant;
      appendText(d, 'p', `Assumed premise: ${row.id}${grant.status ? ` · Status: ${grant.status}` : ''}${grant.scope ? ` · Scope: ${typeof grant.scope === 'string' ? grant.scope : JSON.stringify(grant.scope)}` : ''}${grant.limits ? ` · Limits: ${typeof grant.limits === 'string' ? grant.limits : JSON.stringify(grant.limits)}` : ''}`);
    }
    return s;
  }
  function renderEvidence() {
    if (!evidenceList) return;
    const focusKey = evidenceList.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-focus-key') : null;
    evidenceList.replaceChildren();
    if (model.bank.status !== 'available') { appendText(evidenceList, 'p', "This quest's prediction evidence is unavailable."); return; }
    const all = model.evidence.all;
    if (!all.length) { appendText(evidenceList, 'p', "No related dated predictions in this quest's active bank."); return; }
    appendText(evidenceList, 'h4', 'Related predictions and milestones');
    appendText(evidenceList, 'p', 'Related by technology; not measurements of this curve.');
    let rows = showAll ? all : model.evidence.nearest;
    if (selectedYear != null) rows = all.filter(r => selectedYear.includes(r.year) || rows.includes(r));
    if (selectedRow) rows = all.filter(r => r.id === selectedRow || rows.includes(r));
    for (const row of rows) details(evidenceList, row);
    if (all.length > 3) button(evidenceList, showAll ? 'Show fewer related evidence' : `Show all related evidence (${all.length})`, 'all');
    if (focusKey) for (const n of evidenceList.querySelectorAll('[data-focus-key]')) if (n.getAttribute('data-focus-key') === focusKey) { n.focus({preventScroll:true}); break; }
  }
  function renderChoices(choices) {
    const focusKey = choices.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-focus-key') : null;
    choices.replaceChildren();
    const trends = model.choices.filter(choice => choice.type === 'trend');
    const visible = showMoreTrends ? trends : trends.filter((choice, index) => index < 3 || choice.key === model.selectedChoice?.key);
    for (const choice of [...visible, ...model.choices.filter(choice => choice.type === 'predictions')]) {
      const b = button(choices, choice.label, 'choice', choice.key);
      b.setAttribute('aria-pressed', String(choice.key === model.selectedChoice?.key));
    }
    if (trends.length > 3) {
      const more = button(choices, showMoreTrends ? 'Show fewer trends' : `Show more trends (${trends.length})`, 'more-trends');
      more.setAttribute('aria-expanded', String(showMoreTrends));
    }
    if (focusKey) for (const n of choices.querySelectorAll('[data-focus-key]')) if (n.getAttribute('data-focus-key') === focusKey) { n.focus({preventScroll:true}); break; }
  }
  function render() {
    if (destroyed || suspended || !snapshot) return;
    const active = doc.activeElement; const focusKey = host.contains(active) ? active.getAttribute('data-focus-key') : null;
    const scrolls = []; for (let n = host; n; n = n.parentNode) if (typeof n.scrollTop === 'number') scrolls.push([n,n.scrollTop]);
    clearChart(); description = expandButton = rail = evidenceList = null;
    host.replaceChildren(); host.hidden = false;
    const header = appendText(host, 'div', null, 'capability-explorer-header');
    const headerTitle = appendText(header, 'div', null, 'capability-explorer-heading');
    appendText(headerTitle, 'strong', 'Capability outlook');
    appendText(headerTitle, 'span', [snapshot.focusedTechName || snapshot.focusedTechId || model.scope.techIds.join(', '), collapsed ? model.selectedChoice?.label : null, `Quest year: ${snapshot.year}`].filter(Boolean).join(' · '), 'capability-explorer-context');
    const toggle = button(header, collapsed ? 'Expand' : 'Collapse', 'collapse'); toggle.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) {
      const body = appendText(host, 'div', null, 'capability-explorer-body');
      if (model.status) {
        const status = typeof model.status === 'string' ? model.status : (model.status.catalog || model.status.catalogStatus || '');
        if (status === 'loading') appendText(body, 'p', 'Capability catalog is loading; available quest evidence is shown.');
        if (['error','failed','unavailable','stale'].includes(status)) { appendText(body, 'p', 'Capability catalog is unavailable or stale; available evidence is shown.'); if (retry) button(body, 'Retry catalog', 'retry'); }
      }
      if (!model.scope.techIds.length) appendText(body, 'p', 'Choose an emTech to explore its capabilities.');
      else if (!model.choices.length) appendText(body, 'p', 'Evidence coverage is unavailable for this technology; this does not mean it is impossible.');
      const choices = appendText(body, 'div', null, 'capability-explorer-choices');
      renderChoices(choices);
      const trend = model.selectedTrend;
      if (trend) {
        appendText(body, 'h3', trend.name, 'capability-explorer-title');
        appendText(body, 'p', `${trend.capability} · ${trend.unit} · ${trend.source === 'quest' ? 'Quest-authored' : 'Catalog reference'}`, 'capability-explorer-meta');
        appendText(body, 'p', `${assumption(trend.compounding)} · If this trend continues`, 'capability-explorer-assumption');
        if (model.currentYear.inDomain) appendText(body, 'p', `Model estimate at quest year ${snapshot.year}: ${formatTrendValue(model.currentYear.value, trend.unit)}`, 'capability-explorer-estimate');
        else appendText(body, 'p', `This trend covers ${trend.domain.start}–${trend.domain.end}; no projection is supplied for the current quest year.`, 'capability-explorer-estimate');
        const layout = appendText(body, 'div', null, 'capability-explorer-layout');
        const descCol = appendText(layout, 'div', null, 'capability-explorer-description');
        description = appendText(descCol, 'p', model.description, `capability-explorer-description-text${expanded.has(trend.id) ? '' : ' capability-explorer-description-text--clamped'}`); description.id = uid;
        expandButton = button(descCol, expanded.has(trend.id) ? 'Show less' : 'Read full description', 'description'); expandButton.setAttribute('aria-controls', uid); expandButton.setAttribute('aria-expanded', String(expanded.has(trend.id))); expandButton.hidden = true;
        const column = appendText(layout, 'div', null, 'capability-explorer-chart-column');
        const chartBox = appendText(column, 'div', null, 'capability-explorer-chart'); const canvas = appendText(chartBox, 'canvas', null); canvas.setAttribute('aria-label', `${trend.name} trend model`);
        rail = appendText(column, 'div', null, 'capability-explorer-rail');
        evidenceList = appendText(column, 'div', null); renderEvidence();
        const generation = activeGeneration;
        const year = Number(snapshot.year); const min = Number(trend.domain.start), max = Number(trend.domain.end);
        try { chart = mount(canvas, trend, { yearNow: year, nowLabel: 'Quest year', dashedModel: true, displayMin: Number.isFinite(year) ? Math.min(min,year) : min, displayMax: Number.isFinite(year) ? Math.max(max,year) : max, explorerTicks: true, onLayout(c) { if (!destroyed && generation === activeGeneration) placeRail(c); } }); } catch { chart = null; }
        if (chart) placeRail(chart); else appendText(chartBox, 'p', 'Chart unavailable');
        const milestones = appendText(body, 'details', null); appendText(milestones, 'summary', 'Authored milestones').setAttribute('data-focus-key', 'milestones');
        if (!trend.milestones?.length) appendText(milestones, 'p', 'No milestones supplied.');
        for (const m of trend.milestones || []) appendText(milestones, 'p', `${m.label} · ${m.date} · ${formatTrendValue(m.value, trend.unit)} · ${m.status}`);
        const sources = appendText(body, 'details', null); appendText(sources, 'summary', 'Sources').setAttribute('data-focus-key', 'sources');
        if (!model.sources.length) appendText(sources, 'p', 'No source link supplied');
        for (const source of model.sources) { const p = appendText(sources, 'p', null); link(p, source.label, source.url); }
        measure();
      } else if (model.scope.techIds.length) {
        if (model.selectedChoice?.type === 'predictions' && model.trends.length === 0) appendText(body, 'p', 'No plotted trend is supplied for this technology.');
        if (model.selectedChoice?.type === 'predictions' && model.evidence.all.length) {
          appendText(body, 'h4', 'Prediction timeline');
          const timeline = appendText(body, 'div', null, 'capability-explorer-choices');
          for (const year of new Set(model.evidence.all.map(row => row.year))) button(timeline, String(year), 'year', year);
        }
        evidenceList = appendText(body, 'div', null); renderEvidence();
      }
      appendText(body, 'p', 'Which changes matter for your idea—and when might they be enough?');
    }
    if (focusKey) for (const n of host.querySelectorAll('[data-focus-key]')) if (n.getAttribute('data-focus-key') === focusKey) { n.focus({preventScroll:true}); break; }
    for (const [n, top] of scrolls) n.scrollTop = top;
  }
  function viewFingerprint() {
    // Only rendered content matters: unrelated bank rows and other curves must
    // not tear down a chart during ordinary room/catalog refreshes.
    const { scope, choices, selectedChoice, selectedTrend, evidence, description, sources, currentYear, status, bank } = model;
    return JSON.stringify({ scope, choices, selectedChoice, selectedTrend, evidence, description, sources, currentYear, status, bankStatus: bank.status, year: snapshot.year, focusName: snapshot.focusedTechName, focusedTechId: snapshot.focusedTechId });
  }
  function update(next) {
    if (destroyed || !next) return;
    const wasSuspended = suspended;
    if (wasSuspended) resumeObservers();
    if (identity !== next.viewIdentity) { identity = next.viewIdentity; selections = new Map(); expanded = new Set(); openRows = new Set(); collapsed = false; showAll = false; showMoreTrends = false; selectedYear = selectedRow = null; fingerprint = null; }
    const oldScope = model?.scope.key;
    snapshot = next;
    const preliminary = buildCapabilityExplorerModel(snapshot);
    model = buildCapabilityExplorerModel(snapshot, selections.get(preliminary.scope.key));
    selections.set(model.scope.key, model.selectedChoice?.key);
    const key = viewFingerprint();
    if (!wasSuspended && key === fingerprint) { host.hidden = false; return; }
    fingerprint = key;
    if (oldScope !== model.scope.key) { showAll = false; showMoreTrends = false; selectedYear = selectedRow = null; }
    render();
  }
  function onClick(event) {
    let target = event.target; while (target && target !== host && !target.getAttribute?.('data-action')) target = target.parentNode;
    if (!target || target === host) return;
    const action = target.getAttribute('data-action'), value = target.getAttribute('data-value');
    if (action === 'retry') { retry?.(); return; }
    if (action === 'collapse') { collapsed = !collapsed; render(); return; }
    if (action === 'more-trends') { showMoreTrends = !showMoreTrends; renderChoices(target.parentNode); return; }
    if (action === 'choice') { selections.set(model.scope.key, value); model = buildCapabilityExplorerModel(snapshot, value); fingerprint = viewFingerprint(); showAll = false; selectedYear = selectedRow = null; render(); return; }
    if (action === 'description') {
      const id = model.selectedTrend.id; if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      const yes = expanded.has(id); description.className = `capability-explorer-description-text${yes ? '' : ' capability-explorer-description-text--clamped'}`;
      expandButton.textContent = yes ? 'Show less' : 'Read full description'; expandButton.setAttribute('aria-expanded', String(yes)); measure(); if (chartLayout) placeRail(chartLayout); return;
    }
    if (action === 'all') { showAll = !showAll; selectedYear = selectedRow = null; renderEvidence(); return; }
    if (action === 'year') { selectedYear = (target.getAttribute('data-years') || value).split(',').map(Number); selectedRow = null; renderEvidence(); }
  }
  host.addEventListener('click', onClick);
  const win = doc.defaultView || globalThis;
  const onFonts = () => { measure(); if (chartLayout) placeRail(chartLayout); };
  function resumeObservers() {
    suspended = false;
    if (typeof win.ResizeObserver === 'function') { resizeObserver = new win.ResizeObserver(() => { measure(); if (chartLayout) placeRail(chartLayout); }); resizeObserver.observe(host); }
    doc.fonts?.addEventListener?.('loadingdone', onFonts);
  }
  function suspend() {
    if (destroyed || suspended) return;
    suspended = true; clearChart(); resizeObserver?.disconnect(); resizeObserver = null;
    doc.fonts?.removeEventListener?.('loadingdone', onFonts);
    host.hidden = true;
  }
  function resume() { if (destroyed || !suspended) return; resumeObservers(); render(); }
  resumeObservers();
  return { update, suspend, resume, destroy() { if (destroyed) return; suspended = true; destroyed = true; clearChart(); resizeObserver?.disconnect(); doc.fonts?.removeEventListener?.('loadingdone', onFonts); host.removeEventListener('click', onClick); host.replaceChildren(); host.hidden = true; snapshot = model = identity = fingerprint = null; selections.clear(); expanded.clear(); openRows.clear(); } };
}
