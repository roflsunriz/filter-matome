import { CommentsTabController } from "@/mlink-video-controller/tab-controllers/comments-tab";
import { LinksTabController } from "@/mlink-video-controller/tab-controllers/links-tab";
import { PanelNavigationController } from "@/mlink-video-controller/tab-controllers/navigation";
import { PlaybackTabController } from "@/mlink-video-controller/tab-controllers/playback-tab";
import { SpeedTabController } from "@/mlink-video-controller/tab-controllers/speed-tab";
import { VolumeTabController } from "@/mlink-video-controller/tab-controllers/volume-tab";
import { ModuleManager } from "@/mlink-video-controller/module-handlers/module-manager";
import { SettingsUI } from "@/mlink-video-controller/module-handlers/settings-ui";
import { normalizeModuleSettingsForRegistry } from "@/mlink-video-controller/module-handlers/settings-normalizer";
import {
  ThumbnailsFilterModule,
  thumbnailsFilterModuleConfig,
} from "@/mlink-video-controller/modules/thumbnails-filter-module";
import {
  HeaderModule,
  headerModuleConfig,
} from "@/mlink-video-controller/modules/header-module";
import { BackgroundImageSettings } from "@/mlink-video-controller/modules/background-image-settings";
import {
  WatchHarajukuModule,
  watchHarajukuModuleConfig,
} from "@/mlink-video-controller/modules/watch-harajuku-module";
import { LinkManager } from "@/mlink-video-controller/services/link-manager";

Object.assign(window, {
  MlinkTabControllers: {
    PanelNavigationController,
    PlaybackTabController,
    SpeedTabController,
    VolumeTabController,
    LinksTabController,
    CommentsTabController,
    ModuleManager,
    SettingsUI,
    normalizeModuleSettingsForRegistry,
    ThumbnailsFilterModule,
    thumbnailsFilterModuleConfig,
    HeaderModule,
    headerModuleConfig,
    BackgroundImageSettings,
    WatchHarajukuModule,
    watchHarajukuModuleConfig,
    LinkManager,
  },
});
