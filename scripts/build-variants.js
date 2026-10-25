const JSZip = require("jszip");
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceDirectory = path.join(projectRoot, "src");
const artifactsDirectory = path.join(projectRoot, "web-ext-artifacts");

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

async function buildTarget(target) {
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

        const archive = new JSZip();
        function addDirectory(directory, prefix = "") {
            for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
                const filename = path.join(directory, entry.name);
                const archivePath = prefix + entry.name;
                if (entry.isSymbolicLink()) {
                    throw new Error(`Cannot package symbolic link: ${archivePath}`);
                } else if (entry.isDirectory()) {
                    addDirectory(filename, archivePath + "/");
                } else if (entry.isFile() && entry.name !== "change_message.js") {
                    archive.file(archivePath, fs.readFileSync(filename));
                }
            }
        }
        addDirectory(temporarySource);
        fs.mkdirSync(artifactsDirectory, { recursive: true });
        fs.writeFileSync(path.join(artifactsDirectory, outputFilename), await archive.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
        }));
        console.log(`Built ${outputFilename}`);
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
}

async function main() {
    const target = process.argv[2] || "all";
    if (target === "all") {
        await buildTarget("github");
        await buildTarget("thunderbird");
    } else {
        await buildTarget(target);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { manifestForTarget };
