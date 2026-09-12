import { PlaybackTabController } from "../../src/mlink-video-controller/tab-controllers/playback-tab";
import { playbackTemplate } from "../../src/mlink-video-controller/templates/playback";
import { controlsStyles } from "../../src/mlink-video-controller/styles/controls";
import { panelStyles } from "../../src/mlink-video-controller/styles/panel";
import {
  BasePanel,
  basePanelStyles,
} from "../../src/mlink-video-controller/panels/base";

class PlaybackToolsFixture extends BasePanel {
  controller: PlaybackTabController | null = null;
  connectedCallback(): void {
    this.shadow.innerHTML = `<style>${basePanelStyles}${panelStyles}${controlsStyles}
      :host { --panel-fg: #fafafa; --panel-accent: #578dcc; --panel-border: #667; --panel-bg: #202838; --panel-radius:12px; }
      .heatmap-container { display:none; }
      .x-sec-jump-btn { min-width:0; }
      #fab { position:relative; inset:auto; }
    </style><button id="fab">Open</button><div class="panel"><div id="playback" class="tab active">${playbackTemplate}</div></div>`;
    this.setupFab("Open", "Open");
    this.openPanel();
    const video = () => document.querySelector<HTMLVideoElement>("video")!;
    this.controller = new PlaybackTabController(
      this.shadow,
      {
        seekToPosition: (position) => {
          video().currentTime = position * video().duration;
        },
        seek: () => {},
        togglePlayPause: () => {},
      },
      {
        startTimeUpdateInterval: () => {},
        setupPlayStateListener: () => {},
        updatePlayPauseButton: () => {},
        toggleLoop: () => this.controller?.disableABRepeat(),
        updateLoopButtonAppearance: () => {},
        onABRepeatEnabled: () => {},
      },
    );
    this.controller.bind();
  }
  disconnectedCallback(): void {
    this.controller?.destroy();
    super.disconnectedCallback();
  }
}
customElements.define("playback-tools-fixture", PlaybackToolsFixture);
