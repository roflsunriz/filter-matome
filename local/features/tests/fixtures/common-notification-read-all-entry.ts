import { startNotificationReadAll } from "@/common/notification-read-all";
import { applyToastrStyles } from "@/common/toastr";

applyToastrStyles();

Object.assign(window, {
  startNotificationReadAllTest: startNotificationReadAll,
});
