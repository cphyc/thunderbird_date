var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var scope = {};
scope.window = Services.wm.getMostRecentWindow("mail:3pane");
scope.document = scope.window.document;
scope.openDialog = scope.window.openDialog.bind(scope.window);

Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-management.js", scope, "UTF-8");
Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-views-utils.js", scope, "UTF-8");
Services.scriptloader.loadSubScript("chrome://calendar/content/calendar-item-editing.js", scope, "UTF-8");
// calendar/base/content/calendar-extract.js

cal.LOG("Here!");
var eventCreator = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      eventCreator: {
        async createNewEventWindow (startDateTime, endTime) {
            cal.LOG(`Opening ${title}`);
            scope.createEventWithDialog(null, null, null, title);
        },
        async setTitle (title) {
            this.title = title;
        }
      }
    }
  }
};
