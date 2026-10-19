# Thunderbird date

This addon finds dates and time references in your emails, and make them clickable to open a new event dialog window.
It requires Thunderbird 128 or later and uses Manifest V3.

It relies on the great [awesome chrono library](https://github.com/wanasit/chrono) to detect dates and times in your emails.
All date-detection languages supported by chrono-node are enabled by default. To select languages, open the Date detector preferences from Thunderbird's Add-ons Manager. Changes apply when opening messages after saving.

# Installation

~Head to https://addons.thunderbird.net/en-GB/thunderbird/addon/date-detection/ and install the extension.~
The extension is _not yet_ available on the Thunderbird store.
You can however manually install the extension as follows:
1. head to the [release](https://github.com/cphyc/thunderbird_date/releases) section,
2. download the latest `.xpi` file,
3. in the Add-ons Manager of Thunderbird, click on "Install Add-on From File..." and select the downloaded `.xpi` file.
![Alt text](/imgs/installation.png?raw=true "Install add-on from file")

Note that if you install this way, no updates will appear. Instead, you will have to return to this page, download the latest release and reload it in Thunderbird in order to update it.

# Building

You can also build the extension yourself.
The build requires `nodejs` and `npm`. The extension source is written in TypeScript and compiled before bundling and packaging. Install the project dependencies and run:
```bash
# Clone the repository
git clone https://github.com/cphyc/thunderbird_date.git
# Move into the newly-created folder
cd thunderbird_date
# Install the requirements
npm install
# Generate both .xpi files
npm run build
# Check types and run tests
npm test
# Type-check without running tests
npm run typecheck
```

The build writes two packages to `web-ext-artifacts/`:

- `date_detector-github.xpi` has no maximum Thunderbird version and is intended for GitHub releases.
- `date_detector-thunderbird.xpi` includes `strict_max_version` and is intended for the Thunderbird Add-ons site. Set the value in `src/manifest.json` before building, or override it with `TB_STRICT_MAX_VERSION`.

To build just one package, run `npm run build:github` or `npm run build:thunderbird`. Install the GitHub variant from `web-ext-artifacts/date_detector-github.xpi`.
Note that if you install this way, you need to manually update the repository, rebuild the extension and reload it in Thunderbird in order to update it.
