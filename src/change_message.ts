import { installDateClickHandler, linkifyDates } from "./date_detection";

interface EmailDetails {
    subject: string;
    date: Date | string | number;
    senderTimezone: number | null;
}

async function updateDOM(): Promise<void> {
    const emailDetails = await browser.runtime.sendMessage<EmailDetails>({
        command: "getEmailDetails",
    });
    const { dateDetectionLanguages } = await browser.storage.local.get("dateDetectionLanguages");
    const languages = Array.isArray(dateDetectionLanguages)
        ? dateDetectionLanguages.filter((language): language is string => typeof language === "string")
        : undefined;
    const referenceDate = new Date(emailDetails.date);

    linkifyDates(
        document.body,
        Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate,
        emailDetails.senderTimezone,
        languages,
    );

    installDateClickHandler(document.body, emailDetails, (message) =>
        browser.runtime.sendMessage(message)
    );
}

void updateDOM().catch((error: unknown) => {
    console.error("[date-detector] Could not process email dates", error);
});
