import type { GpacResponse, GpacTrack } from "@/types/movie-info-types";

type GpacRecord = Record<string, unknown>;

type GpacPropertyRow = {
  key: string;
  value: string;
};

type GpacMetric = {
  label: string;
  value: string;
  key?: string;
};

const GPAC_LABELS: Record<string, string> = {
  "@ref": "参照元",
  "@type": "種別",
  Analysis: "解析",
  AudioCount: "音声数",
  BitRate: "ビットレート",
  Channels: "チャンネル数",
  ChannelLayout: "チャンネル配置",
  Codec: "コーデック",
  CodecID: "Codec ID",
  ColorPrimaries: "色域原色",
  ColorRange: "色域範囲",
  ColorSpace: "色空間",
  CompleteName: "完全パス",
  Duration: "再生時間",
  DurationSeconds: "再生時間（秒）",
  FileName: "ファイル名",
  FileSize: "ファイルサイズ",
  Format: "フォーマット",
  FrameCount: "フレーム数",
  FrameRate: "フレームレート",
  FPS: "フレームレート",
  GpacInput: "GPAC入力",
  GpacInspection: "GPAC解析方式",
  GpacQuality: "品質選択",
  Height: "高さ",
  Input: "入力ファイル",
  InputType: "入力形式",
  Language: "言語",
  Level: "レベル",
  MatrixCoefficients: "マトリクス係数",
  Maxrate: "最大ビットレート",
  MediaDataSize: "メディアデータサイズ",
  MeasuredDuration: "実測再生時間",
  NumChannels: "チャンネル数",
  NumFrames: "フレーム数",
  OtherCount: "その他の数",
  OverallBitRate: "全体ビットレート",
  OverallBitRate_Mode: "全体ビットレートの算出方法",
  PixelAspectRatio: "ピクセルアスペクト比",
  PixelFormat: "ピクセル形式",
  Profile: "プロファイル",
  Quality: "品質",
  SampleRate: "サンプルレート",
  StreamCount: "ストリーム数",
  StreamSize: "ストリームサイズ",
  StreamType: "ストリーム種別",
  TimeScale: "タイムスケール",
  Timescale: "タイムスケール",
  TrackID: "トラックID",
  TransferCharacteristics: "伝達特性",
  VideoCount: "映像数",
  Width: "幅",
  analysis: "解析",
  name: "名前",
  quality: "品質選択",
  tool: "使用ツール",
  url: "公式URL",
  version: "バージョン",
};

const getRecord = (value: unknown): GpacRecord | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as GpacRecord;
};

const getValue = (record: GpacRecord | null, key: string): unknown =>
  record ? record[key] : undefined;

const getText = (record: GpacRecord | null, key: string): string | null => {
  const value = getValue(record, key);
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const getFirstText = (
  record: GpacRecord | null,
  keys: string[],
): { key: string; value: string } | null => {
  for (const key of keys) {
    const value = getText(record, key);
    if (value) {
      return { key, value };
    }
  }
  return null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDecimal = (value: number): string => {
  const rounded =
    Math.abs(value) >= 100
      ? Math.round(value * 10) / 10
      : Math.round(value * 1000) / 1000;
  return rounded.toLocaleString("ja-JP", {
    maximumFractionDigits: 3,
  });
};

const formatInteger = (value: number): string =>
  Math.round(value).toLocaleString("ja-JP");

const formatBytes = (value: number): string => {
  if (value < 0) {
    return String(value);
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${formatDecimal(size)} ${units[unitIndex]} (${formatInteger(value)} bytes)`;
};

const formatBitrate = (value: number): string => {
  if (value < 0) {
    return String(value);
  }
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let rate = value;
  let unitIndex = 0;
  while (rate >= 1000 && unitIndex < units.length - 1) {
    rate /= 1000;
    unitIndex += 1;
  }
  return `${formatDecimal(rate)} ${units[unitIndex]} (${formatInteger(value)} bps)`;
};

const formatDuration = (value: number): string => {
  if (value < 0) {
    return String(value);
  }
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  const clock = `${hours > 0 ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
  return `${clock} (${formatDecimal(value)} 秒)`;
};

const formatRawValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string") {
    return value.trim() || "-";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "（値なし）";
  } catch {
    return "（表示できない値）";
  }
};

const formatValue = (key: string, value: unknown): string => {
  const numeric = parseNumber(value);
  const normalizedKey = key.toLowerCase();
  if (numeric !== null) {
    if (key === "BitRate" || key === "Maxrate" || key === "OverallBitRate") {
      return formatBitrate(numeric);
    }
    if (key === "FileSize" || key === "StreamSize" || key === "MediaDataSize") {
      return formatBytes(numeric);
    }
    if (
      key === "Duration" ||
      key === "DurationSeconds" ||
      key === "MeasuredDuration"
    ) {
      return formatDuration(numeric);
    }
    if (key === "SampleRate") {
      return `${formatInteger(numeric)} Hz`;
    }
    if (key === "FrameRate" || key === "FPS") {
      return `${formatDecimal(numeric)} fps`;
    }
    if (key === "FrameCount" || key === "NumFrames") {
      return `${formatInteger(numeric)} frames`;
    }
    if (key === "Channels" || key === "NumChannels") {
      return `${formatInteger(numeric)} ch`;
    }
    if (key === "Width" || key === "Height") {
      return `${formatInteger(numeric)} px`;
    }
    if (normalizedKey.includes("count")) {
      return formatInteger(numeric);
    }
    return formatRawValue(value);
  }
  return formatRawValue(value);
};

const labelFor = (key: string): string => GPAC_LABELS[key] ?? key;

const createPropertyGrid = (rows: GpacPropertyRow[]): HTMLElement => {
  const grid = document.createElement("dl");
  grid.className = "summary-grid gpac-property-grid";
  rows.forEach(({ key, value }) => {
    const label = document.createElement("dt");
    label.textContent = labelFor(key);
    const rawKey = document.createElement("span");
    rawKey.className = "gpac-property-key";
    rawKey.textContent = key;
    label.appendChild(rawKey);

    const content = document.createElement("dd");
    content.textContent = value;
    if (key.includes("Name") || key.includes("Path") || key === "Input") {
      content.className = "gpac-property-value gpac-property-value--path";
    } else {
      content.className = "gpac-property-value";
    }
    grid.appendChild(label);
    grid.appendChild(content);
  });
  return grid;
};

const createMetricGrid = (metrics: GpacMetric[]): HTMLElement => {
  const grid = document.createElement("div");
  grid.className = "gpac-metric-grid";
  metrics.forEach(({ label, value, key }) => {
    const card = document.createElement("div");
    card.className = "gpac-metric-card";
    const labelElement = document.createElement("span");
    labelElement.className = "gpac-metric-label";
    labelElement.textContent = label;
    const valueElement = document.createElement("strong");
    valueElement.className = "gpac-metric-value";
    valueElement.textContent = value;
    card.appendChild(labelElement);
    card.appendChild(valueElement);
    if (key) {
      const keyElement = document.createElement("small");
      keyElement.className = "gpac-metric-key";
      keyElement.textContent = key;
      card.appendChild(keyElement);
    }
    grid.appendChild(card);
  });
  return grid;
};

const createSection = (
  kicker: string,
  title: string,
  description: string,
): { section: HTMLElement; body: HTMLElement } => {
  const section = document.createElement("section");
  section.className = "gpac-spec-section";
  const heading = document.createElement("header");
  heading.className = "gpac-section-heading";
  const kickerElement = document.createElement("p");
  kickerElement.className = "section-kicker";
  kickerElement.textContent = kicker;
  const titleElement = document.createElement("h3");
  titleElement.textContent = title;
  const descriptionElement = document.createElement("p");
  descriptionElement.className = "gpac-section-description";
  descriptionElement.textContent = description;
  heading.appendChild(kickerElement);
  heading.appendChild(titleElement);
  heading.appendChild(descriptionElement);
  const body = document.createElement("div");
  body.className = "gpac-section-body";
  section.appendChild(heading);
  section.appendChild(body);
  return { section, body };
};

const getTracks = (gpacInfo: GpacResponse): GpacTrack[] => {
  const tracks = gpacInfo.media?.track;
  return Array.isArray(tracks) ? tracks : [];
};

const getTrackType = (track: GpacTrack): string => {
  const type = getText(track, "@type") ?? getText(track, "StreamType");
  return type ?? "Other";
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case "General":
      return "コンテナ";
    case "Video":
      return "映像";
    case "Audio":
      return "音声";
    case "Text":
      return "字幕";
    case "Scene":
      return "シーン";
    default:
      return type;
  }
};

const getMetric = (
  label: string,
  record: GpacRecord | null,
  keys: string[],
): GpacMetric | null => {
  const selected = getFirstText(record, keys);
  if (!selected) {
    return null;
  }
  return {
    label,
    value: formatValue(selected.key, selected.value),
    key: selected.key,
  };
};

const getResolutionMetric = (track: GpacRecord | null): GpacMetric | null => {
  const width = getFirstText(track, ["Width", "ServiceWidth"]);
  const height = getFirstText(track, ["Height", "ServiceHeight"]);
  if (!width || !height) {
    return null;
  }
  const widthValue = parseNumber(width.value);
  const heightValue = parseNumber(height.value);
  const value =
    widthValue !== null && heightValue !== null
      ? `${formatInteger(widthValue)} × ${formatInteger(heightValue)} px`
      : `${width.value} × ${height.value}`;
  return { label: "解像度", value, key: `${width.key} × ${height.key}` };
};

const getTrackMetrics = (track: GpacTrack, type: string): GpacMetric[] => {
  const record = track as GpacRecord;
  const keys =
    type === "General"
      ? [
          getMetric("再生時間", record, ["DurationSeconds", "Duration"]),
          getMetric("全体ビットレート", record, ["OverallBitRate"]),
          getMetric("ファイルサイズ", record, ["FileSize"]),
          getMetric("メディアサイズ", record, ["MediaDataSize"]),
          getMetric("ストリーム数", record, ["StreamCount"]),
          getMetric("映像／音声", record, ["VideoCount", "AudioCount"]),
        ]
      : type === "Video"
        ? [
            getResolutionMetric(record),
            getMetric("フォーマット", record, ["Format"]),
            getMetric("コーデック", record, ["Codec", "CodecID"]),
            getMetric("ビットレート", record, ["BitRate"]),
            getMetric("最大ビットレート", record, ["Maxrate"]),
            getMetric("フレームレート", record, ["FrameRate", "FPS"]),
            getMetric("フレーム数", record, ["FrameCount", "NumFrames"]),
            getMetric("ピクセル形式", record, ["PixelFormat"]),
            getMetric("色空間", record, ["ColorSpace"]),
            getMetric("再生時間", record, ["DurationSeconds", "Duration"]),
          ]
        : type === "Audio"
          ? [
              getMetric("フォーマット", record, ["Format"]),
              getMetric("コーデック", record, ["Codec", "CodecID"]),
              getMetric("ビットレート", record, ["BitRate"]),
              getMetric("サンプルレート", record, ["SampleRate"]),
              getMetric("チャンネル数", record, ["Channels", "NumChannels"]),
              getMetric("チャンネル配置", record, ["ChannelLayout"]),
              getMetric("フレーム数", record, ["FrameCount", "NumFrames"]),
              getMetric("再生時間", record, ["DurationSeconds", "Duration"]),
            ]
          : [
              getMetric("フォーマット", record, ["Format"]),
              getMetric("コーデック", record, ["Codec", "CodecID"]),
              getMetric("再生時間", record, ["DurationSeconds", "Duration"]),
              getMetric("サイズ", record, ["StreamSize", "MediaDataSize"]),
            ];
  return keys.filter((metric): metric is GpacMetric => metric !== null);
};

const createTrackBadges = (track: GpacTrack): HTMLElement => {
  const badges = document.createElement("div");
  badges.className = "gpac-track-badges";
  ["Format", "Codec", "CodecID", "Language"].forEach((key) => {
    const value = getText(track, key);
    if (!value) {
      return;
    }
    const badge = document.createElement("span");
    badge.className = "gpac-track-badge";
    badge.textContent = value;
    badges.appendChild(badge);
  });
  return badges;
};

const createTrackCard = (
  track: GpacTrack,
  typeIndex: number,
  streamIndex: number,
): HTMLElement => {
  const type = getTrackType(track);
  const card = document.createElement("article");
  card.className = "gpac-stream-card";
  card.dataset["trackType"] = type.toLowerCase();

  const heading = document.createElement("header");
  heading.className = "gpac-stream-heading";
  const headingText = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "section-kicker";
  kicker.textContent = `STREAM ${String(streamIndex).padStart(2, "0")}`;
  const title = document.createElement("h4");
  title.textContent = `${getTypeLabel(type)} ${typeIndex}`;
  const rawType = document.createElement("span");
  rawType.className = "gpac-raw-type";
  rawType.textContent = type;
  title.appendChild(rawType);
  headingText.appendChild(kicker);
  headingText.appendChild(title);
  heading.appendChild(headingText);
  heading.appendChild(createTrackBadges(track));
  card.appendChild(heading);

  const metrics = getTrackMetrics(track, type);
  if (metrics.length > 0) {
    card.appendChild(createMetricGrid(metrics));
  }

  const properties = Object.entries(track)
    .filter(([key]) => key !== "@type")
    .map(([key, value]) => ({ key, value: formatValue(key, value) }));
  const details = document.createElement("details");
  details.className = "gpac-properties";
  details.open = true;
  const summary = document.createElement("summary");
  summary.textContent = `全属性（${String(properties.length)}項目）`;
  details.appendChild(summary);
  if (properties.length > 0) {
    details.appendChild(createPropertyGrid(properties));
  } else {
    const empty = document.createElement("p");
    empty.className = "gpac-empty-text";
    empty.textContent = "属性はありません。";
    details.appendChild(empty);
  }
  card.appendChild(details);
  return card;
};

const createMetadataSection = (
  gpacInfo: GpacResponse,
  general: GpacTrack | undefined,
): HTMLElement => {
  const media = getRecord(gpacInfo.media);
  const gpac = getRecord(gpacInfo.gpac);
  const library = getRecord(gpacInfo.creatingLibrary);
  const generalRecord = getRecord(general);
  const rows: GpacPropertyRow[] = [];
  const addRow = (key: string, value: unknown): void => {
    if (
      value !== undefined &&
      value !== null &&
      formatRawValue(value) !== "-"
    ) {
      rows.push({ key, value: formatValue(key, value) });
    }
  };

  addRow("@ref", getValue(media, "@ref"));
  addRow("Input", getValue(media, "Input"));
  addRow("InputType", getValue(media, "InputType"));
  addRow("Format", getValue(generalRecord, "Format"));
  addRow("FileName", getValue(generalRecord, "FileName"));
  addRow("GpacInspection", getValue(generalRecord, "GpacInspection"));
  addRow("GpacQuality", getValue(generalRecord, "GpacQuality"));
  addRow("analysis", getValue(gpac, "analysis"));
  addRow("quality", getValue(gpac, "quality"));
  addRow("tool", getValue(gpac, "tool") ?? getValue(library, "name"));
  addRow("version", getValue(library, "version"));
  addRow("url", getValue(library, "url"));

  const section = createSection(
    "CONTAINER / ANALYSIS",
    "入力と解析条件",
    "キャッシュの参照元、GPACへ渡した入力、品質選択、解析方式を確認できます。",
  );
  if (rows.length > 0) {
    section.body.appendChild(createPropertyGrid(rows));
  }
  return section.section;
};

const createOverview = (
  gpacInfo: GpacResponse,
  tracks: GpacTrack[],
  general: GpacTrack | undefined,
): HTMLElement => {
  const generalRecord = getRecord(general);
  const videoTracks = tracks.filter((track) => getTrackType(track) === "Video");
  const audioTracks = tracks.filter((track) => getTrackType(track) === "Audio");
  const video = getRecord(videoTracks[0]);
  const metrics: GpacMetric[] = [
    getMetric("再生時間", generalRecord, ["DurationSeconds", "Duration"]),
    getMetric("全体ビットレート", generalRecord, ["OverallBitRate"]),
    getMetric("ファイルサイズ", generalRecord, ["FileSize"]),
    getResolutionMetric(video),
    {
      label: "映像ストリーム",
      value: `${String(videoTracks.length)} 本`,
      key: "VideoCount",
    },
    {
      label: "音声ストリーム",
      value: `${String(audioTracks.length)} 本`,
      key: "AudioCount",
    },
  ].filter((metric): metric is GpacMetric => metric !== null);

  const section = createSection(
    "AT A GLANCE",
    "メディア仕様の要点",
    `${String(tracks.length)}本のストリームをGPACの全期間解析結果から集約しています。`,
  );
  section.body.appendChild(createMetricGrid(metrics));
  return section.section;
};

export const buildGpacSummary = (gpacInfo: GpacResponse): HTMLElement => {
  const container = document.createElement("div");
  container.className = "summary-container gpac-summary";
  const tracks = getTracks(gpacInfo);
  const general = tracks.find((track) => getTrackType(track) === "General");
  const videoCount = tracks.filter(
    (track) => getTrackType(track) === "Video",
  ).length;
  const audioCount = tracks.filter(
    (track) => getTrackType(track) === "Audio",
  ).length;

  const heading = document.createElement("div");
  heading.className = "gpac-summary-heading";
  const headingText = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "section-kicker";
  kicker.textContent = "FULL-DURATION PID INSPECTION";
  const title = document.createElement("h3");
  title.textContent = "GPAC解析結果";
  const description = document.createElement("p");
  description.className = "gpac-summary-description";
  description.textContent = `${String(videoCount)}映像 / ${String(audioCount)}音声 / ${String(tracks.length)}ストリーム`;
  headingText.appendChild(kicker);
  headingText.appendChild(title);
  headingText.appendChild(description);
  heading.appendChild(headingText);

  const library = getRecord(gpacInfo.creatingLibrary);
  const version = getText(library, "version");
  if (version) {
    const badge = document.createElement("span");
    badge.className = "gpac-version-badge";
    badge.textContent = version;
    heading.appendChild(badge);
  }
  container.appendChild(heading);

  if (tracks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "gpac-empty-text";
    empty.textContent =
      "GPACからストリーム情報を取得できませんでした。Raw JSONでレスポンスを確認してください。";
    container.appendChild(empty);
    return container;
  }

  container.appendChild(createOverview(gpacInfo, tracks, general));
  container.appendChild(createMetadataSection(gpacInfo, general));

  const streamSection = createSection(
    "STREAMS",
    "ストリーム別仕様",
    "映像・音声・その他のPIDごとに、主要値とGPACが返した全属性を表示します。",
  );
  const streamList = document.createElement("div");
  streamList.className = "gpac-stream-list";
  const usedIndex = new Map<string, number>();
  tracks.forEach((track, index) => {
    const type = getTrackType(track);
    const nextIndex = (usedIndex.get(type) ?? 0) + 1;
    usedIndex.set(type, nextIndex);
    streamList.appendChild(createTrackCard(track, nextIndex, index + 1));
  });
  streamSection.body.appendChild(streamList);
  container.appendChild(streamSection.section);

  if (tracks.length > 0) {
    const footer = document.createElement("p");
    footer.className = "gpac-summary-note";
    footer.textContent =
      "表示値はGPACレスポンスの属性を整形したものです。元の値は各属性名とRaw JSONから確認できます。";
    container.appendChild(footer);
  }
  return container;
};
