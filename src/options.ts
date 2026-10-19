interface SupportedLanguage {
    code: string;
    name: string;
}

const LANGUAGE_STORAGE_KEY = "dateDetectionLanguages";
const languageList = document.querySelector<HTMLDivElement>("#language-list");
const form = document.querySelector<HTMLFormElement>("#language-form");
const statusElement = document.querySelector<HTMLParagraphElement>("#status");
const selectAllButton = document.querySelector<HTMLButtonElement>("#select-all");
const deselectAllButton = document.querySelector<HTMLButtonElement>("#deselect-all");
if (!languageList || !form || !statusElement || !selectAllButton || !deselectAllButton) {
    throw new Error("Date detector settings page is missing required controls");
}
const languageContainer = languageList;

let supportedLanguages: SupportedLanguage[] = [];

async function initializeOptions(): Promise<void> {
    const response = await fetch(browser.runtime.getURL("languages.json"));
    if (!response.ok) {
        throw new Error(`Could not load supported languages: ${response.status}`);
    }
    supportedLanguages = await response.json() as SupportedLanguage[];

    const stored = await browser.storage.local.get(LANGUAGE_STORAGE_KEY);
    const storedLanguages = stored[LANGUAGE_STORAGE_KEY];
    const selected = Array.isArray(storedLanguages)
        ? storedLanguages.filter((code): code is string => typeof code === "string")
        : supportedLanguages.map(({ code }) => code);

    for (const { code, name } of supportedLanguages) {
        const label = document.createElement("label");
        label.className = "language-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "language";
        checkbox.value = code;
        checkbox.checked = selected.includes(code);
        label.append(checkbox, document.createTextNode(name));
        languageContainer.appendChild(label);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusElement.textContent = "";
    const selected = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="language"]'))
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

    if (selected.length === 0) {
        statusElement.textContent = "Select at least one option.";
        return;
    }

    try {
        await browser.storage.local.set({ [LANGUAGE_STORAGE_KEY]: selected });
        statusElement.textContent = "Settings saved.";
    } catch (error) {
        console.error("[date-detector] Could not save settings", error);
        statusElement.textContent = "Could not save settings. Check the Error Console.";
    }
});

selectAllButton.addEventListener("click", () => {
    for (const checkbox of form.querySelectorAll<HTMLInputElement>('input[name="language"]')) {
        checkbox.checked = true;
    }
});

deselectAllButton.addEventListener("click", () => {
    for (const checkbox of form.querySelectorAll<HTMLInputElement>('input[name="language"]')) {
        checkbox.checked = false;
    }
});

initializeOptions().catch((error) => {
    console.error("[date-detector] Could not load settings", error);
    statusElement.textContent = "Could not load settings. Check the Error Console.";
});
