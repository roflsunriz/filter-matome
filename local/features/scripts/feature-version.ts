const FEATURE_VERSION_PATTERN = /^\d+(?:\.\d+)?$/u;

export function parseFeatureVersion(value: unknown): string {
  const featureVersion = String(value ?? "").trim();
  if (!FEATURE_VERSION_PATTERN.test(featureVersion)) {
    throw new Error(`Invalid package version: ${featureVersion}`);
  }
  return featureVersion;
}
