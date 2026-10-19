const supportedLanguages = require("./languages.json");
const english = require("chrono-node/en");
const parsersByLanguage = {
    ar: [require("chrono-node/ar").casual],
    de: [require("chrono-node/de").casual],
    en: [english.GB, english.casual],
    es: [require("chrono-node/es").casual],
    fi: [require("chrono-node/fi").casual],
    fr: [require("chrono-node/fr").casual],
    id: [require("chrono-node/id").casual],
    it: [require("chrono-node/it").casual],
    ja: [require("chrono-node/ja").casual],
    nl: [require("chrono-node/nl").casual],
    pt: [require("chrono-node/pt").casual],
    ru: [require("chrono-node/ru").casual],
    sv: [require("chrono-node/sv").casual],
    uk: [require("chrono-node/uk").casual],
    vi: [require("chrono-node/vi").casual],
    zh: [require("chrono-node/zh").casual],
};
const defaultLanguages = supportedLanguages.map(({ code }) => code);
const falsePositiveTokens = new Set(["on", "to"]);

function detectDateMatches(text, referenceDate, timezoneOffset, languages = defaultLanguages) {
    const reference = timezoneOffset !== null && timezoneOffset !== undefined
        ? { instant: referenceDate, timezone: timezoneOffset }
        : referenceDate;
    const candidates = languages.flatMap((language) => parsersByLanguage[language] || [])
        .flatMap((parser) => parser.parse(text, reference))
        .sort((a, b) => a.index - b.index || b.text.length - a.text.length)
        .filter((candidate) =>
            !falsePositiveTokens.has(candidate.text.trim().toLocaleLowerCase())
        );
    const matches = [];

    for (const candidate of candidates) {
        const end = candidate.index + candidate.text.length;
        const overlaps = matches.some((match) =>
            candidate.index < match.index + match.text.length && end > match.index
        );
        if (!overlaps) {
            matches.push(candidate);
        }
    }

    return matches;
}

function shouldSkipTextNode(node) {
    return Boolean(node.parentElement.closest(
        "a, abbr._dateDetectorClickClass, button, code, input, option, pre, script, select, style, textarea"
    ));
}

function linkifyDates(root, referenceDate, timezoneOffset, languages = defaultLanguages) {
    const document = root.ownerDocument;
    const walker = document.createTreeWalker(root, 4);
    const textNodes = [];
    let node;

    while ((node = walker.nextNode())) {
        if (node.nodeValue && !shouldSkipTextNode(node)) {
            textNodes.push(node);
        }
    }

    for (const textNode of textNodes) {
        const text = textNode.nodeValue;
        const matches = detectDateMatches(text, referenceDate, timezoneOffset, languages);
        if (matches.length === 0) {
            continue;
        }

        const fragment = document.createDocumentFragment();
        let cursor = 0;

        for (const match of matches) {
            fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));

            const start = match.start.date();
            const abbr = document.createElement("abbr");
            abbr.className = "_dateDetectorClickClass";
            abbr.href = "#";
            abbr.textContent = match.text;
            abbr.title = `Create event at ${start.toLocaleString()}`;
            abbr.dataset.dateInfo = JSON.stringify({
                start: start.toJSON(),
                end: match.end ? match.end.date().toJSON() : null,
            });
            fragment.appendChild(abbr);
            cursor = match.index + match.text.length;
        }

        fragment.appendChild(document.createTextNode(text.slice(cursor)));
        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

function installDateClickHandler(root, emailDetails, sendMessage) {
    const Element = root.ownerDocument.defaultView.Element;
    const listener = async (event) => {
        const link = event.composedPath()
            .find((target) => target instanceof Element && target.matches("abbr._dateDetectorClickClass"));
        if (!link) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        try {
            const dateInfo = JSON.parse(link.dataset.dateInfo);
            await sendMessage({
                command: "createNewEventWindow",
                data: {
                    title: emailDetails.subject,
                    start: dateInfo.start,
                    end: dateInfo.end,
                },
            });
        } catch (error) {
            console.error("[date-detector] Could not create event", error);
        }
    };

    root.addEventListener("click", listener, true);
    return listener;
}

module.exports = {
    defaultLanguages,
    detectDateMatches,
    installDateClickHandler,
    linkifyDates,
    supportedLanguages,
};
