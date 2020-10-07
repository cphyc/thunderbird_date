var oldHTML = document.body.innerHTML;
var newHTML = oldHTML;
var results = chrono.parse(oldHTML);
console.log(results);


function generateLink(info) {
    return `<abbr class="clickme" title="${info.start.date().toLocaleString()}"` +
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
        newHTML = (
            newHTML.slice(0, start) +
            generateLink(result) +
            newHTML.slice(end, length)
        );
    });

document.body.innerHTML = newHTML;
function createEvent(dateInfo) {
    messenger.eventCreator.createNewEventWindow("foo", "bar", "baz");
}

var links = document.body.getElementsByClassName("clickme");
Array.prototype.forEach.call(
    links,
    date => {
        let dateInfo = JSON.parse(date.id);
        date.addEventListener('click', event => {
            console.log(date.title, dateInfo);
            createEvent(dateInfo);
        });
    });
