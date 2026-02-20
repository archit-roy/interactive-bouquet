document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("bouquetCanvas");
  const ctx = canvas.getContext("2d");
  const messageInput = document.getElementById("messageInput");

  const state = {
    flowers: [],
    vase: null,
    message: ""
  };

  let history = [];
  let redoStack = [];
  let dragging = null;
  let offsetX = 0;
  let offsetY = 0;
  let needsRender = true;

  /* =============================
     FLOWERS (7)
  ============================== */

  const flowerList = [
    "assets/flowers/rose.png",
    "assets/flowers/tulip.png",
    "assets/flowers/lily.png",
    "assets/flowers/daffodil.png",
    "assets/flowers/lotus.png",
    "assets/flowers/sunflower.png",
    "assets/flowers/daisy.png"
  ];

  /* =============================
     VASES (4)
  ============================== */

  const vaseList = [
    "assets/vases/vase1.png",
    "assets/vases/vase2.png",
    "assets/vases/vase3.png",
    "assets/vases/vase4.png"
  ];

  const flowerCarousel = document.getElementById("flowerCarousel");
  const vaseCarousel = document.getElementById("vaseCarousel");

  /* =============================
     UTIL
  ============================== */

  const snap = (v, g = 8) => Math.round(v / g) * g;

  function saveHistory() {
    history.push(JSON.stringify(state));
    redoStack = [];
  }

  function preload(state) {
    state.flowers.forEach(f =>
      f.img = Object.assign(new Image(), { src: f.src })
    );
    if (state.vase)
      state.vase.img = Object.assign(new Image(), { src: state.vase.src });
  }

  /* =============================
     BUILD CAROUSELS
  ============================== */

  flowerList.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.onclick = () => addFlower(src);
    flowerCarousel.appendChild(img);
  });

  vaseList.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.onclick = () => selectVase(src);
    vaseCarousel.appendChild(img);
  });

  messageInput.addEventListener("input", e => {
    saveHistory();
    state.message = e.target.value;
    needsRender = true;
  });

  /* =============================
     ACTIONS
  ============================== */

  function addFlower(src) {
    if (state.flowers.length >= 12) return;
    saveHistory();

    const img = new Image();
    img.src = src;

    img.onload = () => {
      state.flowers.push({
        src,
        img,
        x: 90 + Math.random() * 100,
        y: 70 + Math.random() * 120,
        w: 60,
        h: 60,
        scale: 1
      });
      needsRender = true;
    };
  }

  function selectVase(src) {
    saveHistory();

    const img = new Image();
    img.src = src;

    img.onload = () => {
      state.vase = {
        src,
        img,
        x: 60,
        y: 230,
        w: 180,
        h: 170
      };
      needsRender = true;
    };
  }

  /* =============================
     RENDER LOOP
  ============================== */

  function render() {
    if (!needsRender) return;
    needsRender = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Flowers
    state.flowers.forEach(f => {
      ctx.save();
      ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
      ctx.scale(f.scale, f.scale);
      ctx.drawImage(f.img, -f.w / 2, -f.h / 2, f.w, f.h);

      if (dragging === f) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-f.w / 2 - 4, -f.h / 2 - 4, f.w + 8, f.h + 8);
      }

      ctx.restore();
    });

    // Vase
    if (state.vase) {
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 20;
      ctx.drawImage(
        state.vase.img,
        state.vase.x,
        state.vase.y,
        state.vase.w,
        state.vase.h
      );
      ctx.shadowBlur = 0;
    }

    // Message
    if (state.message) {
      ctx.fillStyle = "#fff";
      ctx.font = "18px cursive";
      const w = ctx.measureText(state.message).width;
      ctx.fillText(state.message, (canvas.width - w) / 2, 400);
    }
  }

  function loop() {
    render();
    requestAnimationFrame(loop);
  }

  loop();

  /* =============================
     DRAG ENGINE
  ============================== */

  const hit = (x, y, f) =>
    x > f.x && x < f.x + f.w &&
    y > f.y && y < f.y + f.h;

  function startDrag(x, y) {
    for (let i = state.flowers.length - 1; i >= 0; i--) {
      const f = state.flowers[i];
      if (hit(x, y, f)) {
        dragging = f;
        f.scale = f.scale;
        offsetX = x - f.x;
        offsetY = y - f.y;
        state.flowers.splice(i, 1);
        state.flowers.push(f);
        canvas.style.cursor = "grabbing";
        needsRender = true;
        break;
      }
    }
  }

  function moveDrag(x, y) {
    if (!dragging) return;
    dragging.x = snap(x - offsetX);
    dragging.y = snap(y - offsetY);
    needsRender = true;
  }

  function endDrag() {
    dragging = null;
    canvas.style.cursor = "grab";
    needsRender = true;
  }

  canvas.addEventListener("mousedown", e =>
    startDrag(e.offsetX, e.offsetY)
  );

  canvas.addEventListener("mousemove", e =>
    moveDrag(e.offsetX, e.offsetY)
  );

  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("mouseleave", endDrag);

  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    startDrag(t.clientX - r.left, t.clientY - r.top);
  });

  canvas.addEventListener("touchmove", e => {
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    moveDrag(t.clientX - r.left, t.clientY - r.top);
  });

  canvas.addEventListener("touchend", endDrag);

  /* =============================
     RESIZE ENGINE (SCROLL)
  ============================== */

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const x = e.offsetX;
    const y = e.offsetY;

    // Resize flower
    for (let i = state.flowers.length - 1; i >= 0; i--) {
      const f = state.flowers[i];
      if (hit(x, y, f)) {
        saveHistory();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        f.scale = Math.max(0.3, Math.min(3, f.scale + delta));
        needsRender = true;
        return;
      }
    }

    // Resize vase
    if (state.vase) {
      const v = state.vase;
      if (x > v.x && x < v.x + v.w && y > v.y && y < v.y + v.h) {
        saveHistory();
        const delta = e.deltaY < 0 ? 10 : -10;
        v.w = Math.max(100, Math.min(350, v.w + delta));
        v.h = Math.max(100, Math.min(350, v.h + delta));
        needsRender = true;
      }
    }

  });

  /* =============================
     UNDO / REDO
  ============================== */

  document.getElementById("undoBtn").onclick = () => {
    if (history.length) {
      redoStack.push(JSON.stringify(state));
      const s = JSON.parse(history.pop());
      Object.assign(state, s);
      preload(state);
      needsRender = true;
    }
  };

  document.getElementById("redoBtn").onclick = () => {
    if (redoStack.length) {
      history.push(JSON.stringify(state));
      const s = JSON.parse(redoStack.pop());
      Object.assign(state, s);
      preload(state);
      needsRender = true;
    }
  };

  /* =============================
     SAVE IMAGE
  ============================== */

  document.getElementById("saveBtn").onclick = () => {
    html2canvas(document.getElementById("exportArea")).then(c => {
      const a = document.createElement("a");
      a.download = "bouquet.png";
      a.href = c.toDataURL();
      a.click();
    });
  };

});