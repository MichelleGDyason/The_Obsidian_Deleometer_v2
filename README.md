# The Deleometer

AI-powered journaling, multi-perspective analysis, goal generation, and reflective chat for Obsidian.

Active repository:
[github.com/MichelleGDyason/The_Obsidian_Deleometer_v2](https://github.com/MichelleGDyason/The_Obsidian_Deleometer_v2)

## Safety and Interpretation

The Deleometer is a reflective conversation and journaling tool. It is not a medical device, diagnosis, treatment, or substitute for medication, therapy, crisis support, or professional care already used by the journal author.

AI can make mistakes and can sound more certain than it is. Treat Deleometer responses as invitations to think with, question, revise, and discuss, not as truth to absorb undiluted. Use it like a rigorous conversation with a thoughtful friend, not an all-knowing or infallible robot. Continuing to chat with the AI can help mistakes become clearer, because you can challenge the response, ask for evidence, request a simpler explanation, or ask it to reinterpret the same entry through another frame.

Your OpenAI API key is hidden in the settings screen, but it is still stored locally in Obsidian plugin data. If your vault, device backups, or plugin data are synced or shared, treat the key as sensitive.

## Security and Privacy

The Deleometer is an Obsidian plugin, not a sealed or encrypted vault. AI features send the relevant journal, chat, goal, author memory, and analysis context to OpenAI. The settings include privacy controls for redacting common sensitive details before AI calls, keeping author memory local, excluding the personality profile from prompts, clearing stored author memory, clearing the API key, and avoiding full-journal context in perspective chat.

Saved analyses, chats, goals, author memory, and plugin settings are stored locally as Obsidian data or Markdown. The Deleometer does not encrypt those files. Anyone with access to the vault, backups, sync provider, device account, or another sufficiently powerful Obsidian plugin may be able to read them. Install the plugin only from the MichelleGDyason GitHub repository or the official Obsidian community plugin listing when available, and treat BRAT beta releases as development builds.

## License Position

This project is licensed under the GNU Affero General Public License v3.0.

Why AGPL-3.0:

- it keeps the plugin open source
- it prevents privatized improvements from being closed off from the community
- it requires derivative works, including hosted or networked versions, to provide source code under the same license

As copyright holder, Michelle G Dyason may choose to relicense future versions under MIT if community adoption clearly requires a more permissive license. That does not change the license of versions already released under AGPL.

## What It Does

The Deleometer helps you:

- write journal entries inside Obsidian
- generate multi-perspective AI analyses from each entry
- continue a live AI chat from a specific analysis perspective
- save that chat back into the original journal analysis note
- turn analysis suggestions into editable goals
- track goals in notes and optionally sync them into the Full Calendar plugin
- review activity in an emotional intelligence dashboard

The plugin keeps an author memory summary so later analyses can respond as part of an ongoing reflective conversation with previous analyses. This is meant to help recurring themes, values, supports, risks, and patterns become easier to notice over time.

## Requirements

- Obsidian `1.5.0` or later
- an OpenAI API key
- desktop Obsidian is recommended for the full workflow

## Installation

### Manual Install

1. Create a plugin folder in your vault:
   `.obsidian/plugins/the-deleometer/`
2. Copy these files into that folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
3. Restart Obsidian or reload community plugins.
4. Enable `The Deleometer` in Community Plugins.

### Development Build

1. Install dependencies:

```bash
npm install
```

2. Build the plugin:

```bash
npm run build
```

3. Copy the runtime files into your Obsidian plugin folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`

Obsidian does not load `main.ts` directly. It must be built into `main.js`.

## Setup

After enabling the plugin:

1. Open `Settings -> Community plugins -> The Deleometer`.
2. Paste your OpenAI API key.
3. Confirm or change the journal and goals folders.
4. If you use Full Calendar, set the `Full Calendar Folder` to the folder watched by your Full Calendar local source.

## Basic Workflow

1. Create a journal entry.
2. Use `Save & Analyze`.
3. Review the AI analysis sections.
4. Click the perspective chat link you want to continue.
5. Save the chat back into the source journal analysis note.
6. Draft goals from the analysis.
7. Optionally sync goals and milestones into Full Calendar.

Analyses can be extensive. If every frame is enabled, an appended note may produce around 15,000 words, roughly a 70-minute read. Settings let you enable or disable whole analysis groups, or choose individual analyses inside each group, so you can tune the output to the time and attention you have. Generated analyses follow a strict historical chronology first; group labels come second, as lineage markers for settings and group synthesis.

The analysis reader level can also be changed in settings. The available levels range from Grade 5 primary through professor-level analysis. This changes how much the AI explains specialist terms and how far it tries to guide the reader beyond their current zone of proximal development.

## Screenshots

These screenshots show The Deleometer in action during beta development. The README appears on GitHub and in repository documentation; inside Obsidian, the plugin settings hold the controls for API keys, folders, analysis groups, individual lenses, reader level, and safety guidance.

![Multi-perspective analysis modal in Obsidian](docs/screenshots/01-analysis-modal.png)

![Perspective chat continuing from a topological analysis](docs/screenshots/03-ai-chat-topological.png)

![Perspective chat continuing from Philosophy of Mind](docs/screenshots/07-ai-chat-philosophy-of-mind.png)

![Bible Teachings analysis appended into an Obsidian note](docs/screenshots/09-bible-teachings-analysis.png)

![Spinoza analysis alongside research notes](docs/screenshots/11-spinoza-analysis-with-notes.png)

![Draft goals generated from an analysis](docs/screenshots/13-draft-goals-modal.png)

<details>
<summary>Additional beta workflow captures</summary>

![BRAT beta update conversation](docs/screenshots/02-beta-update-thread.png)

![BRAT beta update conversation alternate capture](docs/screenshots/04-beta-update-thread-alt.png)

![Topological chat alternate capture](docs/screenshots/05-ai-chat-topological-alt.png)

![Goal date validation beta workflow](docs/screenshots/06-goal-date-validation-thread.png)

![Goal suggestion beta workflow](docs/screenshots/08-goal-suggestion-thread.png)

![Goal suggestion beta workflow alternate capture](docs/screenshots/10-goal-suggestion-thread-alt.png)

![GitHub beta branch view](docs/screenshots/12-github-beta-branch.png)

![GitHub beta branch alternate capture](docs/screenshots/14-github-beta-branch-alt.png)

</details>

## Why This Exists

A short personal note about why the plugin was made would be useful for other people. The Deleometer is unusual because it treats a journal entry as something that can be read through many disciplines, not only as mood tracking or productivity data. Explaining the reason for making it can help users understand that the plugin is designed for reflective agency: the author is meant to argue with the AI, learn from it, reject parts of it, and use the conversation to make their own meanings clearer.

## Full Calendar Integration

The plugin can create dated goal and milestone event notes that the [Full Calendar](https://github.com/obsidian-community/obsidian-full-calendar) plugin can display.

It supports:

- goal due dates
- recommended milestone dates
- auto-sync when goals are created
- manual resync via command:
  `Sync goals to Full Calendar`

## Commands

The plugin includes commands for:

- creating journal entries
- opening the AI chat
- opening the dashboard
- creating goals
- taking the personality assessment
- syncing goals to Full Calendar
- consolidating similar goals
- repairing goal note frontmatter
- backfilling analysis chat links for older notes

## Notes for Public Release

Before publishing widely, you will probably want to:

- review [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- confirm your GitHub repository details are current in `package.json`
- keep `versions.json` in sync with each release

## Support

- Buy Me a Coffee: [buymeacoffee.com/theobsidiandeleometer](https://buymeacoffee.com/theobsidiandeleometer)
- GitHub Sponsors: [github.com/sponsors/MichelleGDyason](https://github.com/sponsors/MichelleGDyason)

You may also want to add:

- GitHub Issues link
- feature request link
- contact email or site

## License

This project is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).

## Analysis Catalogue

The Deleometer currently includes 135 individual analysis frames. Generated analyses are ordered by strict chronology, beginning with accumulated Australian Indigenous philosophy and then moving through ancient, classical, modern, and contemporary traditions so the analyses can show a progression in thought. The catalogue below is grouped as a settings map: groups and individual analyses can be toggled on or off, and group syntheses are produced after the chronological individual analyses have been explicated.

### Philosophy as First Discipline

- Australian Indigenous Philosophy Accumulated
- Buddhist Psychology
- Platonic Philosophy
- Aristotle's Argonic Teachings
- Cynics' Philosophy
- Stoic Philosophy
- Bible Teachings
- Metaphysical Analysis
- Ontological Analysis
- Ethical Analysis
- Philosophy of Mind
- René Descartes' Cogito and Subject
- Spinoza's Theologic-Ethico Philosophy
- Gottfried Wilhelm Leibniz's Monadology
- John Locke's Personal Identity
- David Hume's Bundle Theory of Self
- Moral Naturalism
- Immanuel Kant's Transcendental Subject
- G.W.F. Hegel's Recognition and Subjectivity
- Nietzschean Philosophy
- Phenomenology
- Martin Heidegger's Dasein Analysis
- Emmanuel Levinas' Ethics of the Other
- Hermeneutics
- Existential Analysis
- Jean-Paul Sartre's Subjectivity
- Simone de Beauvoir's Situated Subject
- Maurice Merleau-Ponty's Embodied Subject
- Process Philosophical Analysis
- P. F. Strawson's Personhood
- Harry Frankfurt's Volitional Self
- Sydney Shoemaker's Self-Knowledge
- Bernard Williams' Personal Identity
- Paul Ricoeur's Narrative Identity
- Derek Parfit's Reductionist Identity
- Jürgen Habermas' Communicative Subject
- Charles Taylor's Sources of the Self
- Alasdair MacIntyre's Narrative Self
- Jean-Luc Nancy's Being-With
- Judith Butler's Performativity and Subjectivation
- Catriona Mackenzie's Relational Autonomy
- Christine Korsgaard's Self-Constitution
- Marya Schechtman's Narrative Self
- Linda Martín Alcoff's Visible Identities
- Kwame Anthony Appiah's Identity Ethics
- Adriana Cavarero's Relational Uniqueness
- Dan Zahavi's Minimal Self
- Shaun Gallagher's Embodied Self
- Shaun Gallagher's Pattern Theory of Self
- Rosi Braidotti's Nomadic Subjectivity
- Topological Analysis

### Religious, Mythic, and Pagan Interpretations

- Ancient Religious Interpretation
- First Testament / Hebrew Interpretation
- Greek Gods Interpretation
- Roman Gods Interpretation
- Druidic Interpretation
- Second Testament / Christian Interpretation
- Muslim Interpretation
- Pagan Interpretation

### Social, Spatial, and Research Methods

- Cartographic Analysis
- Geography
- Sociology
- Social Research Methods

### Narrative, Media, and Frame Studies

- Linguistic Analysis
- Semiotic Analysis
- Narrative Psychology
- Creative Non-Fiction
- Music Songwriting Analysis
- Idiotextual Analysis
- Frame Analysis
- Erving Goffman's Frame Analysis
- Media Studies
- Tessa Laird's Cinemal

### Psychoanalytic and Clinical Psychologies

- Freudian Psychoanalysis
- Jungian Analysis
- Lacanian Psychoanalysis
- Julia Kristeva's Abjection and Semiotic
- Psychiatric Assessment
- Attachment Theory
- Gestalt Therapy
- Transpersonal Psychology
- Maslow's Hierarchy of Needs
- Myers-Briggs analysis
- Cognitive Behavioral
- Positive Psychology

### Family, Care, and Guidance Theories

- Montessori Method
- Jean Piaget's Developmental Theory
- Lev Vygotsky's Sociocultural Theory
- Asian / Japanese Parental Guidance Practices
- African / Zimbabwean Parental Guidance Practices
- Western Parental Guidance Theories

### Archeo-Genealogical and Deconstructive Thought

- Marxian Analysis
- Georges Bataillean Analysis
- Critical Theory
- Simondonian Analysis
- Foucaultian Analysis
- Derridian Analysis
- Deleuzian Schizoanalysis
- Žižekian Analysis
- Posthumanism

### Gender, Sexuality, and Queer Studies

- Feminist Psychology
- Irigarayian Feminine
- Lesbian & Gay Studies
- Sexualities Studies
- Gender Studies
- Queer Theory
- Trans Studies

### Race, Coloniality, and Embodiment Studies

- Critical Race Studies
- Frantz Fanonian Analysis
- Decolonial Studies
- Fat Studies
- Mad Studies

### Systems, Ecology, and Food Futures

- Ecology
- Quantum Theory Analysis
- Gregory Bateson's Ecology of Mind
- Latourian Analysis
- Karen Barad's Agential Realism
- Resilience
- Social-Ecological Systems Theory
- Critical Food Systems Analysis
- Biomimicry
- Ecopoiesis

### Strategy, Method, and Organisation

- Mechanical Engineering Analysis
- Australian Legal Discourse
- SWOT Analysis
- Grounded Theory
- Autoethnography
- Feasibility Analysis
- Risk Analysis
- Transitional Theory
- Organisational Theories
- Organisational Transformation
- Theories Growing a Social Movement
- Tacktical Methodological Analysis
- Imagining Transformative Futures
