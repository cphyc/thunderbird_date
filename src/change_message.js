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

    // Concat results
    Array.prototype.concat(
        chrono.en.GB.parse(oldHTML),
        chrono.en.parse(oldHTML),
        chrono.fr.parse(oldHTML)
    ).filter((result, index, self) => {
        // Make sure all previous results are before the current one
        const thisStart = result.index;
        const thisEnd = result.index + result.text.length;
        console.log("INDEX", index);
        console.log("START ", thisStart);
        console.log("END   ", thisEnd);
        return self.slice(0, index).filter(e => {
            const otherStart = e.index;
            const otherEnd = e.index + e.text.length;
            // Make sure there is no overlap
            return !(thisStart >= otherEnd || thisEnd <= otherStart);
        }).length === 0;
    }).sort(
        // Sort by starting point (in reverse)
        (a, b) => b.index - a.index
    ).forEach((result) => {
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
