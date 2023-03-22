// Wait for message to be displayed to inject js/css
browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    await browser.tabs.insertCSS(tab.id, {
        code: `
        abbr._dateDetectorClickClass {
            cursor: pointer;
        }`
    });
    await browser.tabs.executeScript(tab.id, {
        file: "/dist/change_message.bundle.js"
    });
});

/**
* command handler: handles the commands received from the content script
*/
const doHandleCommand = async (message, sender) => {
    const { command } = message;
    const {
        tab: { id: tabId },
    } = sender;
    
    const messageHeader = await browser.messageDisplay.getDisplayedMessage(tabId);
    
    // Check for known commands.
    switch (command.toLocaleLowerCase()) {
        case "getemaildetails":
        {
            return {
                subject: messageHeader.subject,
                date: messageHeader.date,
            };
        }
        break;

        case "createneweventwindow":
        {
            if (!message.data) {
                return;
            }
            browser.eventCreator.createNewEventWindow(
                message.data.title,
                message.data.start,
                message.data.end ? message.data.end : "",
            );
        }
        break;
    }
};

// Listen to content script message and pass them to our experiment
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.hasOwnProperty("command")) {
        return doHandleCommand(message, sender);
    };
});
