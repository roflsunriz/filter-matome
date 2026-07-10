import "@/common/common.js";
import "@/common/logger.js";
import { applyToastrStyles } from "@/common/toastr.js";
import "@/common/header.js";
import { applyCssConstants } from "@/common/css-constants.js";
import "@/common/material-icons.js";

let started = false;

export function startCommon(): void {
  if (started) {
    return;
  }
  started = true;

  applyCssConstants();
  applyToastrStyles();
}
