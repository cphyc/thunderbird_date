// Store current email title on opening
browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    messenger.eventCreator.setTitle(message.subject);

});

// Listen to content script message and pass them to our experiment
browser.runtime.onMessage.addListener((message) => {
    browser.eventCreator.createNewEventWindow(message.start, message.end);
});

// Inject the content script
let myPromise = messenger.messageDisplayScripts.register({
    js: [
        { file: "/dist/change_message.bundle.js"}
    ],
});