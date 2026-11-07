import './style.css';
import { createLive2D } from 'live2d-web';

// 라이브러리는 Vite로 번들되어 같은 GitHub Pages 서버에서 제공됩니다.
// Cubism Core는 별도 라이선스가 있는 Live2D 공식 런타임이므로 기본값은 공식 호스팅 URL입니다.
// 라이선스 확인 후 public/vendor/live2dcubismcore.min.js 를 추가하면 자동으로 자체 호스팅 버전을 사용합니다.
const OFFICIAL_CORE = 'https://cubism.live2d.com/sdk-web/core/06/live2dcubismcore.min.js';
const $ = (id) => document.getElementById(id);
const game = $('game');
const host = $('live2dHost');
const sceneStage = $('sceneStage');
const backdrop = $('sceneBackdrop');
const startScreen = $('startScreen');
const startButton = $('startButton');
const loadingMessage = $('loadingMessage');
const errorMessage = $('errorMessage');
const rippleLayer = $('rippleLayer');
const path = (name) => new URL(name, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
// User-supplied left/right slap sounds play immediately, and the original
// voice starts 0.5 seconds after the same click. All sounds use 50% gain.
const SOUND_FILES = {
  Left: 'assets/left.wav',
  Right: 'assets/right.wav',
  Delayed: 'assets/touch.wav',
};
const SOUND_VOLUME = 0.5;
const loadedAudioBytes = new Map();
const audioBuffers = new Map();
const activeSoundSources = new Set();
let audioContext = null;
let audioReady = false;
let model = null;
let started = false;
const downPointers = new Map();

// Keep the existing PC composition unchanged. On portrait screens, lay out
// background and Live2D together on a virtual 16:9 PC stage, then show its
// centered portion. This keeps the character centered instead of shrinking
// relative to the background or drifting to one side on phones.
const PC_SCENE_ASPECT = 16 / 9;
function layoutScene() {
  const viewWidth = game.clientWidth;
  const viewHeight = game.clientHeight;
  if (!viewWidth || !viewHeight) return;
  const portrait = viewHeight > viewWidth;
  const sceneWidth = portrait ? Math.max(viewWidth, viewHeight * PC_SCENE_ASPECT) : viewWidth;
  sceneStage.style.width = `${Math.ceil(sceneWidth)}px`;
  sceneStage.style.height = `${Math.ceil(viewHeight)}px`;
}
backdrop.style.backgroundImage = `url("${path('assets/background.webp')}")`;
layoutScene();
window.addEventListener('resize', layoutScene);
window.addEventListener('orientationchange', layoutScene);
window.visualViewport?.addEventListener('resize', layoutScene);

async function getCoreUrl() {
  const local = path('vendor/live2dcubismcore.min.js');
  try {
    const response = await fetch(local, { method: 'HEAD', cache: 'no-cache' });
    if (response.ok && /(?:javascript|octet-stream|text\/plain)/i.test(response.headers.get('Content-Type') || '')) return local;
  } catch (_) { /* 파일이 없으면 공식 호스팅 사용 */ }
  return OFFICIAL_CORE;
}

async function preloadAudioFiles() {
  await Promise.all(Object.entries(SOUND_FILES).map(async ([key, filename]) => {
    const url = path(filename);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      loadedAudioBytes.set(key, await response.arrayBuffer());
    } catch (error) {
      throw new Error(`필수 음성 파일을 찾을 수 없습니다: ${filename} (${error.message})`);
    }
  }));
}

// Create/resume Web Audio directly inside the Start button's trusted click
// so that delayed voice playback is allowed on mobile as well.
async function prepareAudioOnStart() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('브라우저가 Web Audio를 지원하지 않습니다.');
  audioContext ||= new AudioContextConstructor();
  const resumePromise = audioContext.resume();
  await Promise.all([resumePromise, ...Array.from(loadedAudioBytes.entries()).map(async ([key, bytes]) => {
    audioBuffers.set(key, await audioContext.decodeAudioData(bytes.slice(0)));
  })]);
  audioReady = true;
}

function stopPreviousAudio() {
  for (const source of activeSoundSources) {
    try { source.stop(); } catch (_) { /* Already stopped */ }
  }
  activeSoundSources.clear();
}

function playSound(key, delaySeconds = 0) {
  const buffer = audioBuffers.get(key);
  if (!audioReady || !audioContext || !buffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const gain = audioContext.createGain();
  gain.gain.value = SOUND_VOLUME;
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.addEventListener('ended', () => {
    activeSoundSources.delete(source);
    try { source.disconnect(); gain.disconnect(); } catch (_) { /* Safe cleanup */ }
  }, { once: true });
  activeSoundSources.add(source);
  source.start(audioContext.currentTime + delaySeconds);
}

async function loadGame() {
  // A blocked Core script or fetch can leave a blank loading UI without a thrown error.
  // Show guidance if it is taking longer than expected, without cancelling a slow load.
  const slowLoadNotice = setTimeout(() => {
    if (model || started) return;
    loadingMessage.textContent = '모델 로딩이 지연되고 있어요';
    errorMessage.hidden = false;
    errorMessage.textContent = 'Live2D Core 또는 모델 리소스가 차단되었을 수 있습니다.\n인터넷 연결을 확인하고 F12 → Console / Network에서 실패한 파일을 확인해 주세요.';
  }, 15000);
  try {
    loadingMessage.textContent = '음성과 모델 리소스를 확인하는 중…';
    const [coreUrl] = await Promise.all([getCoreUrl(), preloadAudioFiles()]);
    loadingMessage.textContent = 'Live2D 엔진과 모델을 불러오는 중…';
    model = await createLive2D({
      container: host,
      src: path('model/character.model3.json'),
      coreUrl,
      fit: 'full',
      followPointer: false,
      idleMotion: false,
    });
    const hitAreas = model.getModelInfo().hitAreas;
    if (!hitAreas.includes('Left') || !hitAreas.includes('Right')) {
      throw new Error('Left / Right 히트 에어리어가 모델에서 발견되지 않았습니다.');
    }
    loadingMessage.textContent = '준비 완료!';
    errorMessage.hidden = true;
    startButton.disabled = false;
  } catch (error) {
    console.error('[에슈르 빵댕이 때리기] 모델 로드 오류', error);
    loadingMessage.textContent = '모델을 불러오지 못했어요';
    errorMessage.hidden = false;
    const detailText = error?.details?.url ? `\n문제 파일: ${error.details.url}` : '';
    const errorCode = error?.code ? ` (${error.code})` : '';
    errorMessage.textContent = `${error?.message || String(error)}${errorCode}${detailText}\n브라우저의 WebGL2 지원과 인터넷 연결을 확인해 주세요.`;
    startButton.disabled = true;
  } finally {
    clearTimeout(slowLoadNotice);
  }
}

startButton.addEventListener('click', async () => {
  if (!model || started || startButton.disabled) return;
  startButton.disabled = true;
  loadingMessage.textContent = '음성을 준비하는 중…';
  try {
    await prepareAudioOnStart();
    started = true;
    startScreen.hidden = true;
  } catch (error) {
    console.error('오디오 초기화 실패', error);
    loadingMessage.textContent = '음성을 재생할 수 없어요';
    errorMessage.hidden = false;
    errorMessage.textContent = String(error?.message || error);
    startButton.disabled = false;
  }
});

function emitRipple(clientX, clientY) {
  const bounds = rippleLayer.getBoundingClientRect();
  const x = clientX - bounds.left;
  const y = clientY - bounds.top;
  if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return;
  const ring = document.createElement('span');
  ring.className = 'ripple';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  rippleLayer.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove(), { once: true });
  for (let i = 0; i < 5; i++) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const dist = 23 + (i % 2) * 6;
    spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    rippleLayer.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }
}

function detectSide(event) {
  let areas;
  try { areas = model.hitTest(event.clientX, event.clientY); }
  catch (error) { console.warn('히트 영역 검사 오류', error); return null; }
  const left = areas.includes('Left');
  const right = areas.includes('Right');
  if (left && right) {
    // 메시가 겹치는 지점에서만 가운데를 기준으로 모션 선택
    const bounds = host.getBoundingClientRect();
    return event.clientX < bounds.left + bounds.width / 2 ? 'Left' : 'Right';
  }
  return left ? 'Left' : right ? 'Right' : null;
}

function playClickVoice(side) {
  // New hit cancels the previous click's playback, including the voice
  // that would otherwise start after 0.5 seconds.
  stopPreviousAudio();
  // 0 seconds: play the slap sound for the matching hit area.
  playSound(side, 0);
  // 0.5 seconds after each click: original provided voice.
  playSound('Delayed', 0.5);
}

function onHit(event) {
  if (!started || !model) return;
  const side = detectSide(event);
  if (!side) return;
  emitRipple(event.clientX, event.clientY);
  playClickVoice(side);
  // 새로운 터치가 직전 모션을 즉시 끊고 좌/우 모션을 시작하게 함.
  model.playMotion(side, 0, { priority: 'force', fadeInMs: 100, fadeOutMs: 200 })
    .catch(error => console.warn(`${side} 모션 실행 실패`, error));
}

host.addEventListener('pointerdown', event => {
  if (!started) return;
  downPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
});
host.addEventListener('pointerup', event => {
  const down = downPointers.get(event.pointerId);
  downPointers.delete(event.pointerId);
  if (!down) return;
  if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 18) return;
  onHit(event);
});
host.addEventListener('pointercancel', event => downPointers.delete(event.pointerId));
host.addEventListener('pointerleave', event => downPointers.delete(event.pointerId));
window.addEventListener('blur', () => downPointers.clear());
loadGame();
