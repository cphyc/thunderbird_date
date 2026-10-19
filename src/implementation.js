var { ExtensionCommon } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
var { cal } = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");

function getCalendarWindow() {
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
var eventCreator = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      eventCreator: {
        async createNewEventWindow (title, startDateTime, endDateTime) {
            var window = getCalendarWindow();
            let startDate = cal.dtz.jsDateToDateTime(new Date(startDateTime), cal.dtz.defaultTimezone);
            let endDate = endDateTime ? cal.dtz.jsDateToDateTime(new Date(endDateTime), cal.dtz.defaultTimezone) : null;
            window.createEventWithDialog(null, startDate, endDate, title);
        },
      }
    }
  }
};
