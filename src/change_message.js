import { installDateClickHandler, linkifyDates } from "./date_detection";

const updateDOM = async () => {
    const emailDetails = await browser.runtime.sendMessage({
        command: "getEmailDetails",
    });
    const { dateDetectionLanguages } = await browser.storage.local.get("dateDetectionLanguages");
    const referenceDate = new Date(emailDetails.date);

    linkifyDates(
        document.body,
        Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate,
        emailDetails.senderTimezone,
        dateDetectionLanguages,
    );

    installDateClickHandler(document.body, emailDetails, (message) =>
        browser.runtime.sendMessage(message)
    );
};

updateDOM();
