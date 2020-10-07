browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    console.log(`Message displayed in tab ${tab.id}: ${message.subject}`);
    let promise = messenger.eventCreator.setTitle(message.subject);
});

let myPromise = messenger.messageDisplayScripts.register({
    js: [
        { file: "/chrono.js"},
        { file: "/change_message.js"}
    ],
});