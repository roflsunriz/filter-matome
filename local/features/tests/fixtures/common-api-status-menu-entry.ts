import { startApiStatusMenu } from "@/common/api-status-menu";

(
  window as Window & { startFilterMatomeApiStatusMenuTest?: () => void }
).startFilterMatomeApiStatusMenuTest = startApiStatusMenu;
