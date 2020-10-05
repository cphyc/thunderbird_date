// browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
//     console.log(`Message displayed in tab ${tab.id}: ${message.subject}`);
//     console.log(message, tab);
// });

let myPromise = messenger.messageDisplayScripts.register({
    js: [
        { file: "/chrono.js"},
        { file: "/change_message.js"}
    ],
});