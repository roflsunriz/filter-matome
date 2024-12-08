"use strict";

window.addEventListener("load", () => {
  createCanvasContainer();
  matrixrain();
});

const createCanvasContainer = () => {
  document.body.insertAdjacentHTML(
    `afterbegin`,
    `<div id="canvasContainer" style="
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: -1;
    background-color: Black;"></div>`
  );
};

function matrixrain() {
  const canCon = cc.i("canvasContainer");
  const c = createCanvas(canCon);
  const ctx = c.getContext("2d");
  const bg = cc.t("body")[0];

  // making the canvas full screen
  c.height = window.outerHeight;
  c.width = window.parent.screen.width;

  // c.width が正の数であることを確認
  if (c.width <= 0) {
    console.error("Error: Canvas width is invalid.");
    return; // 処理を中止
  }

  setCanvasStyle(bg);

  // japanese characters - taken from the unicode charset
  const japanese = "ｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ-ﾟ".split("");

  const font_size = 23;
  const columns = Math.floor(c.width / font_size);
  let drops = Array(columns).fill(1); // Initialize drops array

  // drawing the characters
  setInterval(() => draw(ctx, drops, japanese, font_size, c.height), 33);
}

const createCanvas = (container) => {
  container.insertAdjacentHTML(
    `afterbegin`,
    `<canvas id="c" style="
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    z-index: -1;"></canvas>`
  );
  return cc.i("c");
};

const setCanvasStyle = (bg) => {
  bg.style.backgroundColor = "black";
  bg.style.margin = "0";
  bg.style.padding = "0";
};

const draw = (ctx, drops, japanese, font_size, canvasHeight) => {
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "#0F0"; // green text
  ctx.font = `${font_size}px arial`;

  for (let i = 0; i < drops.length; i++) {
    const text = japanese[Math.floor(Math.random() * japanese.length)];
    ctx.fillText(text, i * font_size, drops[i] * font_size);

    if (drops[i] * font_size > canvasHeight && Math.random() > 0.975) {
      drops[i] = 0; // Reset drop position
    }

    drops[i]++;
  }
};
