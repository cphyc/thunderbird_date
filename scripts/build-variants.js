const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceDirectory = path.join(projectRoot, "src");
const artifactsDirectory = path.join(projectRoot, "web-ext-artifacts");
const webExtCli = path.join(projectRoot, "node_modules", "web-ext", "bin", "web-ext.js");

function manifestForTarget(sourceManifest, target, maxVersionOverride) {
    const manifest = JSON.parse(JSON.stringify(sourceManifest));
    const gecko = manifest.browser_specific_settings?.gecko;
    if (!gecko) {
        throw new Error("Manifest is missing browser_specific_settings.gecko");
    }

    if (target === "github") {
        delete gecko.strict_max_version;
    } else if (target === "thunderbird") {
        const strictMaxVersion = maxVersionOverride || gecko.strict_max_version;
        if (!strictMaxVersion) {
            throw new Error(
                "Set strict_max_version in src/manifest.json or TB_STRICT_MAX_VERSION for the Thunderbird Add-ons package",
            );
        }
        gecko.strict_max_version = strictMaxVersion;
    } else {
        throw new Error(`Unknown build target: ${target}`);
    }

    return manifest;
}

function buildTarget(target) {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "date-detector-"));
    const temporarySource = path.join(temporaryDirectory, "src");
    const outputFilename = target === "github"
        ? "date_detector-github.xpi"
        : "date_detector-thunderbird.xpi";

    try {
        fs.cpSync(sourceDirectory, temporarySource, { recursive: true });

        for (const entry of fs.readdirSync(temporarySource, { withFileTypes: true })) {
            if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".d.ts"))) {
                fs.rmSync(path.join(temporarySource, entry.name));
            }
        }
        for (const runtimeFile of ["background.js", "implementation.js", "options.js"]) {
            fs.copyFileSync(
                path.join(projectRoot, ".build", "runtime", runtimeFile),
                path.join(temporarySource, runtimeFile),
            );
        }

        const manifestPath = path.join(temporarySource, "manifest.json");
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        const transformedManifest = manifestForTarget(
            manifest,
            target,
            process.env.TB_STRICT_MAX_VERSION,
        );
        fs.writeFileSync(manifestPath, `${JSON.stringify(transformedManifest, null, 2)}\n`);

        execFileSync(process.execPath, [
            webExtCli,
            "build",
            "--source-dir",
            temporarySource,
            "--artifacts-dir",
            artifactsDirectory,
            "--filename",
            outputFilename,
            "--overwrite-dest",
            "--no-config-discovery",
            "--ignore-files=change_message.js",
        ], { stdio: "inherit" });
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
}

function main() {
    const target = process.argv[2] || "all";
    if (target === "all") {
        buildTarget("github");
        buildTarget("thunderbird");
    } else {
        buildTarget(target);
    }
}

if (require.main === module) {
    main();
}

module.exports = { manifestForTarget };
