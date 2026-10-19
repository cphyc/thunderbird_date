const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");
const {
    defaultLanguages,
    detectDateMatches,
    installDateClickHandler,
    linkifyDates,
    supportedLanguages,
} = require("../src/date_detection");

const referenceDate = new Date("2025-01-01T12:00:00Z");

function loadBackground(browser) {
    const listeners = {};
    browser.runtime.onInstalled = { addListener: (listener) => { listeners.installed = listener; } };
    browser.runtime.onStartup = { addListener: (listener) => { listeners.startup = listener; } };
    const context = {
        browser,
        console: { error() {} },
    };
    browser.runtime.onMessage.addListener = (listener) => {
        listeners.message = listener;
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(__dirname, "../src/background.js"), "utf8"),
        context,
    );
    return listeners;
}

describe("date detection", () => {
    it("uses Thunderbird's Manifest V3 background scripts format", () => {
        const manifest = JSON.parse(
            fs.readFileSync(path.join(__dirname, "../src/manifest.json"), "utf8"),
        );

        assert.strictEqual(manifest.manifest_version, 3);
        assert.deepStrictEqual(manifest.background.scripts, ["background.js"]);
        assert.strictEqual(manifest.background.service_worker, undefined);
    });

    it("uses the mail window calendar function to save events in the selected calendar", async () => {
        const moduleImports = [];
        const dialogArguments = [];
        const window = {
            createEventWithDialog: (...args) => dialogArguments.push(...args),
        };
        const ExtensionAPI = class {};
        const context = {
            ChromeUtils: {
                importESModule: (url) => {
                    moduleImports.push(url);
                    if (url.endsWith("ExtensionCommon.sys.mjs")) {
                        return { ExtensionCommon: { ExtensionAPI } };
                    }
                    if (url.endsWith("calUtils.sys.mjs")) {
                        return {
                            cal: {
                                dtz: {
                                    defaultTimezone: "local",
                                    jsDateToDateTime: (date, timezone) => ({ date, timezone }),
                                },
                            },
                        };
                    }
                    throw new Error(`Unexpected module import: ${url}`);
                },
            },
            ExtensionCommon: { ExtensionAPI },
            cal: {
                dtz: {
                    defaultTimezone: "local",
                    jsDateToDateTime: (date, timezone) => ({ date, timezone }),
                },
            },
            Services: {
                wm: { getMostRecentWindow: () => window },
            },
        };
        vm.runInNewContext(
            fs.readFileSync(path.join(__dirname, "../src/implementation.js"), "utf8"),
            context,
        );
        const api = new context.eventCreator().getAPI({});

        await api.eventCreator.createNewEventWindow(
            "Planning",
            "2025-03-15T12:00:00.000Z",
            "2025-03-15T13:00:00.000Z",
        );

        assert.deepStrictEqual(moduleImports, [
            "resource://gre/modules/ExtensionCommon.sys.mjs",
            "resource:///modules/calendar/calUtils.sys.mjs",
        ]);
        assert.strictEqual(dialogArguments[0], null);
        assert.strictEqual(dialogArguments[1].date.toISOString(), "2025-03-15T12:00:00.000Z");
        assert.strictEqual(dialogArguments[2].date.toISOString(), "2025-03-15T13:00:00.000Z");
        assert.strictEqual(dialogArguments[3], "Planning");
    });

    it("detects an English date and time", () => {
        const matches = detectDateMatches(
            "Let's meet on March 15, 2025 at 2pm.",
            referenceDate,
        );

        assert.strictEqual(matches.length, 1);
        assert.match(matches[0].text, /March 15, 2025 at 2pm/);
        assert.strictEqual(matches[0].start.get("year"), 2025);
        assert.strictEqual(matches[0].start.get("month"), 3);
        assert.strictEqual(matches[0].start.get("day"), 15);
    });

    it("detects dates written in French", () => {
        const matches = detectDateMatches("Rendez-vous le 15 mars 2025.", referenceDate);

        assert.strictEqual(matches.length, 1);
        assert.match(matches[0].text, /15 mars 2025/);
        assert.strictEqual(matches[0].start.get("year"), 2025);
        assert.strictEqual(matches[0].start.get("month"), 3);
        assert.strictEqual(matches[0].start.get("day"), 15);
    });

    it("enables every chrono-node language by default and allows selecting languages", () => {
        const chronoLocaleDirectory = path.join(
            __dirname,
            "../node_modules/chrono-node/dist/cjs/locales",
        );
        const chronoLanguages = fs.readdirSync(chronoLocaleDirectory)
            .filter((entry) => fs.statSync(path.join(chronoLocaleDirectory, entry)).isDirectory())
            .sort();

        assert.deepStrictEqual(
            [...defaultLanguages].sort(),
            chronoLanguages,
        );
        assert(supportedLanguages.length > 0);

        const frenchOnly = detectDateMatches(
            "Rendez-vous le 15 mars 2025.",
            referenceDate,
            undefined,
            ["fr"],
        );
        const englishOnly = detectDateMatches(
            "Rendez-vous le 15 mars 2025.",
            referenceDate,
            undefined,
            ["en"],
        );

        assert.strictEqual(frenchOnly.length, 1);
        assert.strictEqual(englishOnly.length, 0);
    });

    it("uses the sender timezone for a time without an explicit timezone", () => {
        const matches = detectDateMatches("Let's meet tomorrow at 3pm.", referenceDate, 120);

        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].start.date().toISOString(), "2025-01-02T13:00:00.000Z");
    });

    it("prefers an explicit timezone in the email over the sender timezone", () => {
        const matches = detectDateMatches(
            "Let's meet tomorrow at 3pm UTC.",
            referenceDate,
            120,
        );

        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].start.date().toISOString(), "2025-01-02T15:00:00.000Z");
    });

    it("retains the end time of a detected event range", () => {
        const matches = detectDateMatches(
            "Meeting on March 15, 2025 from 2pm to 3pm.",
            referenceDate,
            120,
        );

        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].start.date().toISOString(), "2025-03-15T12:00:00.000Z");
        assert.strictEqual(matches[0].end.date().toISOString(), "2025-03-15T13:00:00.000Z");
    });

    it("wraps dates without replacing or changing surrounding email markup", () => {
        const dom = new JSDOM(
            '<p id="intro">Meet on <strong>March 15, 2025</strong>.</p>' +
            '<a href="https://example.com/">March 15, 2025</a>' +
            '<img alt="inline image" src="cid:image1">' +
            '<script>March 15, 2025</script>'
        );
        const body = dom.window.document.body;
        const originalText = body.textContent;

        linkifyDates(body, referenceDate);

        assert.strictEqual(body.textContent, originalText);
        assert.strictEqual(body.querySelector("#intro").textContent, "Meet on March 15, 2025.");
        assert.strictEqual(body.querySelector('a[href^="https://"]').getAttribute("href"), "https://example.com/");
        assert.strictEqual(body.querySelectorAll("abbr._dateDetectorClickClass").length, 1);
        assert.strictEqual(body.querySelector("img").getAttribute("src"), "cid:image1");
        assert.strictEqual(body.querySelector("script").textContent, "March 15, 2025");

        linkifyDates(body, referenceDate);
        assert.strictEqual(body.querySelectorAll("abbr._dateDetectorClickClass").length, 1);
    });

    it("routes a clicked date through the MV3 event command without looking up the tab message", async () => {
        const eventArgs = [];
        const browser = {
            runtime: { onMessage: { addListener() {} } },
            tabs: { query: async () => [] },
            messageDisplay: {
                getDisplayedMessages: async () => {
                    throw new Error("event commands must not fetch displayed message details");
                },
            },
            scripting: {
                insertCSS: async () => {},
                executeScript: async () => {},
                messageDisplay: {
                    getRegisteredScripts: async () => [{ id: "date-detector-message-display" }],
                    registerScripts: async () => {},
                },
            },
            eventCreator: {
                createNewEventWindow: async (...args) => {
                    eventArgs.push(...args);
                },
            },
        };
        const listeners = loadBackground(browser);
        const dom = new JSDOM("<p>Meeting on March 15, 2025 from 2pm to 3pm.</p>");
        const body = dom.window.document.body;
        const details = { subject: "Planning", date: referenceDate, senderTimezone: 120 };
        linkifyDates(body, details.date, details.senderTimezone);
        let commandPromise;
        installDateClickHandler(body, details, (message) => {
            commandPromise = listeners.message(message, { tab: { id: 10 } });
            return commandPromise;
        });
        const click = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
        body.querySelector("abbr._dateDetectorClickClass").dispatchEvent(click);
        await commandPromise;

        assert.strictEqual(click.defaultPrevented, true);
        assert.deepStrictEqual(eventArgs, [
            "Planning",
            "2025-03-15T12:00:00.000Z",
            "2025-03-15T13:00:00.000Z",
        ]);
    });

    it("loads message details using the MV3 displayed-message list API", async () => {
        const browser = {
            runtime: { onMessage: { addListener() {} } },
            tabs: { query: async () => [] },
            messageDisplay: {
                getDisplayedMessages: async (tabId) => {
                    assert.strictEqual(tabId, 10);
                    return {
                        messages: [{
                            id: 42,
                            subject: "Planning",
                            date: referenceDate,
                        }],
                    };
                },
            },
            messages: {
                getFull: async (messageId) => {
                    assert.strictEqual(messageId, 42);
                    return { headers: { date: ["Wed, 01 Jan 2025 12:00:00 -0500"] } };
                },
            },
            scripting: {
                insertCSS: async () => {},
                executeScript: async () => {},
                messageDisplay: {
                    getRegisteredScripts: async () => [{ id: "date-detector-message-display" }],
                    registerScripts: async () => {},
                },
            },
        };
        const listeners = loadBackground(browser);
        const result = await listeners.message(
            { command: "getEmailDetails" },
            { tab: { id: 10 } },
        );

        assert.strictEqual(result.subject, "Planning");
        assert.strictEqual(result.date, referenceDate);
        assert.strictEqual(result.senderTimezone, -300);
    });

    it("registers an MV3 message-display script and injects it in an open message", async () => {
        const registrationCalls = [];
        const cssInjections = [];
        const scriptInjections = [];
        const browser = {
            runtime: { onMessage: { addListener() {} } },
            tabs: { query: async () => [{ id: 1 }, { id: 2 }] },
            messageDisplay: {
                getDisplayedMessages: async (tabId) => ({
                    messages: tabId === 2 ? [{ id: 10 }] : [],
                }),
            },
            scripting: {
                insertCSS: async (injection) => cssInjections.push(injection),
                executeScript: async (injection) => scriptInjections.push(injection),
                messageDisplay: {
                    getRegisteredScripts: async () => [],
                    registerScripts: async (scripts) => registrationCalls.push(scripts),
                },
            },
        };
        const listeners = loadBackground(browser);

        await listeners.installed();

        assert.strictEqual(registrationCalls.length, 1);
        assert.strictEqual(registrationCalls[0][0].id, "date-detector-message-display");
        assert.strictEqual(registrationCalls[0][0].runAt, "document_idle");
        assert.strictEqual(cssInjections.length, 1);
        assert.strictEqual(cssInjections[0].target.tabId, 2);
        assert.strictEqual(scriptInjections.length, 1);
        assert.strictEqual(scriptInjections[0].files[0], "dist/change_message.bundle.js");
    });
});
