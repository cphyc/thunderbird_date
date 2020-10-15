# Thunderbird date

This addon finds dates and time references in your emails, and make them clickable to open a new event dialog window.

It relies on the great [awesome chrono library](https://github.com/wanasit/chrono/tree/v1.x.x) to detect dates and times in your emails.

# Installation

Head to https://addons.thunderbird.net/en-GB/thunderbird/addon/date-detection/ and install the extension.

# Building

The building requires `nodejs` and `npm` to be installed. The extension relies on the generation of a bundle (which will appear in the `dist` folder). In order to generate it, execute the following lines
```bash
# Clone the repository
git clone https://github.com/cphyc/thunderbird_date.git
# Move into the newly-created folder
cd thunderbird_date
# Install the requirements
npm install
# Generate the bundle
npm run bundle
# Create the extension
npm run webext
```
You can then install the extension by loading it directly in Thunderbird using the generated `.zip` file located in `thunderbird_date/web-ext-artifacts/`.
Note that if you install this way, you need to manually update the repository, rebuild the extension and reload it in Thunderbird in order to update it.
