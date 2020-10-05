var oldHTML = document.body.innerHTML;
var newHTML = oldHTML;
var results = chrono.parse(oldHTML);
console.log(results);
results
    .reverse()
    .forEach(result => {
        // Now replace the element in the DOM
        let start = result.index;
        let end = start + result.text.length;
        let HTMLlength = newHTML.length;
        newHTML = (
            newHTML.slice(0, start) + 
            `<abbr title=${result.start.date().toString()}>${result.text}</abbr>` +
            newHTML.slice(end, HTMLlength)
        );
    });

document.body.innerHTML = newHTML;