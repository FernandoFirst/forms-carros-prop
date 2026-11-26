# Repository Guidelines

## Project Structure & Module Organization

This is a static HTML/CSS/vanilla JavaScript application. `index.html` loads classic deferred scripts from `js/` into the `Veiculos` namespace so it also works with `file://`. `css/` contains the theme; `assets/` contains local SVG assets; `vendor/` contains the official ExcelJS browser distribution and license. `scripts/` contains local development and verification helpers, and `tests/` contains unit/XLSX and Playwright tests. See `README.md` for the actual workflow.

## Build, Test, and Development Commands

Node.js 22+ is required for development only. Run `npm ci`, `npm start` (http://127.0.0.1:4173), `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run format:check`. `npm run check` runs all checks. Playwright uses installed Google Chrome. No application build is required. `npm run vendor` refreshes the local ExcelJS distribution from the installed pinned dependency.

## Coding Style & Naming Conventions

Follow the conventions of the language and framework introduced by the implementation. Use consistent indentation within each file, descriptive identifiers, and filenames that reflect their purpose. Add formatter and linter configuration with the chosen toolchain so contributors can reproduce the style checks. Keep changes focused and avoid unrelated formatting edits.

## Testing Guidelines

Use `node:test` in `tests/*.test.cjs` for domain, persistence and XLSX round-trip tests, and Playwright in `tests/e2e/*.spec.cjs` for desktop/mobile flows. Keep `fieldDefinitions` in the exact official order and compare the 33 headers with the specification and original Excel model. Bug fixes should include a regression test when practical. Never alter the original model or specification merely to make a test pass.

## Commit & Pull Request Guidelines

No Git metadata or commit history is available in this workspace, so existing commit conventions cannot be verified. Use concise, imperative commit subjects, such as `Add vehicle form validation`. Pull requests should explain the purpose, summarize changes, link relevant issues, and describe validation performed. Include screenshots for visible interface changes and identify any setup requirements.

## Security & Configuration

Keep credentials, tokens, and private environment files out of version control. Provide placeholder configuration examples when needed and document required settings without including real secrets.
