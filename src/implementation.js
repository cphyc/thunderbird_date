var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Prepare the scope to be able to open a new calendar event
var scope = {};
scope.window = Services.wm.getMostRecentWindow("mail:3pane");
scope.document = scope.window.document;
scope.openDialog = scope.window.openDialog.bind(scope.window);

// Load the relevant scripts
Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-management.js", scope, "UTF-8");
Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-views-utils.js", scope, "UTF-8");
Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-item-editing.js", scope, "UTF-8");
Services.scriptloader.loadSubScript("chrome://global/content/globalOverlay.js", scope, "UTF-8");


// Build the experiment API
var eventCreator = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      eventCreator: {
        async createNewEventWindow (startDateTime, endDateTime, content) {
            cal.LOG(`[eventCreator] Creating new event with title ${this.title}`);
            let startDate = cal.dtz.jsDateToDateTime(new Date(startDateTime), cal.dtz.defaultTimezone);
            let endDate = endDateTime ? cal.dtz.jsDateToDateTime(new Date(startDateTime), cal.dtz.defaultTimezone) : null;
            scope.createEventWithDialog(null, startDate, endDate, this.title);
        },
        async setTitle (title) {
            this.title = title;
        }
      }
    }
  }
};
