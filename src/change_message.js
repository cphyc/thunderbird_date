import * as chrono from 'chrono-node';

function generateLink(info) {
    let id_json = encodeURI(JSON.stringify(info));

    return `<abbr class="_dateDetectorClickClass" ` +
                 `title="Create event at ${info.startHuman}" ` +
                 `id="${id_json}">${info.text}</abbr>`;
}


const updateDOM = async () => {
    let emailDetails = await browser.runtime.sendMessage({
        command: "getEmailDetails",
    });
    const {subject, date} = emailDetails;
    const oldHTML = document.body.innerHTML;
    var newHTML = oldHTML;
    
    chrono.parse(oldHTML, date).reverse().forEach((result) => {
        if (!result) return;
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

    Array.prototype.forEach.call(
        document.body.getElementsByClassName("_dateDetectorClickClass"),
        (link) => {
            let dateInfo = JSON.parse(decodeURI(link.id));
            link.addEventListener('click', async () => {
                browser.runtime.sendMessage({
                    command: "createNewEventWindow",
                    data: {
                        title: subject,
                        start: dateInfo.start,
                        end: dateInfo.end
                    }
                });
            });
        }
    );
};

updateDOM();
