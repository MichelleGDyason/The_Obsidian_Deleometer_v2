# Release Checklist

## Before Tagging A Release

- confirm `manifest.json` version is correct
- confirm `package.json` version is correct
- run:

```bash
npm run build
```

- verify the generated runtime files exist:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- smoke test in a real Obsidian vault
- confirm the OpenAI-powered flows still work with a real API key
- confirm goal syncing and repair commands still work

## For GitHub Releases

- create a git tag that matches the plugin version, for example `1.0.0`
- upload:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- include release notes summarizing user-facing changes

## For Obsidian Community Plugin Submission

- make sure the repository is public
- make sure `LICENSE` is present
- make sure `README.md` explains install, setup, and usage
- make sure `versions.json` is present and updated
- make sure release assets include:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- submit the repository according to Obsidian’s community plugin process

## Recommended Metadata To Keep Current

- `manifest.json`
  - `version`
  - `minAppVersion`
  - `description`
  - `author`
  - `authorUrl`
  - `fundingUrl`
- `package.json`
  - `version`
  - `repository`
  - `bugs`
  - `homepage`
  - `license`
