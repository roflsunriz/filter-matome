export const speedTemplate = `
<div class="range-control">
  <label>再生速度: <span class="speed-label">1.00</span></label>
  <input type="range" min="0.1" max="5.0" step="0.01" value="1.0" class="speed-range">
</div>

<div class="control-grid">
  <button class="speed-preset" data-speed="0.1">x0.1</button>
  <button class="speed-preset" data-speed="0.5">x0.5</button>
  <button class="speed-preset" data-speed="1.0">x1.0</button>
  <button class="speed-preset" data-speed="1.5">x1.5</button>
</div>

<div class="control-grid">
  <button class="speed-preset" data-speed="2.0">x2.0</button>
  <button class="speed-preset" data-speed="3.0">x3.0</button>
  <button class="speed-preset" data-speed="4.0">x4.0</button>
  <button class="speed-preset" data-speed="5.0">x5.0</button>
</div>

<div class="control-grid speed-fine-control">
  <button class="speed-adjust" data-adjust="-0.1">-0.1</button>
  <button class="speed-adjust" data-adjust="-0.01">-0.01</button>
  <button class="speed-adjust" data-adjust="+0.01">+0.01</button>
  <button class="speed-adjust" data-adjust="+0.1">+0.1</button>
</div>
`;
