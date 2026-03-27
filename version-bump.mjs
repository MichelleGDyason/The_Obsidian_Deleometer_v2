import fs from 'fs';

const packageJsonPath = new URL('./package.json', import.meta.url);
const manifestPath = new URL('./manifest.json', import.meta.url);
const versionsPath = new URL('./versions.json', import.meta.url);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));

manifest.version = packageJson.version;
versions[packageJson.version] = manifest.minAppVersion;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(versionsPath, `${JSON.stringify(versions, null, 2)}\n`);

console.log(`Updated manifest.json and versions.json for version ${packageJson.version}`);
