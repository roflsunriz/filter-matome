import "./common.js";
import "./logger.js";
import { applyToastrStyles } from "./toastr.js";
import "./header.js";
import { applyCssConstants } from "./css-constants.js";
import "./material-icons.js";

// スタイルを自動適用
applyCssConstants();
applyToastrStyles();