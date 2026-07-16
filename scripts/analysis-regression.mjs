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
assert.doesNotMatch(markdown, /### Jungian Analysis/, 'blank perspective should not render');
assert.doesNotMatch(markdown, /### Phenomenology/, 'whitespace-only perspective should not render');
assert.ok(countHorizontalRules(markdown) <= 1, 'analysis markdown should not contain repeated rules');
assert.match(markdown, /Parser fallback used sample raw text/, 'non-empty warning should render once');

console.log('analysis regression checks passed');
