# Release Checklist

## Before Tagging A Release

- confirm `manifest.json` version is correct
- confirm `package.json` version is correct
- run:

```bash
npm run lint
npm run build
npm run test:analysis-regression
npm run test:review-regression
```

- verify the generated runtime files exist:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- smoke test in a real Obsidian vault
- confirm the OpenAI-powered flows still work with a real API key
- confirm goal syncing and repair commands still work

## For GitHub Releases

- push a git tag that matches the plugin version, for example `1.0.6`
- the release workflow runs lint, build, and regression checks
- the workflow attests and uploads `main.js`, `manifest.json`, and `styles.css`
- verify each uploaded asset with `gh attestation verify <file> --repo MichelleGDyason/The_Obsidian_Deleometer_v2`

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
