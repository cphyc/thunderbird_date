const LANGUAGE_STORAGE_KEY = "dateDetectionLanguages";
const languageList = document.getElementById("language-list");
const form = document.getElementById("language-form");
const status = document.getElementById("status");
let supportedLanguages = [];

async function initializeOptions() {
    const response = await fetch(browser.runtime.getURL("languages.json"));
    if (!response.ok) {
        throw new Error(`Could not load supported languages: ${response.status}`);
    }
    supportedLanguages = await response.json();

    const stored = await browser.storage.local.get(LANGUAGE_STORAGE_KEY);
    const selected = stored[LANGUAGE_STORAGE_KEY] ?? supportedLanguages.map(({ code }) => code);

    for (const { code, name } of supportedLanguages) {
        const label = document.createElement("label");
        label.className = "language-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "language";
        checkbox.value = code;
        checkbox.checked = selected.includes(code);
        label.append(checkbox, document.createTextNode(name));
        languageList.appendChild(label);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    const selected = Array.from(form.elements.language)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

    if (selected.length === 0) {
        status.textContent = "Select at least one option.";
        return;
    }

    try {
        await browser.storage.local.set({ [LANGUAGE_STORAGE_KEY]: selected });
        status.textContent = "Settings saved.";
    } catch (error) {
        console.error("[date-detector] Could not save settings", error);
        status.textContent = "Could not save settings. Check the Error Console.";
    }
});

document.getElementById("select-all").addEventListener("click", () => {
    for (const checkbox of form.elements.language) {
        checkbox.checked = true;
    }
});

document.getElementById("deselect-all").addEventListener("click", () => {
    for (const checkbox of form.elements.language) {
        checkbox.checked = false;
    }
});

initializeOptions().catch((error) => {
    console.error("[date-detector] Could not load settings", error);
    status.textContent = "Could not load settings. Check the Error Console.";
});
