import * as chrono from 'chrono-node';

var oldHTML = document.body.innerHTML;
var newHTML = oldHTML;
var results = chrono.parse(oldHTML);

function generateLink(info) {
    return `<abbr class="_dateDetectorClickClass" title="Create event at ${info.startHuman}"` +
            `id='${JSON.stringify(info)}'>${info.text}</abbr>`;
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

var links = document.body.getElementsByClassName("_dateDetectorClickClass");
Array.prototype.forEach.call(
    links,
    date => {
        let dateInfo = JSON.parse(date.id);
        date.addEventListener('click', event => {
            browser.runtime.sendMessage(dateInfo);
        });
    });
