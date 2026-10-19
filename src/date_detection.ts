import type { ParsedResult, ParsingReference } from "chrono-node";
import * as arabic from "chrono-node/ar";
import * as german from "chrono-node/de";
import * as english from "chrono-node/en";
import * as spanish from "chrono-node/es";
import * as finnish from "chrono-node/fi";
import * as french from "chrono-node/fr";
import * as indonesian from "chrono-node/id";
import * as italian from "chrono-node/it";
import * as japanese from "chrono-node/ja";
import * as dutch from "chrono-node/nl";
import * as portuguese from "chrono-node/pt";
import * as russian from "chrono-node/ru";
import * as swedish from "chrono-node/sv";
import * as ukrainian from "chrono-node/uk";
import * as vietnamese from "chrono-node/vi";
import * as chinese from "chrono-node/zh";
import supportedLanguages from "./languages.json";

type LanguageCode = string;
type DateParser = {
    parse(text: string, reference?: ParsingReference | Date): ParsedResult[];
};

const parsersByLanguage: Record<LanguageCode, DateParser[]> = {
    ar: [arabic.casual],
    de: [german.casual],
    en: [english.GB, english.casual],
    es: [spanish.casual],
    fi: [finnish.casual],
    fr: [french.casual],
    id: [indonesian.casual],
    it: [italian.casual],
    ja: [japanese.casual],
    nl: [dutch.casual],
    pt: [portuguese.casual],
    ru: [russian.casual],
    sv: [swedish.casual],
    uk: [ukrainian.casual],
    vi: [vietnamese.casual],
    zh: [chinese.casual],
};
const defaultLanguages = supportedLanguages.map(({ code }) => code);
const falsePositiveTokens = new Set(["on", "to"]);

function detectDateMatches(
    text: string,
    referenceDate: Date,
    timezoneOffset?: number | null,
    languages: LanguageCode[] = defaultLanguages,
): ParsedResult[] {
    const reference = timezoneOffset !== null && timezoneOffset !== undefined
        ? { instant: referenceDate, timezone: timezoneOffset }
        : referenceDate;
    const candidates = languages.flatMap((language) => parsersByLanguage[language] || [])
        .flatMap((parser) => parser.parse(text, reference))
        .sort((a, b) => a.index - b.index || b.text.length - a.text.length)
        .filter((candidate) =>
            !falsePositiveTokens.has(candidate.text.trim().toLocaleLowerCase())
        );
    const matches: ParsedResult[] = [];

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

function shouldSkipTextNode(node: Node): boolean {
    return Boolean(node.parentElement?.closest(
        "a, abbr._dateDetectorClickClass, button, code, input, option, pre, script, select, style, textarea",
    ));
}

function linkifyDates(
    root: HTMLElement,
    referenceDate: Date,
    timezoneOffset?: number | null,
    languages: LanguageCode[] = defaultLanguages,
): void {
    const document = root.ownerDocument;
    const walker = document.createTreeWalker(
        root,
        document.defaultView?.NodeFilter.SHOW_TEXT ?? 4,
    );
    const textNodes: Text[] = [];
    let node;

    while ((node = walker.nextNode())) {
        if (
            node.nodeType === (document.defaultView?.Node.TEXT_NODE ?? 3) &&
            node.nodeValue &&
            !shouldSkipTextNode(node)
        ) {
            textNodes.push(node as Text);
        }
    }

    for (const textNode of textNodes) {
        const text = textNode.nodeValue;
        if (!text) {
            continue;
        }
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
        textNode.parentNode?.replaceChild(fragment, textNode);
    }
}

interface EmailDetails {
    subject: string;
}

interface ClickEventMessage {
    command: "createNewEventWindow";
    data: {
        title: string;
        start: string;
        end: string | null;
    };
}

function installDateClickHandler(
    root: HTMLElement,
    emailDetails: EmailDetails,
    sendMessage: (message: ClickEventMessage) => Promise<unknown>,
): (event: MouseEvent) => Promise<void> {
    const ElementConstructor = root.ownerDocument.defaultView?.Element;
    if (!ElementConstructor) {
        throw new Error("Could not access the email document's Element constructor");
    }
    const listener = async (event: MouseEvent): Promise<void> => {
        const link = event.composedPath()
            .find((target): target is HTMLAbbrElement =>
                target instanceof ElementConstructor && target.matches("abbr._dateDetectorClickClass")
            );
        if (!link) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        try {
            const dateInfo = JSON.parse(link.dataset.dateInfo ?? "{}") as {
                start?: string;
                end?: string | null;
            };
            if (!dateInfo.start) {
                throw new Error("Date link is missing its start time");
            }
            await sendMessage({
                command: "createNewEventWindow",
                data: {
                    title: emailDetails.subject,
                    start: dateInfo.start,
                    end: dateInfo.end ?? null,
                },
            });
        } catch (error) {
            console.error("[date-detector] Could not create event", error);
        }
    };

    root.addEventListener("click", listener, true);
    return listener;
}

interface HTMLAbbrElement extends HTMLElement {
    dataset: DOMStringMap & { dateInfo?: string };
}

export {
    defaultLanguages,
    detectDateMatches,
    installDateClickHandler,
    linkifyDates,
    supportedLanguages,
};
