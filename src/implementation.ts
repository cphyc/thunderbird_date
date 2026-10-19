const extensionCommonModule = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
const calendarModule = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");
const { ExtensionCommon: ExtensionApi } = extensionCommonModule as {
    ExtensionCommon: typeof ExtensionCommon;
};
const { cal } = calendarModule as { cal: CalendarUtilities };

function getCalendarWindow(): CalendarWindow {
  var window = Services.wm.getMostRecentWindow("mail:3pane");
  if (!window) {
    throw new Error("Could not find the Thunderbird mail window");
  }
  if (typeof window.createEventWithDialog !== "function") {
    throw new Error("Thunderbird did not expose the calendar event dialog in the mail window");
  }
  return window;
}


// Build the experiment API
var eventCreator = class extends ExtensionApi.ExtensionAPI {
  override getAPI(_context: unknown): object {
    return {
      eventCreator: {
        async createNewEventWindow(
            title: string,
            startDateTime: string,
            endDateTime?: string,
        ): Promise<void> {
            const window = getCalendarWindow();
            const startDate = cal.dtz.jsDateToDateTime(
                new Date(startDateTime),
                cal.dtz.defaultTimezone,
            );
            const endDate = endDateTime
                ? cal.dtz.jsDateToDateTime(new Date(endDateTime), cal.dtz.defaultTimezone)
                : null;
            window.createEventWithDialog(null, startDate, endDate, title);
        },
      }
    }
  }
};
