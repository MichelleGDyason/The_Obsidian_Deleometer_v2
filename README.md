# The Deleometer

AI-powered journaling, multi-perspective analysis, goal generation, and reflective chat for Obsidian.

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
