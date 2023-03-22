# Thunderbird date

This addon finds dates and time references in your emails, and make them clickable to open a new event dialog window.

It relies on the great [awesome chrono library](https://github.com/wanasit/chrono) to detect dates and times in your emails.

# Installation

~Head to https://addons.thunderbird.net/en-GB/thunderbird/addon/date-detection/ and install the extension.~[1]
The extension is _not yet_ available on the Thunderbird store.
You can however manually install the extension as follows:
1. head to the [release](https://github.com/cphyc/thunderbird_date/releases) section,
2. download the latest `.zip` file,
3. in the Add-ons Manager of Thunderbird, click on "Install Add-on From File..." and select the downloaded `.zip` file.
![Alt text](/imgs/installation.png?raw=true "Install add-on from file")

Note that if you install this way, no updates will appear. Instead, you will have to return to this page, download the latest release and reload it in Thunderbird in order to update it.

[1]: This addon depends on the chrono library, which itself has some dependencies with security issues. Until this is fixed, this will prevent the addon from appearing on the official Thunderbird add-ons list.

# Building

You can also build the extension yourself.
The building requires `nodejs` and `npm` to be installed. The extension relies on the generation of a bundle (which will appear in the `web-ext-artifacts` folder). In order to generate it, please ensure you have the `webpack`, `webpack-cli` and `web-ext` packages installed (these can be installed using `npm install webpack webpack-cli web-ext`). Then execute the following lines
```bash
# Clone the repository
git clone https://github.com/cphyc/thunderbird_date.git
# Move into the newly-created folder
cd thunderbird_date
# Install the requirements
npm install
# Generate the .zip file for the extension
npm run build
# or alternatively
npm run bundle  # will bundle all .js files into one
npm run webext  # will create the .zip file
```

Once the extension has been generated, load in from `thunderbird_date/web-ext-artifacts/`.
Note that if you install this way, you need to manually update the repository, rebuild the extension and reload it in Thunderbird in order to update it.
