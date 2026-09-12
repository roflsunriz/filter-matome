export interface OfficialBufferingState {
  videoId: string;
  videoQualityId: string;
  audioQualityId: string;
  videoMode: string;
  audioBitrate: number;
  ready: boolean;
}
export interface PreloadResource {
  url: string;
  rangeStart?: number;
  rangeEnd?: number;
}
export interface OfficialPreloadPlan extends OfficialBufferingState {
  resources: PreloadResource[];
}
export interface OfficialBufferingApi {
  version: 2;
  getState(): unknown;
  getPlan(): unknown;
}

export function getOfficialBufferingApi(
  host: Record<string, unknown>,
): OfficialBufferingApi | null {
  const value = host["FilterMatomeBufferingApi"];
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 2 ||
    !("getState" in value) ||
    typeof value.getState !== "function" ||
    !("getPlan" in value) ||
    typeof value.getPlan !== "function"
  )
    return null;
  return value as OfficialBufferingApi;
}
function isState(value: unknown): value is OfficialBufferingState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.videoId === "string" &&
    typeof state.videoQualityId === "string" &&
    typeof state.audioQualityId === "string" &&
    typeof state.videoMode === "string" &&
    typeof state.audioBitrate === "number" &&
    Number.isFinite(state.audioBitrate) &&
    state.audioBitrate > 0 &&
    typeof state.ready === "boolean"
  );
}
export function readOfficialBufferingState(
  api: OfficialBufferingApi,
): OfficialBufferingState | null {
  const state = api.getState();
  if (state === null) return null;
  if (!isState(state)) throw new TypeError("Invalid buffering API state");
  return state;
}
export function readOfficialPreloadPlan(
  api: OfficialBufferingApi,
): OfficialPreloadPlan {
  const value = api.getPlan();
  if (
    !isState(value) ||
    !("resources" in value) ||
    !Array.isArray(value.resources) ||
    !value.resources.length ||
    !value.resources.every((resource: unknown) => {
      if (
        typeof resource !== "object" ||
        resource === null ||
        !("url" in resource) ||
        typeof resource.url !== "string"
      )
        return false;
      const item = resource as PreloadResource;
      return (
        (item.rangeStart === undefined && item.rangeEnd === undefined) ||
        (Number.isSafeInteger(item.rangeStart) &&
          Number.isSafeInteger(item.rangeEnd) &&
          item.rangeStart! >= 0 &&
          item.rangeEnd! > item.rangeStart!)
      );
    })
  )
    throw new TypeError("Invalid preload plan");
  return value as OfficialPreloadPlan;
}
export function preloadQualityKey(state: OfficialBufferingState): string {
  return `${state.videoId}/${state.videoQualityId}/${state.audioQualityId}`;
}
