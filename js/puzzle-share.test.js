import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puzzleSnapshot, puzzleBoardBounds, wrapText, puzzleBriefBlocks, puzzleDeltaColor, puzzleMeter, puzzleHasPendingEvaluation } from './puzzle-share.js';
import { seedCrisisTiles, mintInventionTile } from './hex/board-state.js';
import { pathwayContentFingerprint, setIslandHow } from './hex/evaluate.js';

function fixture() {
  const mission = { title: 'The next move', briefMd: '## Your job\n\nKeep the town dry.', pressure: { Floods: 3 }, pressureDesc: { Floods: 'Water enters homes.' }, winMax: { Floods: 1 } };
  let board = seedCrisisTiles(mission);
  board.tiles.a = mintInventionTile({ id: 'a', techId: 'ai', name: 'Flood forecast', q: 0, r: 3 });
  board.tiles.tray = mintInventionTile({ id: 'tray', name: 'Spare idea' });
  board = setIslandHow(board, [board.tiles.a], 'Forecast the crest and warn households.', 'user');
  const fp = pathwayContentFingerprint([board.tiles.a], board);
  board.pathwayImpacts[fp] = { inventionIds: ['a'], pending: false, crisisDelta: { local: -2 }, crisisReasons: { local: 'Warnings give households time to move their belongings. '.repeat(20) } };
  return { mission, board, pressure: { Floods: 1 }, year: 2030, turn: 2 };
}

test('snapshot preserves all tiles, live pressure, targets, full rationale and matching pathway', () => {
  const source = fixture(), before = JSON.stringify(source);
  const snap = puzzleSnapshot(source);
  assert.equal(snap.tiles.length, 3);
  assert.equal(snap.tiles.find(t => t.id === 'tray').q, null);
  assert.equal(snap.crises[0].value, 1);
  assert.equal(snap.crises[0].goal, 1);
  assert.equal(snap.crises[0].description, 'Water enters homes.');
  assert.equal(snap.crises[0].scores[0].delta, -2);
  assert.equal(snap.crises[0].scores[0].label, 'ai');
  assert.equal(snap.paths[0].label, 'ai');
  assert.ok(snap.crises[0].scores[0].reason.length > 500);
  assert.equal(snap.paths[0].howText, 'Forecast the crest and warn households.');
  assert.match(snap.briefing, /Keep the town dry/);
  assert.equal(JSON.stringify(source), before);
});

test('pending scores do not export stale rationale or relief', () => {
  const source = fixture();
  Object.values(source.board.pathwayImpacts)[0].pending = true;
  const row = puzzleSnapshot(source).crises[0].scores[0];
  assert.equal(row.pending, true);
  assert.equal(row.reason, '');
  assert.equal(row.delta, 0);
});

test('multi-emTech labels match between pathway descriptions and crisis scores', () => {
  const source = fixture();
  source.board.tiles.a.techId = 'si';
  source.board.tiles.a.polarity = 'bits';
  source.board.tiles.b = mintInventionTile({ id: 'b', techId: 'computing', polarity: 'bits', q: -1, r: 3 });
  const snap = puzzleSnapshot(source);
  assert.equal(snap.paths.length, 1);
  assert.equal(snap.paths[0].label, 'si · computing');
  assert.equal(snap.crises[0].scores[0].label, snap.paths[0].label);
});

test('pathway descriptions fall back to member inventions when no combined essay exists', () => {
  const source = fixture();
  source.board.islandHow = {};
  source.board.tiles.a.howText = 'Sensors warn households before the crest arrives.';
  assert.equal(puzzleSnapshot(source).paths[0].howText, source.board.tiles.a.howText);
});

test('empty position and absent meter values remain explicit', () => {
  assert.deepEqual(puzzleSnapshot({}).tiles, []);
  const source = fixture();
  source.pressure = {};
  assert.equal(puzzleSnapshot(source).crises[0].value, null);
});

test('wrapping preserves paragraphs and splits long tokens without truncation', () => {
  const ctx = { measureText: text => ({ width: text.length }) };
  const lines = wrapText(ctx, 'A short line\n\nabcdefghijklmnop', 7);
  assert.ok(lines.every(line => line.length <= 7));
  assert.ok(lines.includes(''));
  assert.equal(lines.join('').replaceAll(' ', ''), 'Ashortlineabcdefghijklmnop');
});

test('board crop includes occupied hexes outside the viewport and excludes tray tiles', () => {
  assert.equal(puzzleBoardBounds([{ q: null, r: null }]), null);
  const one = puzzleBoardBounds([{ q: 0, r: 0 }]);
  assert.ok(one.width < 250 && one.height < 250);
  assert.deepEqual(puzzleBoardBounds([{ q: 0, r: 0 }, { q: null, r: null }]), one);
  const distant = puzzleBoardBounds([{ q: -12, r: -4 }, { q: 20, r: 12 }]);
  assert.ok(distant.x < 0 && distant.y < 0);
  assert.ok(distant.width > 1400 && distant.height > 900);
});

test('render snapshot retains artwork and timing and cannot follow later board edits', () => {
  const source = fixture();
  source.board.tiles.a.artUrl = '/tile.png';
  source.board.tiles.a.feasibilityPct = 85;
  const snap = puzzleSnapshot(source);
  source.board.tiles.a.q = 9;
  source.board.tiles.a.artUrl = '/changed.png';
  assert.equal(snap.renderBoard.tiles.a.q, 0);
  assert.equal(snap.renderBoard.tiles.a.artUrl, '/tile.png');
  assert.equal(snap.renderBoard.tiles.a.feasibilityPct, 85);
});

test('title light follows coverage, bonds and timing, including all three colors', () => {
  const source = fixture();
  const crisis = source.board.tiles['crisis-local'];
  const idea = source.board.tiles.a;
  crisis.lamp = 'green';
  idea.feasibilityPct = 95;
  assert.deepEqual(puzzleSnapshot(source).evaluation, { level: 'green', pending: false });
  crisis.lamp = 'yellow';
  assert.equal(puzzleSnapshot(source).evaluation.level, 'yellow');
  crisis.lamp = 'red';
  assert.equal(puzzleSnapshot(source).evaluation.level, 'red');
  crisis.lamp = 'green';
  idea.feasibilityPct = 10;
  assert.equal(puzzleSnapshot(source).evaluation.level, 'red');
  idea.feasibilityPct = 95;
  idea.q = -10;
  assert.equal(puzzleSnapshot(source).evaluation.level, 'red');
});

test('pending title light matches the app last settled color', () => {
  const source = fixture();
  source.board.tiles.a.timingPending = true;
  source.lastFeasibilityLightLevel = 'green';
  assert.deepEqual(puzzleSnapshot(source).evaluation, { level: 'green', pending: true });
});

test('briefing preserves heading, paragraph and list structure', () => {
  assert.deepEqual(puzzleBriefBlocks('## The place\n\nA **busy** town.\n\n## Your job\n\n- Keep homes dry.\n- Protect jobs.'), [
    { type: 'heading', text: 'The place' }, { type: 'paragraph', text: 'A busy town.' },
    { type: 'heading', text: 'Your job' }, { type: 'bullet', text: 'Keep homes dry.' },
    { type: 'bullet', text: 'Protect jobs.' },
  ]);
});

test('crisis dots use HUD thresholds, including absent or non-default goals', () => {
  assert.deepEqual(puzzleMeter(1, null), { value: 1, color: '#6ee7b7' });
  assert.equal(puzzleMeter(1, 0).color, '#fbbf24');
  assert.equal(puzzleMeter(4, 1).color, '#f87171');
  assert.equal(puzzleMeter(4, 4).color, '#6ee7b7');
  assert.equal(puzzleMeter(8, 1).value, 5);
  assert.equal(puzzleMeter(null, 1).value, null);
});

test('delta colors distinguish easing, zero, worsening and pending', () => {
  assert.equal(puzzleDeltaColor(-1), '#6ee7b7');
  assert.equal(puzzleDeltaColor(0), '#edf3f6');
  assert.equal(puzzleDeltaColor(1), '#f87171');
  assert.equal(puzzleDeltaColor(-1, true), '#a8bac7');
});

test('share gating waits for live scores and tile work, but not empty boards or obsolete scores', () => {
  assert.equal(puzzleHasPendingEvaluation(null), false);
  const source = fixture();
  assert.equal(puzzleHasPendingEvaluation(source.board), false);
  const impact = Object.values(source.board.pathwayImpacts)[0];
  impact.pending = true;
  assert.equal(puzzleHasPendingEvaluation(source.board), true);
  impact.pending = false;
  impact.concernsPending = true;
  assert.equal(puzzleHasPendingEvaluation(source.board), true);
  impact.concernsPending = false;
  source.board.pathwayImpacts.obsolete = { pending: true };
  assert.equal(puzzleHasPendingEvaluation(source.board), false);
  for (const flag of ['timingPending', 'lampPending', 'verdictPending', 'answerPending']) {
    source.board.tiles.a[flag] = true;
    assert.equal(puzzleHasPendingEvaluation(source.board), true);
    source.board.tiles.a[flag] = false;
    assert.equal(puzzleHasPendingEvaluation(source.board), false);
  }
});
