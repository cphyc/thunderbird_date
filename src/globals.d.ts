interface MessageHeader {
    id: number;
    subject: string;
    date: Date | string | number;
}

interface MessageSender {
    tab?: {
        id?: number;
    };
}

interface MessageDisplayScript {
    id: string;
    js: string[];
    css?: string[];
    runAt: "document_idle";
}

interface ThunderbirdBrowser {
    tabs: {
        query(queryInfo: object): Promise<Array<{ id?: number }>>;
    };
    messageDisplay: {
        getDisplayedMessages(tabId: number): Promise<{ messages: MessageHeader[] }>;
    };
    messages: {
        getFull(messageId: number): Promise<{
            headers: Record<string, string[] | undefined>;
        }>;
    };
    scripting: {
        insertCSS(details: {
            target: { tabId: number };
            files: string[];
        }): Promise<void>;
        executeScript(details: {
            target: { tabId: number };
            files: string[];
        }): Promise<unknown>;
        messageDisplay: {
            getRegisteredScripts(filter: { ids: string[] }): Promise<MessageDisplayScript[]>;
            registerScripts(scripts: MessageDisplayScript[]): Promise<void>;
        };
    };
    storage: {
        local: {
            get(key: string): Promise<Record<string, unknown>>;
            set(items: Record<string, unknown>): Promise<void>;
        };
    };
    runtime: {
        getURL(path: string): string;
        sendMessage<T = unknown>(message: unknown): Promise<T>;
        onInstalled: {
            addListener(listener: () => void | Promise<void>): void;
        };
        onStartup: {
            addListener(listener: () => void | Promise<void>): void;
        };
        onMessage: {
            addListener(
                listener: (message: unknown, sender: MessageSender) => unknown | Promise<unknown>,
            ): void;
        };
    };
    eventCreator: {
        createNewEventWindow(
            title: string,
            startDateTime: string,
            endDateTime?: string,
        ): Promise<void>;
    };
}

declare const browser: ThunderbirdBrowser;

interface CalendarWindow {
    createEventWithDialog(
        calendar: null,
        startDate: unknown,
        endDate: unknown,
        summary: string,
    ): void;
}

interface CalendarUtilities {
    dtz: {
        defaultTimezone: unknown;
        jsDateToDateTime(date: Date, timezone: unknown): unknown;
    };
}

declare namespace ExtensionCommon {
    abstract class ExtensionAPI {
        abstract getAPI(context: unknown): object;
    }
}

declare const ChromeUtils: {
    importESModule(url: string):
        | { ExtensionCommon: typeof ExtensionCommon }
        | { cal: CalendarUtilities };
};

declare const Services: {
    wm: {
        getMostRecentWindow(type: "mail:3pane"): CalendarWindow | null;
    };
};
