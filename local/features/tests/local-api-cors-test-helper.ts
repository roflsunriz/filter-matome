import type { Route } from "@playwright/test";

export const headers = {
  "Access-Control-Allow-Origin": "https://www.nicovideo.jp",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Filter-Matome-Series-Alerts",
};

export async function fulfillPreflight(route: Route): Promise<boolean> {
  if (route.request().method() !== "OPTIONS") return false;
  await route.fulfill({ status: 204, headers });
  return true;
}
