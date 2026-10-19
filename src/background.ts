const MESSAGE_DISPLAY_SCRIPT_ID: string = "date-detector-message-display";
const MESSAGE_DISPLAY_SCRIPT: MessageDisplayScript = {
    id: MESSAGE_DISPLAY_SCRIPT_ID,
    js: ["dist/change_message.bundle.js"],
    css: ["date_detector.css"],
    runAt: "document_idle",
};

function logError(action: string, error: unknown): void {
    console.error(`[date-detector] ${action}`, error);
}

async function injectIntoDisplayedMessages(): Promise<void> {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
        if (typeof tab.id !== "number") {
            continue;
        }

        try {
            const displayed = await browser.messageDisplay.getDisplayedMessages(tab.id);
            if (!displayed.messages.length) {
                continue;
            }

            await browser.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ["date_detector.css"],
            });
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["dist/change_message.bundle.js"],
            });
        } catch (error) {
            logError(`Could not inject into already-open message tab ${tab.id}`, error);
        }
    }
}

let initializationPromise: Promise<void> | undefined;
function initializeMessageDisplayScripts(): Promise<void> {
    if (!initializationPromise) {
        initializationPromise = (async () => {
            const registered = await browser.scripting.messageDisplay.getRegisteredScripts({
                ids: [MESSAGE_DISPLAY_SCRIPT_ID],
            });
            if (!registered.length) {
                await browser.scripting.messageDisplay.registerScripts([MESSAGE_DISPLAY_SCRIPT]);
            }

            await injectIntoDisplayedMessages();
        })().catch((error) => {
            initializationPromise = undefined;
            throw error;
        });
    }
    return initializationPromise;
}

browser.runtime.onInstalled.addListener(() =>
    initializeMessageDisplayScripts().catch((error) => {
        logError("Could not register message display scripts", error);
    })
);

browser.runtime.onStartup.addListener(() =>
    initializeMessageDisplayScripts().catch((error) => {
        logError("Could not initialize message display scripts", error);
    })
);

function parseSenderTimezone(dateHeader?: string): number | null {
    const match = dateHeader && dateHeader.match(/([+-])(\d{2}):?(\d{2})(?:\s+\([^)]*\))?\s*$/);
    if (!match) {
        return null;
    }

    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    if (hours > 14 || minutes >= 60 || (hours === 14 && minutes !== 0)) {
        return null;
    }
    if (match[1] === "-" && hours === 0 && minutes === 0) {
        return null;
    }

    return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}

async function getEmailDetails(tabId: number): Promise<{
    subject: string;
    date: Date | string | number;
    senderTimezone: number | null;
}> {
    const displayed = await browser.messageDisplay.getDisplayedMessages(tabId);
    const messageHeader = displayed.messages[0];
    if (!messageHeader) {
        throw new Error(`No message is displayed in tab ${tabId}`);
    }

    const fullMessage = await browser.messages.getFull(messageHeader.id);
    const dateHeader = fullMessage.headers.date && fullMessage.headers.date[0];
    return {
        subject: messageHeader.subject,
        date: messageHeader.date,
        senderTimezone: parseSenderTimezone(dateHeader),
    };
}

interface GetEmailDetailsCommand {
    command: "getEmailDetails";
}

interface CreateEventCommand {
    command: "createNewEventWindow";
    data: {
        title: string;
        start: string;
        end?: string | null;
    };
}

type BackgroundCommand = GetEmailDetailsCommand | CreateEventCommand;

async function doHandleCommand(message: BackgroundCommand, sender: MessageSender): Promise<unknown> {
    switch (message.command) {
        case "getEmailDetails": {
            if (typeof sender.tab?.id !== "number") {
                throw new Error("Email details requested outside a message tab");
            }
            return getEmailDetails(sender.tab.id);
        }

        case "createNewEventWindow": {
            const data = message.data;
            if (!data || typeof data.title !== "string" || typeof data.start !== "string") {
                throw new Error("Invalid event details received from the message");
            }

            if (typeof data.end === "string" && data.end) {
                return browser.eventCreator.createNewEventWindow(data.title, data.start, data.end);
            }
            return browser.eventCreator.createNewEventWindow(data.title, data.start);
        }

        default:
            return undefined;
    }
}

function isBackgroundCommand(message: unknown): message is BackgroundCommand {
    if (typeof message !== "object" || message === null || !("command" in message)) {
        return false;
    }
    if (message.command === "getEmailDetails") {
        return true;
    }
    if (message.command !== "createNewEventWindow" || !("data" in message)) {
        return false;
    }
    const data = message.data;
    return typeof data === "object" && data !== null &&
        "title" in data && typeof data.title === "string" &&
        "start" in data && typeof data.start === "string" &&
        (!("end" in data) || typeof data.end === "string" || data.end === null);
}

browser.runtime.onMessage.addListener((message, sender) => {
    if (!isBackgroundCommand(message)) {
        return undefined;
    }

    return doHandleCommand(message, sender).catch((error: unknown) => {
        logError(`Command "${message.command}" failed`, error);
        throw error;
    });
});
