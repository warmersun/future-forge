import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCapabilityExplorer } from './capability-explorer.js';

class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.attributes = {}; this.style = {}; this.hidden = false; this.parentNode = null; this.scrollTop = 0; this.scrollHeight = 100; this.clientHeight = 50; this._text = ''; this.className = ''; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  append(...nodes) { for (const n of nodes) { n.parentNode = this; this.children.push(n); } }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  setAttribute(k,v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  addEventListener(k,f) { (this.events ||= {})[k] = f; }
  removeEventListener(k) { delete this.events?.[k]; }
  contains(n) { return n === this || this.children.some(c => c.contains(n)); }
  focus() { this.ownerDocument.activeElement = this; }
  querySelectorAll(selector) { const result = []; const visit = e => { for (const c of e.children) { if (selector === '[data-focus-key]' && c.getAttribute('data-focus-key')) result.push(c); visit(c); } }; visit(this); return result; }
}
function setup() { const doc = { createElement(tag) { return new Element(tag, this); }, activeElement: null }; const host = doc.createElement('section'); host.hidden = true; return {doc, host}; }
function find(root, text) { if (root.tagName === 'BUTTON' && root.textContent === text) return root; for (const c of root.children) { const r = find(c, text); if (r) return r; } return null; }
function click(host, el) { host.events.click({ target: el }); }
const trend = JSON.parse(readFileSync(new URL('../test/fixtures/trends/gene-seq-cost-per-genome.json', import.meta.url)));
const summary = '<img src=x onerror=alert(1)> ' + 'Long descriptive text '.repeat(35);
const row = (id,year) => ({ id, year, kind:'prediction', headline:id, detail:`Detail ${id}`, claimBand:'near', techIds:['gene-sequencing'] });
const bank = { schema:'future-forge.predictions/v1', id:'test', title:'Test', attribution:{name:'Bank author',url:'https://example.com'}, predictions:[row('a',2027),row('b',2027),row('c',2030),row('d',2040)] };
const snapshot = { viewIdentity:'run-seat', mission:{}, focusedTechId:'gene-sequencing', catalogTrends:[{...trend,summary}], ambientBank:bank, year:2028 };

test('renders text, manages one chart, local controls and idempotent updates', () => {
  const {host} = setup(); let mounts=0, destroys=0, opts;
  const explorer = createCapabilityExplorer(host,{ mountChart(canvas,t,o){ mounts++; opts=o; return { scales:{x:{getPixelForValue:y=>y*2}},chartArea:{left:4010,right:4080} }; }, destroyChart(){ destroys++; }});
  explorer.update(snapshot); assert.equal(host.hidden,false); assert.ok(host.textContent.includes(summary)); assert.equal(mounts,1); assert.equal(opts.nowLabel,'Quest year'); assert.equal(opts.dashedModel,true);
  explorer.update({...snapshot, unrelated:'changed'}); assert.equal(mounts,1);
  assert.ok(find(host,'Read full description')); click(host,find(host,'Read full description')); assert.ok(find(host,'Show less')); assert.equal(mounts,1);
  click(host,find(host,'Collapse')); assert.equal(destroys,1); click(host,find(host,'Expand')); assert.equal(mounts,2);
  explorer.destroy(); assert.equal(destroys,2);
});

test('discloses predictions, grouped markers, attribution and outside range', () => {
  const {host} = setup(); let layout;
  const explorer=createCapabilityExplorer(host,{mountChart(c,t,o){ layout=o.onLayout; return {scales:{x:{getPixelForValue:y=>y*2}},chartArea:{left:4010,right:4072}}; },destroyChart(){}});
  explorer.update(snapshot); layout({scales:{x:{getPixelForValue:y=>y*2}},chartArea:{left:4010,right:4072}});
  const marker=find(host,'2027–2030 (3)'); assert.ok(marker); assert.equal(marker.style.left,'4054px');
  click(host,marker); assert.ok(host.textContent.includes('Detail a')); assert.ok(host.textContent.includes('Bank author'));
  click(host,find(host,'Show all related evidence (4)')); assert.ok(host.textContent.includes("Outside this chart's range"));
  assert.ok(host.textContent.includes('Related by technology; not measurements of this curve.'));
  explorer.destroy();
});


test('retains per-scope selection and expansion, resets on a new view, and updates changed content', () => {
  const {host,doc} = setup(); let mounts=0;
  const second={...trend,id:'second',name:'Second curve',summary:'Second description'};
  const explorer=createCapabilityExplorer(host,{mountChart(){mounts++; return {};},destroyChart(){}});
  const snap={...snapshot,catalogTrends:[trend,second]}; explorer.update(snap);
  const b=find(host,'Second curve'); b.focus(); click(host,b); assert.ok(host.textContent.includes('Second description')); assert.equal(doc.activeElement.textContent,'Second curve');
  click(host,find(host,'Read full description'));
  explorer.update({...snap,year:2029}); assert.ok(find(host,'Show less'));
  explorer.update({...snap,focusedTechId:'other'}); explorer.update(snap); assert.ok(find(host,'Show less')); assert.ok(host.textContent.includes('Second description'));
  explorer.update({...snap,catalogTrends:[trend,{...second,summary:'Changed same ID'}]}); assert.ok(host.textContent.includes('Changed same ID'));
  explorer.update({...snap,viewIdentity:'new-run'}); assert.ok(!find(host,'Show less')); explorer.destroy(); assert.ok(mounts>=4);
});

test('handles prediction-only, unavailable charts and banks, and explicit retry', () => {
  const {host} = setup(); let retries=0;
  const explorer=createCapabilityExplorer(host,{mountChart(){throw Error('canvas');},retry(){retries++;}});
  explorer.update({...snapshot,status:'error'}); assert.ok(host.textContent.includes('Chart unavailable')); assert.ok(host.textContent.includes('$1,000 genome')); click(host,find(host,'Retry catalog')); assert.equal(retries,1);
  explorer.update({...snapshot,catalogTrends:[]}); assert.ok(host.textContent.includes('No plotted trend is supplied')); assert.ok(!host.textContent.includes('Chart unavailable'));
  explorer.update({...snapshot,mission:{predictionBankId:'bound'},ambientBank:bank}); assert.ok(host.textContent.includes("This quest's prediction evidence is unavailable")); assert.ok(!host.textContent.includes('Detail a'));
  explorer.update({...snapshot,focusedTechId:null,selectedTechIds:[]}); assert.ok(host.textContent.includes('Choose an emTech'));
  explorer.destroy();
});

test('ignores unrelated bank content and displays only explicitly granted premise', () => {
  const {host} = setup(); let mounts=0;
  const premise={mode:'assumed',bankId:'test',grants:[{predictionId:'a',scope:'local',limits:'limited'}]};
  const snap={...snapshot,mission:{companion:{exploration:{premise}}},scenarioPremise:premise,pinnedPredictionsBank:bank};
  const explorer=createCapabilityExplorer(host,{mountChart(){mounts++; return {};},destroyChart(){}}); explorer.update(snap);
  assert.ok(host.textContent.includes('Assumed premise: a · Status: due · Scope: local · Limits: limited')); assert.ok(!host.textContent.includes('Assumed premise: b'));
  const unrelated={...bank,predictions:[...bank.predictions,{...row('other',2028),techIds:['other']}]};
  explorer.update({...snap,pinnedPredictionsBank:unrelated}); assert.equal(mounts,1);
  explorer.destroy();
});

test('related predictions does not deny available trends and controls retain focus', () => {
  const {host,doc}=setup(); let onLayout;
  const chart={scales:{x:{getPixelForValue:y=>(y-2000)*50}},chartArea:{left:0,right:2000}};
  const explorer=createCapabilityExplorer(host,{mountChart(c,t,o){onLayout=o.onLayout; return chart;},destroyChart(){}});
  explorer.update(snapshot);
  const all=find(host,'Show all related evidence (4)'); all.focus(); click(host,all);
  assert.equal(doc.activeElement.textContent,'Show fewer related evidence');
  const marker=find(host,'2027 (2)'); marker.focus(); onLayout(chart);
  assert.equal(doc.activeElement.textContent,'2027 (2)'); assert.notEqual(doc.activeElement,marker);
  click(host,find(host,'Related predictions'));
  assert.ok(!host.textContent.includes('No plotted trend is supplied'));
  explorer.destroy();
});

test('many capabilities use progressive disclosure without hiding the selected choice or predictions', () => {
  const {host, doc} = setup();
  const trends = Array.from({length: 7}, (_, i) => ({...trend, id:`curve-${i}`, name:`Curve ${i}`}));
  const explorer = createCapabilityExplorer(host, { mountChart(){ return {}; }, destroyChart(){} });
  explorer.update({...snapshot, catalogTrends:trends});
  assert.ok(find(host, 'Related predictions'));
  assert.ok(!find(host, 'Curve 6'));
  const more = find(host, 'Show more trends (7)'); assert.ok(more); more.focus(); click(host, more);
  assert.equal(doc.activeElement.textContent, 'Show fewer trends');
  click(host, find(host, 'Curve 6'));
  assert.equal(find(host, 'Curve 6').getAttribute('aria-pressed'), 'true');
  click(host, find(host, 'Show fewer trends'));
  assert.ok(find(host, 'Curve 6')); assert.ok(!find(host, 'Curve 5'));
  click(host, find(host, 'Collapse')); click(host, find(host, 'Expand'));
  assert.ok(find(host, 'Curve 6')); assert.ok(find(host, 'Related predictions'));
  explorer.destroy();
});

test('prediction-only evidence has a chronological, selectable timeline', () => {
  const {host} = setup();
  const explorer = createCapabilityExplorer(host, { mountChart(){ throw Error('must not chart'); } });
  explorer.update({...snapshot, catalogTrends:[]});
  assert.ok(host.textContent.includes('Prediction timeline'));
  const marker = find(host, '2040'); assert.ok(marker);
  click(host, marker); assert.ok(host.textContent.includes('Detail d'));
  explorer.destroy();
});

test('selected choices have a visible non-color indicator and source focus survives updates', () => {
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.capability-explorer-choices\s+button\[aria-pressed=["']true["']\]::before/);
  const {host, doc} = setup();
  const explorer = createCapabilityExplorer(host, { mountChart(){ return {}; }, destroyChart(){} });
  explorer.update(snapshot);
  const summaries = [];
  const walk = node => { if (node.tagName === 'SUMMARY' && node.textContent === 'Sources') summaries.push(node); node.children.forEach(walk); };
  walk(host); summaries[0].focus(); explorer.update({...snapshot, year:2029});
  assert.equal(doc.activeElement.textContent, 'Sources');
  assert.notEqual(doc.activeElement, summaries[0]);
  explorer.destroy();
});

test('suspend releases chart and observers while update or resume restores run-local state', () => {
  const {host,doc}=setup(); let mounts=0, destroys=0, observes=0, disconnects=0, fonts=0, unfonts=0, callback;
  doc.defaultView={ResizeObserver:class { constructor(cb){callback=cb;} observe(){observes++;} disconnect(){disconnects++;} }};
  doc.fonts={addEventListener(){fonts++;},removeEventListener(){unfonts++;}};
  const explorer=createCapabilityExplorer(host,{mountChart(){mounts++;return {};},destroyChart(){destroys++;}});
  const second={...trend,id:'second',name:'Second curve',summary};
  const snap={...snapshot,catalogTrends:[trend,second]};
  explorer.update(snap); click(host,find(host,'Second curve')); click(host,find(host,'Read full description'));
  explorer.suspend(); explorer.suspend(); assert.equal(host.hidden,true); assert.equal(disconnects,1); assert.equal(unfonts,1);
  const before=mounts; callback(); assert.equal(mounts,before);
  explorer.update(snap); assert.equal(host.hidden,false); assert.equal(mounts,before+1); assert.ok(find(host,'Show less')); assert.ok(host.textContent.includes('Second curve'));
  click(host,find(host,'Collapse')); explorer.suspend(); explorer.resume(); assert.equal(host.hidden,false); assert.ok(find(host,'Expand'));
  explorer.suspend(); explorer.update({...snap,viewIdentity:'different'}); assert.ok(find(host,'Collapse')); assert.ok(!find(host,'Show less'));
  explorer.destroy(); assert.equal(host.hidden,true); assert.equal(destroys,mounts); assert.equal(disconnects,observes); assert.equal(unfonts,fonts);
  explorer.update(snap); explorer.resume(); assert.equal(host.hidden,true);
});
