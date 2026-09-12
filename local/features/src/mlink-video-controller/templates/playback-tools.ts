export const playbackToolsTemplate = `
<section class="playback-tools" data-playback-tools>
  <div class="playback-tool" data-full-buffer>
    <div class="playback-tool-heading">
      <strong data-copy="bufferTitle"></strong>
      <button type="button" class="playback-tool-btn" data-action="full-buffer" aria-pressed="false"></button>
    </div>
    <progress data-buffer-progress max="100" value="0"></progress>
    <p data-buffer-status role="status" aria-live="polite"></p>
    <p class="playback-tool-help" data-copy="bufferHelp"></p>
  </div>
  <div class="playback-tool" data-ab-repeat>
    <strong data-copy="repeatTitle"></strong>
    <div class="ab-repeat-points">
      <label><span data-copy="pointA"></span><input data-point="a" type="text" inputmode="decimal" placeholder="0:00.000" dir="ltr"><button type="button" class="playback-tool-btn" data-action="set-a" data-copy="setCurrent"></button></label>
      <label><span data-copy="pointB"></span><input data-point="b" type="text" inputmode="decimal" placeholder="0:00.000" dir="ltr"><button type="button" class="playback-tool-btn" data-action="set-b" data-copy="setCurrent"></button></label>
    </div>
    <div class="playback-tool-actions">
      <button type="button" class="playback-tool-btn" data-action="ab-toggle" aria-pressed="false" disabled></button>
      <button type="button" class="playback-tool-btn" data-action="ab-clear" data-copy="clear"></button>
    </div>
    <p data-ab-status role="status" aria-live="polite"></p>
    <p class="playback-tool-help" data-copy="repeatHelp"></p>
  </div>
</section>`;
