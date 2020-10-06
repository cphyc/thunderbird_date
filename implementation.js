var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

var eventCreator = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      eventCreator: {
        async createNewEventWindow(startDateTime, endTime, title) {
            cal.LOG(
                `[eventCreator]: startDateTime: ${startDateTime} endTime: ${endTime} title: ${title}`;
            )
        }
      }
    }
  }
};
