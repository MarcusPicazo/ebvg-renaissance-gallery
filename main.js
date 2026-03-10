import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// --- CONFIGURATION ---
const config = {
  speed: 8.0,
  lookSpeed: 0.002,
  playerHeight: 1.5,
  playerRadius: 1.0,
  wallHeight: 14,
  galleryWidth: 30,
  galleryDepth: 80,
};

const state = {
  isLocked: false,
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  activeArt: null,
  canMove: true,
};

let camera, scene, renderer, controls, raycaster;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const artworks = [];
let owlGroup;

// --- ART DATA ---
// Rutas actualizadas para usar imágenes locales desde la carpeta "assets"
const artData = [
  {
    id: "school-athens",
    title: "La Escuela de Atenas",
    artist: "Rafael Sanzio (1511)",
    url: "assets/escuela_atenas.jpg",
    tech: "Fresco verdadero. Colores brillantes y luz racional.",
    comp: "Simetría perfecta. Platón y Aristóteles debaten en el centro.",
    hist: "Ubicada en el Vaticano. Celebra la Verdad Racional.",
    position: new THREE.Vector3(0, 6, -30),
    rotation: new THREE.Vector3(0, 0, 0),
    scale: { w: 16, h: 10 },
  },
  {
    id: "mona-lisa",
    title: "La Mona Lisa",
    artist: "Leonardo da Vinci (1503)",
    url: "assets/mona_lisa.jpg",
    tech: 'Óleo sobre tabla. Uso magistral del "Sfumato".',
    comp: "Retrato piramidal de Lisa Gherardini.",
    hist: "La obra más famosa del mundo, exhibida en el Louvre.",
    position: new THREE.Vector3(-8, 4, 15),
    rotation: new THREE.Vector3(0, 0.5, 0),
    scale: { w: 4, h: 6 },
  },
  {
    id: "david",
    title: "El David",
    artist: "Miguel Ángel (1504)",
    url: "assets/david.jpg",
    tech: "Escultura en mármol de Carrara.",
    comp: "Contrapposto. Muestra tensión mental.",
    hist: "Símbolo de la república florentina.",
    position: new THREE.Vector3(8, 5, 15),
    rotation: new THREE.Vector3(0, -0.5, 0),
    scale: { w: 4, h: 8 },
  },
  {
    id: "last-supper",
    title: "La Última Cena",
    artist: "Leonardo da Vinci (1495)",
    url: "assets/ultima_cena.jpg",
    tech: "Experimental sobre pared seca.",
    comp: "Perspectiva lineal con punto de fuga en Cristo.",
    hist: "Ubicada en Milán.",
    position: new THREE.Vector3(8, 4, -8),
    rotation: new THREE.Vector3(0, -0.5, 0),
    scale: { w: 10, h: 5 },
  },
];

// --- INIT ---
function init() {
  const container = document.getElementById("canvas-container");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  scene.fog = new THREE.Fog(0xf5f5f5, 10, 70);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, config.playerHeight, 35);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);

  // Start Logic
  const startBtn = document.getElementById("start-btn");
  const startScreen = document.getElementById("start-screen");

  startBtn.addEventListener("click", () => controls.lock());

  controls.addEventListener("lock", () => {
    startScreen.style.display = "none";
    state.isLocked = true;
    state.canMove = true;
  });

  controls.addEventListener("unlock", () => {
    if (state.activeArt === null) startScreen.style.display = "flex";
    state.isLocked = false;
  });

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  // Touch events for mobile movement
  document.addEventListener("touchstart", onTouchStart);
  document.addEventListener("touchend", onTouchEnd);

  document.addEventListener("click", onMouseClick);
  document
    .getElementById("close-bubble")
    .addEventListener("click", closeArtView);

  raycaster = new THREE.Raycaster();

  buildLights();
  buildRoom();
  buildArtworks();
  buildOwl();

  window.addEventListener("resize", onWindowResize);
  animate();

  document.getElementById("loading").style.display = "none";
}

function buildLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 0.5);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(-10, 40, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);
}

function createWallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fdfdfd";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const grey = 220 + Math.random() * 35;
    ctx.fillStyle = `rgba(${grey},${grey},${grey}, 0.3)`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function buildRoom() {
  // 1. Floor
  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const ctx = floorCanvas.getContext("2d");
  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const isWhite = (x / tileSize + y / tileSize) % 2 === 0;
      ctx.fillStyle = isWhite ? "#e8e8e8" : "#c8c8c8";
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(config.galleryWidth / 4, config.galleryDepth / 4);
  floorTex.anisotropy = 16;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(config.galleryWidth, config.galleryDepth),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 2. Ceiling
  const ceilGroup = new THREE.Group();
  const ceilBase = new THREE.Mesh(
    new THREE.PlaneGeometry(config.galleryWidth, config.galleryDepth),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  ceilBase.rotation.x = Math.PI / 2;
  ceilBase.position.y = config.wallHeight;
  ceilGroup.add(ceilBase);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const beamGeo = new THREE.BoxGeometry(config.galleryWidth, 0.8, 1);
  for (
    let z = -config.galleryDepth / 2;
    z <= config.galleryDepth / 2;
    z += 8
  ) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, config.wallHeight - 0.4, z);
    ceilGroup.add(beam);
  }
  scene.add(ceilGroup);

  // 3. Walls
  const wallTex = createWallTexture();
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.8,
  });
  const createWall = (x, z, ry, w) => {
    const geo = new THREE.BoxGeometry(w, config.wallHeight, 1);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, config.wallHeight / 2, z);
    mesh.rotation.y = ry;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.6, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x333 })
    );
    base.position.set(x, 0.3, z);
    base.rotation.y = ry;
    scene.add(base);
  };
  createWall(0, -config.galleryDepth / 2, 0, config.galleryWidth);
  createWall(0, config.galleryDepth / 2, 0, config.galleryWidth);
  createWall(
    -config.galleryWidth / 2,
    0,
    Math.PI / 2,
    config.galleryDepth
  );
  createWall(
    config.galleryWidth / 2,
    0,
    Math.PI / 2,
    config.galleryDepth
  );
}

function createEasel(width, height, yCenter) {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.9,
  });

  const topY = height / 2 + 0.5;
  const bottomY = -yCenter;
  const fullH = topY - bottomY;

  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, fullH);
  const l1 = new THREE.Mesh(legGeo, woodMat);
  l1.position.set(-width * 0.3, (topY + bottomY) / 2, 0);
  l1.rotation.x = -0.2;
  l1.rotation.z = 0.1;
  group.add(l1);

  const l2 = new THREE.Mesh(legGeo, woodMat);
  l2.position.set(width * 0.3, (topY + bottomY) / 2, 0);
  l2.rotation.x = -0.2;
  l2.rotation.z = -0.1;
  group.add(l2);

  const l3 = new THREE.Mesh(legGeo, woodMat);
  l3.position.set(0, (topY + bottomY) / 2, -1.5);
  l3.rotation.x = 0.3;
  group.add(l3);

  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1, 0.1, 0.4),
    woodMat
  );
  shelf.position.set(0, -height / 2 - 0.05, 0.3);
  shelf.rotation.x = -0.2;
  group.add(shelf);

  const clamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.4, 0.1),
    woodMat
  );
  clamp.position.set(0, height / 2 + 0.1, 0.1);
  clamp.rotation.x = -0.2;
  group.add(clamp);

  return group;
}

function buildArtworks() {
  const textureLoader = new THREE.TextureLoader();
  // Eliminado setCrossOrigin ya que usamos assets locales

  artData.forEach((data) => {
    const group = new THREE.Group();
    group.position.copy(data.position);
    group.rotation.copy(data.rotation);

    // 1. EASEL
    const easel = createEasel(
      data.scale.w,
      data.scale.h,
      data.position.y
    );
    group.add(easel);

    // 2. PAINTING
    const geo = new THREE.PlaneGeometry(data.scale.w, data.scale.h);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const painting = new THREE.Mesh(geo, mat);
    painting.userData = { id: data.id, type: "art" };
    painting.rotation.x = -0.2;
    painting.position.z = 0.2;
    group.add(painting);

    // Carga de textura local
    textureLoader.load(
      data.url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        mat.map = texture;
        mat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.error("Error loading texture for " + data.id, err);
        mat.color.setHex(0x555555);
      }
    );

    // 3. FRAME
    const frameGeo = new THREE.BoxGeometry(
      data.scale.w + 0.6,
      data.scale.h + 0.6,
      0.2
    );
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.4,
      roughness: 0.5,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = -0.2;
    frame.position.z = 0.05;
    group.add(frame);

    // 4. LABEL
    const labelGeo = new THREE.BoxGeometry(1.5, 0.4, 0.05);
    const labelMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, -data.scale.h / 2 - 0.3, 0.5);
    label.rotation.x = -0.2;
    group.add(label);

    scene.add(group);
    artworks.push(painting);
  });
}

function buildOwl() {
  owlGroup = new THREE.Group();

  const blueMat = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
  });

  // Body & Face
  owlGroup.add(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.45, 4, 8), blueMat)
  );
  const belly = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.35, 4, 8),
    whiteMat
  );
  belly.position.set(0, -0.05, 0.12);
  owlGroup.add(belly);
  const wg = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
  const lw = new THREE.Mesh(wg, blueMat);
  lw.position.set(-0.35, 0.1, 0);
  lw.rotation.z = 0.2;
  owlGroup.add(lw);
  const rw = new THREE.Mesh(wg, blueMat);
  rw.position.set(0.35, 0.1, 0);
  rw.rotation.z = -0.2;
  owlGroup.add(rw);
  const eg = new THREE.SphereGeometry(0.14, 16, 16);
  const le = new THREE.Mesh(eg, whiteMat);
  le.position.set(-0.14, 0.3, 0.22);
  owlGroup.add(le);
  const re = new THREE.Mesh(eg, whiteMat);
  re.position.set(0.14, 0.3, 0.22);
  owlGroup.add(re);
  const pg = new THREE.SphereGeometry(0.06, 8, 8);
  const lp = new THREE.Mesh(pg, blackMat);
  lp.position.set(-0.14, 0.3, 0.34);
  owlGroup.add(lp);
  const rp = new THREE.Mesh(pg, blackMat);
  rp.position.set(0.14, 0.3, 0.34);
  owlGroup.add(rp);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.15, 8),
    orangeMat
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.22, 0.38);
  owlGroup.add(beak);

  // --- IMPROVED HAT (Mortarboard) ---
  const hatGroup = new THREE.Group();

  // Skullcap (fits on head)
  const hatCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.15, 32),
    darkMat
  );
  hatCap.position.set(0, 0.45, 0);
  hatGroup.add(hatCap);

  // The Board (Square, Flat)
  const hatBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.8),
    darkMat
  );
  hatBoard.position.set(0, 0.55, 0);
  // Slight tilt for realism
  hatBoard.rotation.set(0.05, 0, 0.05);
  hatGroup.add(hatBoard);

  // Gold Button
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02),
    goldMat
  );
  button.position.copy(hatBoard.position);
  button.rotation.copy(hatBoard.rotation);
  button.translateY(0.03);
  hatGroup.add(button);

  // Tassel Group attached to button area
  const tasselGroup = new THREE.Group();
  tasselGroup.position.copy(hatBoard.position);
  tasselGroup.rotation.copy(hatBoard.rotation);
  tasselGroup.translateY(0.03); // Top of board
  hatGroup.add(tasselGroup);

  // String laying on board (going to corner)
  const stringOnBoard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.4),
    goldMat
  );
  stringOnBoard.position.set(0.2, 0, 0.2); // Midpoint to corner
  stringOnBoard.rotation.x = Math.PI / 2;
  stringOnBoard.rotation.z = -Math.PI / 4; // Point to corner
  tasselGroup.add(stringOnBoard);

  // Hanging part (off the edge)
  const hangingString = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.25),
    goldMat
  );
  hangingString.position.set(0.38, -0.12, 0.38); // Edge corner
  tasselGroup.add(hangingString);

  // The Fringe (fluffy end)
  const fringe = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.1, 8),
    goldMat
  );
  fringe.position.set(0.38, -0.3, 0.38);
  tasselGroup.add(fringe);

  owlGroup.add(hatGroup);
  scene.add(owlGroup);
  owlGroup.position.set(0, 2, 20);
}

// --- RESPONSIVE OWL MOVEMENT ---
function moveOwlTo(targetPos, targetRot) {
  owlGroup.position.copy(targetPos);

  const isMobile = window.innerWidth < window.innerHeight;

  // On Mobile: Position below artwork. On Desktop: Position to the left.
  const offset = isMobile
    ? new THREE.Vector3(0, -3.5, 3.0)
    : new THREE.Vector3(-3.5, -1.0, 3.5);

  offset.applyEuler(targetRot);
  owlGroup.position.add(offset);
  owlGroup.lookAt(camera.position);
}

function checkCollision(newPos) {
  const halfW = config.galleryWidth / 2 - config.playerRadius;
  const halfD = config.galleryDepth / 2 - config.playerRadius;
  if (newPos.x < -halfW) newPos.x = -halfW;
  if (newPos.x > halfW) newPos.x = halfW;
  if (newPos.z < -halfD) newPos.z = -halfD;
  if (newPos.z > halfD) newPos.z = halfD;
  return newPos;
}

// --- CONTROLS ---
function onKeyDown(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      state.moveForward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      state.moveLeft = true;
      break;
    case "ArrowDown":
    case "KeyS":
      state.moveBackward = true;
      break;
    case "ArrowRight":
    case "KeyD":
      state.moveRight = true;
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      state.moveForward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      state.moveLeft = false;
      break;
    case "ArrowDown":
    case "KeyS":
      state.moveBackward = false;
      break;
    case "ArrowRight":
    case "KeyD":
      state.moveRight = false;
      break;
  }
}

// Simple Touch Controls (Tap to move forward)
function onTouchStart() {
  state.moveForward = true;
}
function onTouchEnd() {
  state.moveForward = false;
}

function onMouseClick() {
  if (!state.isLocked && !state.activeArt) return;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(artworks);
  if (intersects.length > 0) openArtView(intersects[0].object);
}

function openArtView(mesh) {
  const artInfo = artData.find((a) => a.id === mesh.userData.id);
  if (!artInfo) return;
  state.activeArt = artInfo;
  state.canMove = false;
  controls.unlock();

  const targetPos = new THREE.Vector3().copy(artInfo.position);

  // Responsive Distance
  const isMobile = window.innerWidth < window.innerHeight;
  const dist = isMobile ? 14 : 8; // Further back on mobile

  const offset = new THREE.Vector3(0, 0, dist);
  offset.applyEuler(artInfo.rotation);
  targetPos.add(offset);
  targetPos.y = artInfo.position.y;
  camera.position.copy(targetPos);
  camera.lookAt(artInfo.position);

  moveOwlTo(artInfo.position, artInfo.rotation);

  document.getElementById("bubble-title").innerText = artInfo.title;
  document.getElementById("bubble-artist").innerText = artInfo.artist;
  document.getElementById("bubble-text").innerHTML = `
          <p><strong>Técnica:</strong> ${artInfo.tech}</p>
          <p><strong>Composición:</strong> ${artInfo.comp}</p>
          <p><strong>Historia:</strong> ${artInfo.hist}</p>
      `;
  document.getElementById("speech-bubble").style.display = "block";
}

function closeArtView() {
  document.getElementById("speech-bubble").style.display = "none";
  state.activeArt = null;
  owlGroup.position.set(0, 2, 20);
  setTimeout(() => controls.lock(), 100);
}

// --- RESPONSIVE BUBBLE CLAMPING ---
function updateBubblePosition() {
  if (!state.activeArt || !owlGroup) return;
  const bubble = document.getElementById("speech-bubble");
  const owlHeadPos = new THREE.Vector3();
  owlGroup.getWorldPosition(owlHeadPos);

  // Adjust offset based on mobile/desktop owl pos
  const isMobile = window.innerWidth < window.innerHeight;
  owlHeadPos.y += isMobile ? 1.0 : 1.2;

  owlHeadPos.project(camera);

  let x = (owlHeadPos.x * 0.5 + 0.5) * window.innerWidth;
  let y = (-(owlHeadPos.y * 0.5) + 0.5) * window.innerHeight;

  // Clamping Logic (Never go offscreen)
  const bubbleW = bubble.offsetWidth;
  const bubbleH = bubble.offsetHeight;
  const padding = 10;

  // Clamp X (Left/Right)
  if (x < bubbleW / 2 + padding) x = bubbleW / 2 + padding;
  if (x > window.innerWidth - bubbleW / 2 - padding)
    x = window.innerWidth - bubbleW / 2 - padding;

  // Clamp Y (Top/Bottom) - allow it to flip down if too high?
  // For now, just clamp top edge.
  if (y < bubbleH + padding) y = bubbleH + padding;
  if (y > window.innerHeight - padding) y = window.innerHeight - padding;

  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (state.isLocked && state.canMove) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    direction.z = Number(state.moveForward) - Number(state.moveBackward);
    direction.x = Number(state.moveRight) - Number(state.moveLeft);
    direction.normalize();

    if (state.moveForward || state.moveBackward)
      velocity.z -= direction.z * config.speed * 40.0 * delta;
    if (state.moveLeft || state.moveRight)
      velocity.x -= direction.x * config.speed * 40.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    const pos = camera.position.clone();
    const correctedPos = checkCollision(pos);
    camera.position.x = correctedPos.x;
    camera.position.z = correctedPos.z;
    camera.position.y = config.playerHeight;
  }

  if (state.isLocked) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(artworks);
    document
      .getElementById("crosshair")
      .classList.toggle(
        "active",
        intersects.length > 0 && intersects[0].distance < 20
      );
  }

  if (owlGroup) {
    owlGroup.position.y += Math.sin(time * 0.003) * 0.003;
    if (state.activeArt) {
      owlGroup.lookAt(camera.position);
      updateBubblePosition();
    } else {
      owlGroup.rotation.y += 0.005;
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}

init();