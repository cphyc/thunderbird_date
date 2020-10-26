import * as chrono from 'chrono-node';

var oldHTML = document.body.innerHTML;
var newHTML = oldHTML;
var results = chrono.parse(oldHTML);

function generateLink(info) {
    let id_json = encodeURI(JSON.stringify(info));
    return `<abbr class="_dateDetectorClickClass" title="Create event at ${info.startHuman}"` +
            `id="${id_json}">${info.text}</abbr>`;
}
// TODO: we want to use https://github.com/wanasit/chrono/tree/v1.x.x#parsing-options
// with the date at which the email was received
results
    .reverse()
    .forEach(result => {
        // Now replace the element in the DOM
        let start = result.index;
        let end = start + result.text.length;
        let length = newHTML.length;
        let trimmedResult = {
            text: result.text,
            start: result.start.date().toJSON(),
            startHuman: result.start.date().toLocaleString(),
            end: result.end ? result.end.date().toJSON() : null
        };
        newHTML = (
            newHTML.slice(0, start) +
            generateLink(trimmedResult) +
            newHTML.slice(end, length)
        );
    });

document.body.innerHTML = newHTML;

function createEvent(link) {
    let dateInfo = JSON.parse(decodeURI(link.id));
    link.addEventListener('click', event => {
        browser.runtime.sendMessage(dateInfo);
    });
}

var links = document.body.getElementsByClassName("_dateDetectorClickClass");
for (let link of links) {
    createEvent(link);
}
