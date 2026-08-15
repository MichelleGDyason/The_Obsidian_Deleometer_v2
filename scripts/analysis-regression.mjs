import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';

class ObsidianStubClass {}

const originalLoad = Module._load;
Module._load = function loadWithObsidianStub(request, parent, isMain) {
  if (request === 'obsidian') {
    return {
      App: ObsidianStubClass,
      Editor: ObsidianStubClass,
      MarkdownView: ObsidianStubClass,
      Modal: ObsidianStubClass,
      Notice: ObsidianStubClass,
      Plugin: ObsidianStubClass,
      PluginSettingTab: ObsidianStubClass,
      Setting: ObsidianStubClass,
      WorkspaceLeaf: ObsidianStubClass,
      ItemView: ObsidianStubClass,
      TFile: ObsidianStubClass,
      TFolder: ObsidianStubClass,
      Platform: { isMobileApp: false },
      parseYaml: () => ({}),
      requestUrl: async () => ({ status: 200, headers: {}, json: {}, text: '' })
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const pluginModule = require('../main.js');
const DeleometerPlugin = pluginModule.default || pluginModule;
const plugin = Object.create(DeleometerPlugin.prototype);

plugin.settings = {
  selectedPerspectives: [
    'lacanian_perspective',
    'jungian_perspective',
    'phenomenology_perspective'
  ],
  outputLanguage: 'english'
};

function countHorizontalRules(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line))
    .length;
}

function writeStatus(content, status) {
  const statusMarkdown = plugin.buildAnalysisStatusMarkdown(status);
  const analysisStart = plugin.findAnalysisSectionStart(content);
  return analysisStart !== -1
    ? `${content.slice(0, analysisStart).trimEnd()}${statusMarkdown}`
    : `${content.trimEnd()}${statusMarkdown}`;
}

let statusDocument = [
  '# Regression journal',
  '',
  'A short entry about postponing a difficult message.'
].join('\n');

for (const status of [
  'Analysis started.',
  'Analyzing chronological sequence, batch 1/1...',
  'Recovering omitted perspective: Lacanian Psychoanalysis...',
  'Analysis could not be completed: sample failure'
]) {
  statusDocument = writeStatus(statusDocument, status);
}

assert.equal(
  statusDocument.match(/^##\s+.*AI Analysis.*$/gm)?.length || 0,
  1,
  'status updates should leave one AI Analysis heading'
);
assert.ok(
  countHorizontalRules(statusDocument) <= 1,
  'status updates should not accumulate horizontal rules'
);
assert.match(statusDocument, /sample failure/, 'failure status should remain visible');

const separatorHeavyDocument = [
  '# Regression journal',
  '',
  'A short entry.',
  '',
  ...Array.from({ length: 713 }, () => '---\n'),
  '## 🔍 AI Analysis',
  '',
  '*Status: stale failure*'
].join('\n');
const cleanedSeparatorDocument = writeStatus(separatorHeavyDocument, 'Retrying once.');
assert.equal(
  countHorizontalRules(cleanedSeparatorDocument),
  1,
  'a status update should collapse a pre-existing separator explosion'
);
assert.equal(
  cleanedSeparatorDocument.match(/^##\s+.*AI Analysis.*$/gm)?.length || 0,
  1,
  'a status update should leave one heading after cleaning a separator explosion'
);

const rawSections = plugin.extractRawPerspectiveAnalyses(
  [
    '### Lacanian Psychoanalysis',
    'The delayed message is read through desire, address, and the Other.',
    '',
    '### Jungian Analysis',
    'The hesitation marks a threshold where shadow material can be approached.'
  ].join('\n'),
  [
    { key: 'lacanian_perspective', perspective: { title: 'Lacanian Psychoanalysis' } },
    { key: 'jungian_perspective', perspective: { title: 'Jungian Analysis' } }
  ]
);

assert.ok(rawSections.lacanian_perspective?.trim(), 'raw headed prose should recover Lacanian text');
assert.ok(rawSections.jungian_perspective?.trim(), 'raw headed prose should recover Jungian text');

const rawFallback = plugin.extractRawPerspectiveAnalyses(
  'The model returned plain prose rather than JSON, but it is still useful analysis.',
  [
    { key: 'phenomenology_perspective', perspective: { title: 'Phenomenology' } },
    { key: 'jungian_perspective', perspective: { title: 'Jungian Analysis' } }
  ]
);

assert.ok(
  rawFallback.phenomenology_perspective?.trim(),
  'plain raw prose should be retained under the first intended perspective'
);

const providerFailure = Object.assign(new Error('quota exceeded'), {
  provider: 'openai',
  status: 429
});
let fallbackRequestCount = 0;
plugin.hasAIProviderConfigured = () => true;
plugin.prepareJournalContentForAnalysis = async (content) => content;
plugin.getPersonalityContextForAI = () => '';
plugin.getAuthorMemoryContextForAI = () => '';
plugin.getReaderContextPrompt = () => '';
plugin.getLocalDateContext = () => '';
plugin.getChronologicalPerspectiveAnalysis = async () => {
  throw providerFailure;
};
plugin.getSingleGeneratedPerspectiveAnalysis = async () => {
  fallbackRequestCount += 1;
  return { analysis: '', furtherReadings: [] };
};

await assert.rejects(
  plugin.getMultiPerspectiveAnalysis('A short entry.'),
  (error) => error === providerFailure,
  'systemic provider failures should be surfaced directly'
);
assert.equal(
  fallbackRequestCount,
  0,
  'systemic provider failures should not trigger one retry per perspective'
);

const markdown = plugin.buildAnalysisMarkdown({
  perspectives: {
    lacanian_perspective: 'The message becomes a scene of address, desire, and risk.',
    freudian_psychoanalysis: 'The delay can be read through conflict, repression, and compromise formation.',
    nietzschean_perspective: 'The entry tests inherited values against an emerging way of living.',
    second_testament_christian_interpretation: 'The entry can be read through grace, relation, and transformation.',
    platonic_perspective: 'The entry moves dialectically between appearance, desire, and a possible good.',
    pagan_interpretation: 'Seasonal and land-based relations place the decision within cycles and reciprocity.',
    irigarayian_perspective: 'Sexuate difference asks how relation can preserve difference without hierarchy.',
    jungian_perspective: '',
    phenomenology_perspective: '   '
  },
  furtherReadings: {
    lacanian_perspective: ['Jacques Lacan, Ecrits - for desire and speech.'],
    jungian_perspective: ['This should not render because the analysis is blank.']
  },
  groupSyntheses: {
    psychoanalytic_clinical: ''
  },
  philosophicalReaccumulation: '',
  inspirationalSong: null,
  authorMemorySummary: '',
  goalSuggestions: [],
  analysisWarnings: ['  Parser fallback used sample raw text.  ', '']
}, 'Regression journal.md');

assert.match(markdown, /### Lacanian Psychoanalysis/, 'non-empty perspective should render');
assert.match(markdown, /### Luce Irigaray's Sexuate Difference/, 'Irigaray should render with the Sexuate Difference title');
assert.doesNotMatch(markdown, /### Jungian Analysis/, 'blank perspective should not render');
assert.doesNotMatch(markdown, /### Phenomenology/, 'whitespace-only perspective should not render');
assert.ok(countHorizontalRules(markdown) <= 1, 'analysis markdown should not contain repeated rules');
assert.match(markdown, /Parser fallback used sample raw text/, 'non-empty warning should render once');
assert.match(markdown, /Period: .*Family:/, 'perspectives should display temporal and family context');
assert.ok(
  markdown.indexOf('### Pagan Interpretation') < markdown.indexOf('### Second Testament / Christian Interpretation'),
  'pagan interpretation should precede the Second Testament in chronology'
);
assert.ok(
  markdown.indexOf('### Platonic Philosophy') < markdown.indexOf('### Second Testament / Christian Interpretation'),
  'Plato should precede the Second Testament in chronology'
);
assert.ok(
  markdown.indexOf('### Nietzschean Philosophy') < markdown.indexOf('### Freudian Psychoanalysis')
    && markdown.indexOf('### Freudian Psychoanalysis') < markdown.indexOf('### Lacanian Psychoanalysis'),
  'Nietzsche, Freud, and Lacan should retain chronological order'
);

const temporalMarkdown = plugin.buildAnalysisMarkdown({
  perspectives: {
    kierkegaard_existential_faith: 'Kierkegaard reads inwardness, anxiety, and choice through the task of becoming a self.',
    nietzschean_perspective: 'Nietzsche asks how inherited values were made and whether they can be overcome.'
  },
  furtherReadings: {},
  perspectiveSongs: {},
  groupSyntheses: {},
  philosophicalReaccumulation: '',
  inspirationalSong: null,
  authorMemorySummary: '',
  goalSuggestions: [],
  analysisWarnings: []
}, 'Temporal regression.md');
assert.match(temporalMarkdown, /1843 CE \(Either\/Or and Fear and Trembling\)/, 'Kierkegaard should display an exact chronology anchor');
assert.match(temporalMarkdown, /1872 CE \(The Birth of Tragedy/, 'Nietzsche should display an exact chronology anchor');
assert.ok(
  temporalMarkdown.indexOf('### Søren Kierkegaard') < temporalMarkdown.indexOf('### Nietzschean Philosophy'),
  'Kierkegaard should appear before Nietzsche in the historical sequence'
);

const druidicAnalysis = plugin.ensureDruidicBardicCoda(
  'The Druidic frame notices the entry\'s relation to land and memory.',
  'I keep returning to the river and the old oak.'
);
assert.match(druidicAnalysis, /Bardic Coda/, 'Druidic analysis should always end with a bardic coda');
assert.match(druidicAnalysis, /river|oak/i, 'the bardic coda should borrow images from the journal entry');

const readingPerspectives = [
  { key: 'hermeneutics_perspective', perspective: { title: 'Hermeneutics' } },
  { key: 'ralph_waldo_emerson_environmental_thought', perspective: { title: "Ralph Waldo Emerson's Environmental Thought" } }
];
const hermeneuticsReadings = plugin.completePerspectiveFurtherReadings(
  'hermeneutics_perspective',
  ['Ralph Waldo Emerson, Nature — a nearby environmental reading.', 'Hans-Georg Gadamer, Truth and Method — interpretation as dialogue.'],
  readingPerspectives
);
assert.ok(hermeneuticsReadings.length >= 3, 'Hermeneutics should receive a complete reading set');
assert.ok(!hermeneuticsReadings.some((reading) => /Emerson/i.test(reading)), 'Hermeneutics readings should reject Emerson contamination');
assert.ok(hermeneuticsReadings.some((reading) => /Gadamer/i.test(reading)), 'Hermeneutics readings should retain relevant suggestions');

const fallbackSong = plugin.buildFallbackInspirationalSong(
  'I felt fear, grief, doubt, loss, and darkness, but I want to begin again.',
  'The entry finds a practical opening toward a different future.'
);
assert.equal(fallbackSong.scaleMode, 'major', 'inspirational fallback audio should resolve in a major key');
assert.equal(fallbackSong.chordProgression.length, 4, 'inspirational fallback should provide a complete progression');

const accidentalSong = plugin.parseInspirationalSong({
  title: 'Windows Open',
  rationale: 'A bright song that gathers momentum through a rising refrain.',
  mood: 'warm and expansive',
  tempo_bpm: 108,
  key_center: 'E♭',
  scale_mode: 'major',
  chord_progression: ['E♭', 'B♭', 'Cm', 'A♭'],
  motif_degrees: [1, 2, 3, 5, 6, 5, 3, 1],
  hook_line: 'Open the windows to the morning',
  lyrics: 'Verse\nA different line of light arrives\n\nChorus\nOpen the windows to the morning'
});
assert.equal(accidentalSong?.keyCenter, 'Eb', 'flat key centres should be normalized and preserved');
assert.deepEqual(
  accidentalSong?.chordProgression,
  ['Eb', 'Bb', 'Cm', 'Ab'],
  'flat-root chords should be normalized and preserved'
);
assert.equal(plugin.parseSimpleChord('F#m').root, 'F#', 'sharp-root minor chords should parse');
assert.equal(plugin.parseSimpleChord('Bbsus4').quality, 'sus4', 'suspended flat-root chords should parse');

const correctedInspirationalHarmony = plugin.resolveInspirationalSongHarmony({
  ...fallbackSong,
  keyCenter: 'D',
  scaleMode: 'minor',
  chordProgression: ['Dm', 'Bb', 'F', 'C']
});
assert.equal(correctedInspirationalHarmony.scaleMode, 'major', 'inspirational songs should not retain a minor tonal centre');
assert.deepEqual(
  correctedInspirationalHarmony.chordProgression,
  ['D', 'A', 'Bm', 'G'],
  'minor inspirational harmony should be replaced with a coherent major-key progression'
);

plugin.createAIChatCompletion = async () => JSON.stringify({ title: 'Partial response' });
const recoveredDruidicSong = await plugin.getPerspectiveSong(
  'The river, oak, and returning path stayed with me.',
  'druidic_interpretation',
  'The entry asks how land, memory, and oral relation can support a renewed step.'
);
assert.ok(recoveredDruidicSong.lyrics.trim(), 'an incomplete AI song response should still produce lyrics');
assert.match(recoveredDruidicSong.lyrics, /Bardic Refrain|Bardic Coda/, 'a recovered Druidic song should contain a bardic section');

const previewSongA = {
  ...fallbackSong,
  title: 'First New Morning',
  lyrics: 'Verse\nThe first path opens.\n\nChorus\nCarry the morning forward.'
};
const previewSongB = {
  ...previewSongA,
  lyrics: 'Verse\nA second path bends toward the sea.\n\nChorus\nLet a different rhythm carry me.'
};
const previewA = Buffer.from(plugin.renderInspirationalSongWav(previewSongA));
const repeatedPreviewA = Buffer.from(plugin.renderInspirationalSongWav(previewSongA));
const previewB = Buffer.from(plugin.renderInspirationalSongWav(previewSongB));
assert.equal(Buffer.compare(previewA, repeatedPreviewA), 0, 'the same saved song should reproduce the same synthesized preview');
assert.notEqual(Buffer.compare(previewA, previewB), 0, 'new song material should synthesize a newly arranged musical preview');
let accumulatedSampleDifference = 0;
let comparedSampleCount = 0;
for (let offset = 44; offset + 1 < Math.min(previewA.length, previewB.length); offset += 2) {
  accumulatedSampleDifference += Math.abs(previewA.readInt16LE(offset) - previewB.readInt16LE(offset));
  comparedSampleCount += 1;
}
assert.ok(
  accumulatedSampleDifference / comparedSampleCount > 500,
  'new song previews should be materially different, not merely byte-distinct'
);
assert.equal(previewA.toString('ascii', 0, 4), 'RIFF', 'song previews should remain valid WAV files');
assert.equal(previewA.readUInt32LE(24), 22050, 'song previews should retain the expected sample rate');

console.log('analysis regression checks passed');
