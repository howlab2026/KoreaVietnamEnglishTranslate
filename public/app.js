/**
 * 3-Way Multilingual Live Captioning
 * Supports Korean (KO), English (EN), and Vietnamese (VI).
 * Uses dual parallel Gemini 3.5 Live Translate WebSocket connections.
 */

const MODEL = "models/gemini-3.5-live-translate-preview";
const WS_ENDPOINT_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

const LANG_CONFIGS = {
  ko: {
    code: "ko",
    name: "한국어",
    flag: "🇰🇷",
    title: "🇰🇷 한국어 → 🇻🇳 베트남어 · 🇺🇸 영어",
    sourceLabel: "🇰🇷 한국어 원문 (발화)",
    sourcePlaceholder: "마이크를 시작하고 한국어로 말씀하시면 음성이 여기에 인식됩니다.",
    target1: {
      code: "vi",
      name: "베트남어",
      flag: "🇻🇳",
      label: "🇻🇳 TIẾNG VIỆT (베트남어 번역)",
      placeholder: "베트남어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "Bạn là thông dịch viên. Hãy dịch lời nói sang tiếng Việt một cách tự nhiên và chính xác. Bắt buộc chỉ xuất bản dịch bằng tiếng Việt (Vietnamese)."
    },
    target2: {
      code: "en",
      name: "영어",
      flag: "🇺🇸",
      label: "🇺🇸 ENGLISH (영어 번역)",
      placeholder: "영어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "You are an interpreter. Translate spoken audio accurately into natural English. You must only output in English."
    }
  },
  en: {
    code: "en",
    name: "English",
    flag: "🇺🇸",
    title: "🇺🇸 English → 🇻🇳 베트남어 · 🇰🇷 한국어",
    sourceLabel: "🇺🇸 English Original (Speech)",
    sourcePlaceholder: "Start the mic and speak in English. Transcript will appear here.",
    target1: {
      code: "vi",
      name: "베트남어",
      flag: "🇻🇳",
      label: "🇻🇳 TIẾNG VIỆT (베트남어 번역)",
      placeholder: "베트남어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "Bạn là thông dịch viên. Hãy dịch lời nói sang tiếng Việt một cách tự nhiên và chính xác. Bắt buộc chỉ xuất bản dịch bằng tiếng Việt (Vietnamese)."
    },
    target2: {
      code: "ko",
      name: "한국어",
      flag: "🇰🇷",
      label: "🇰🇷 한국어 (Korean 번역)",
      placeholder: "한국어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "당신은 전문 통역사입니다. 들리는 음성을 자연스럽고 정확한 한국어로 번역하세요. 반드시 한국어로만 출력해야 합니다."
    }
  },
  vi: {
    code: "vi",
    name: "Tiếng Việt",
    flag: "🇻🇳",
    title: "🇻🇳 Tiếng Việt → 🇺🇸 영어 · 🇰🇷 한국어",
    sourceLabel: "🇻🇳 Tiếng Việt Nguyên bản (Phát biểu)",
    sourcePlaceholder: "Bật mic và nói tiếng Việt. Văn bản nhận diện sẽ hiển thị ở đây.",
    target1: {
      code: "en",
      name: "영어",
      flag: "🇺🇸",
      label: "🇺🇸 ENGLISH (영어 번역)",
      placeholder: "영어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "You are an interpreter. Translate spoken audio accurately into natural English. You must only output in English."
    },
    target2: {
      code: "ko",
      name: "한국어",
      flag: "🇰🇷",
      label: "🇰🇷 한국어 (Korean 번역)",
      placeholder: "한국어 번역이 여기에 실시간으로 표시됩니다.",
      instruction: "당신은 전문 통역사입니다. 들리는 음성을 자연스럽고 정확한 한국어로 번역하세요. 반드시 한국어로만 출력해야 합니다."
    }
  }
};

const $ = (id) => document.getElementById(id);

// UI Elements
const mainTitle = $("mainTitle");
const statusEl = $("status");
const themeToggleBtn = $("themeToggleBtn");
const themeIcon = $("themeIcon");
const themeLabel = $("themeLabel");

// History Modal Elements
const historyModalBtn = $("historyModalBtn");
const historyModal = $("historyModal");
const closeHistoryModalBtn = $("closeHistoryModalBtn");
const clearHistoryBtn = $("clearHistoryBtn");
const timerBadge = $("timerBadge");

const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const clearBtn = $("clearBtn");
const fullscreenBtn = $("fullscreenBtn");
const fontSizeEl = $("fontSize");
const micSelect = $("micSelect");
const micRefreshBtn = $("micRefreshBtn");
const micMeterBar = $("micMeterBar");
const timerEl = $("timer");
const historyList = $("historyList");

const sourceLabel = $("sourceLabel");
const target1Label = $("target1Label");
const target2Label = $("target2Label");
const sourceText = $("sourceText");
const target1Text = $("target1Text");
const target2Text = $("target2Text");

const langBtns = {
  ko: $("langKoBtn"),
  en: $("langEnBtn"),
  vi: $("langViBtn")
};

// State
let selectedLang = "ko";
let ws1 = null; // target1
let ws2 = null; // target2
let isReady1 = false;
let isReady2 = false;

let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
let analyserNode = null;
let meterAnimFrame = null;
let startedAt = 0;
let timerHandle = null;

let currentSource = "";
let currentTarget1 = "";
let currentTarget2 = "";
let turnActive1 = false;
let turnActive2 = false;
let commitTimeout = null;

/* ─── Theme Management (Default: Light / Bright White) ─── */
function setTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-theme");
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeLabel) themeLabel.textContent = "낮 모드";
  } else {
    document.body.classList.remove("dark-theme");
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeLabel) themeLabel.textContent = "밤 모드";
  }
  try {
    localStorage.setItem("app_theme", theme);
  } catch {}
}

// Initialize theme (Default is light mode)
const initialTheme = localStorage.getItem("app_theme") || "light";
setTheme(initialTheme);

themeToggleBtn?.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-theme");
  setTheme(isDark ? "light" : "dark");
});

/* ─── Sentence Auto Line Break Helpers ─── */
/**
 * 한 문장이 끝나면(., ?, ! 등) 다음 줄로 자동 줄변환
 */
function formatSentences(text) {
  if (!text) return "";
  // 1. 문장 종결 부호(., ?, !) 뒤에 공백이 있으면 줄바꿈으로 치환
  let formatted = text.replace(/([.?!])\s+/g, "$1\n");
  // 2. 문장 종결 부호 뒤에 바로 다음 글자가 붙는 경우 줄바꿈 삽입
  formatted = formatted.replace(/([.?!])(?=[^\d\s\n.?!])/g, "$1\n");
  // 3. 3줄 이상의 불필요한 연속 개행 정리
  formatted = formatted.replace(/\n{3,}/g, "\n\n");
  return formatted;
}

/**
 * 새로운 문장 턴이 시작될 때 이전 문장 뒤에 개행을 붙여 다음 줄로 이어지게 함
 */
function appendTurnBreak(text, maxLines = 15) {
  if (!text || !text.trim()) return "";
  let trimmed = text.trim();
  if (!/[.?!]$/.test(trimmed)) {
    trimmed += ".";
  }
  const lines = trimmed.split("\n");
  const recent = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
  return recent.join("\n") + "\n";
}

/**
 * 패널 텍스트를 문장 줄바꿈 포맷팅하여 표시하고 아래로 자동 스크롤
 */
function updatePanel(element, rawText) {
  if (!element) return;
  element.textContent = formatSentences(rawText);
  element.scrollTop = element.scrollHeight;
}

/* ─── Status Badge ─── */
function setStatus(text, kind = "idle") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

/* ─── Apply Language Selection ─── */
function setLanguage(langKey) {
  if (!LANG_CONFIGS[langKey]) return;
  if (ws1 || ws2) {
    stop();
  }

  selectedLang = langKey;
  const config = LANG_CONFIGS[langKey];

  // Update button active state
  Object.keys(langBtns).forEach((k) => {
    langBtns[k]?.classList.toggle("active", k === langKey);
  });

  // Update header & panel texts
  mainTitle.textContent = config.title;
  sourceLabel.textContent = config.sourceLabel;
  sourceText.textContent = config.sourcePlaceholder;
  target1Label.textContent = config.target1.label;
  target1Text.textContent = config.target1.placeholder;
  target2Label.textContent = config.target2.label;
  target2Text.textContent = config.target2.placeholder;

  const target1Panel = $("target1Panel");
  const target2Panel = $("target2Panel");
  if (target1Panel) target1Panel.dataset.targetLang = config.target1.code;
  if (target2Panel) target2Panel.dataset.targetLang = config.target2.code;

  currentSource = "";
  currentTarget1 = "";
  currentTarget2 = "";
  turnActive1 = false;
  turnActive2 = false;
}

// Bind language buttons
Object.entries(langBtns).forEach(([langKey, btn]) => {
  btn?.addEventListener("click", () => setLanguage(langKey));
});

/* ─── Mic Device Monitoring & Auto-Refresh ─── */
let knownDeviceSignature = "";

/**
 * Request audio permission briefly if labels are obscured/blank,
 * allowing browser to show actual hardware names (e.g. USB Microphone).
 */
async function unlockMicLabels() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn("마이크 권한 요청 실패/거절됨:", err);
    return false;
  }
}

/**
 * Enumerates all audio input devices and updates the <select> element.
 * Skips unnecessary DOM rebuilds if device list has not changed.
 */
async function refreshMicDevices(force = false) {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    const signature = audioInputs
      .map((d) => `${d.deviceId}::${d.label}`)
      .sort()
      .join("||");

    if (!force && signature === knownDeviceSignature) {
      return;
    }
    knownDeviceSignature = signature;

    const previousValue = micSelect.value || localStorage.getItem("preferred_mic_id") || "";
    let matched = false;

    micSelect.innerHTML = `<option value="">기본 마이크 (Default)</option>`;

    audioInputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      // If label is empty, indicate permission may be needed
      const displayName = device.label || `마이크 ${index + 1} (권한 필요)`;
      option.textContent = displayName;
      if (device.deviceId && device.deviceId === previousValue) {
        option.selected = true;
        matched = true;
      }
      micSelect.appendChild(option);
    });

    // If currently selected device was disconnected while streaming, fall back to default
    if (previousValue && !matched && previousValue !== "") {
      console.log("선택된 마이크 장치 연결 끊김 감지 → 기본 마이크로 전환");
      micSelect.value = "";
      localStorage.removeItem("preferred_mic_id");
      if (mediaStream) {
        stopMicrophone();
        await startMicrophone();
      }
    }
  } catch (err) {
    console.warn("마이크 장치 목록 확인 실패:", err);
  }
}

// 1. Continuous background polling (every 1.5s) to detect USB plug/unplug immediately
setInterval(() => refreshMicDevices(false), 1500);

// 2. Browser hardware change event
navigator.mediaDevices?.addEventListener("devicechange", () => {
  console.log("오디오 장치 변경 이벤트(devicechange) 감지");
  refreshMicDevices(true);
});

// 3. Update immediately when user clicks or opens the dropdown
micSelect?.addEventListener("focus", () => refreshMicDevices(true));
micSelect?.addEventListener("mousedown", () => refreshMicDevices(true));

// 4. Manual refresh button: spins icon, unlocks labels if needed, and forces enumeration
micRefreshBtn?.addEventListener("click", async () => {
  micRefreshBtn.classList.add("spinning");
  try {
    await unlockMicLabels();
  } finally {
    await refreshMicDevices(true);
    setTimeout(() => micRefreshBtn.classList.remove("spinning"), 600);
  }
});

// 5. Seamless live device switching during active translation
micSelect?.addEventListener("change", async () => {
  const newId = micSelect.value;
  if (newId) {
    localStorage.setItem("preferred_mic_id", newId);
  } else {
    localStorage.removeItem("preferred_mic_id");
  }

  if (mediaStream) {
    console.log("스트리밍 중 마이크 장치 변경됨 → 새 마이크로 전환:", newId);
    stopMicrophone();
    await startMicrophone();
  }
});

// Initial discovery
refreshMicDevices(true);

/* ─── Audio level meter ─── */
function updateMeter() {
  if (!analyserNode) return;
  const data = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const pct = Math.min(100, Math.round((sum / data.length / 64) * 100));
  if (micMeterBar) micMeterBar.style.width = `${pct}%`;
  meterAnimFrame = requestAnimationFrame(updateMeter);
}

/* ─── Base64 encode ─── */
function base64FromBytes(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ─── History ─── */
function addHistory(src, t1, t2, config) {
  if (!src.trim() && !t1.trim() && !t2.trim()) return;

  const item = document.createElement("div");
  item.className = "history-item";

  const srcText = src.trim() || "(음성 인식 없음)";
  const t1Text = t1.trim() || "-";
  const t2Text = t2.trim() || "-";

  item.innerHTML = `
    <div class="history-source">
      <span>${config.flag}</span>
      <span>${escapeHtml(srcText)}</span>
    </div>
    <div class="history-translations">
      <div class="history-trans-card t1">
        <div class="tag">${config.target1.flag} ${config.target1.name}</div>
        <div class="content">${escapeHtml(t1Text)}</div>
      </div>
      <div class="history-trans-card t2">
        <div class="tag">${config.target2.flag} ${config.target2.name}</div>
        <div class="content">${escapeHtml(t2Text)}</div>
      </div>
    </div>
  `;

  historyList.prepend(item);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ─── Timer ─── */
function updateTimer() {
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const timeStr = `${mm}:${ss}`;
  if (timerEl) timerEl.textContent = timeStr;
  if (timerBadge) timerBadge.textContent = timeStr;
}

/* ─── History Modal Control ─── */
function openHistoryModal() {
  historyModal?.classList.remove("hidden");
}

function closeHistoryModal() {
  historyModal?.classList.add("hidden");
}

historyModalBtn?.addEventListener("click", openHistoryModal);
closeHistoryModalBtn?.addEventListener("click", closeHistoryModal);
clearHistoryBtn?.addEventListener("click", () => {
  if (historyList) historyList.innerHTML = "";
});

historyModal?.addEventListener("click", (e) => {
  if (e.target === historyModal) {
    closeHistoryModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !historyModal?.classList.contains("hidden")) {
    closeHistoryModal();
  }
});

/* ─── Audio Helpers ─── */
function float32ToInt16(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function resampleLinear(buffer, inputRate, outputRate = 16000) {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origin = i * ratio;
    const index = Math.floor(origin);
    const decimal = origin - index;
    const next = Math.min(index + 1, buffer.length - 1);
    result[i] = buffer[index] * (1 - decimal) + buffer[next] * decimal;
  }
  return result;
}

/* ─── API Key ─── */
let _cachedKey = null;
async function getApiKey() {
  if (_cachedKey) return _cachedKey;
  const response = await fetch("/api/key");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "API 키 발급 실패");
  _cachedKey = data.key;
  return _cachedKey;
}

/* ─── Microphone ─── */
async function startMicrophone() {
  const selectedMicId = micSelect?.value || undefined;
  const audioConstraints = {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (selectedMicId) audioConstraints.deviceId = { exact: selectedMicId };

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
  await refreshMicDevices(true);

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  } catch {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  await audioContext.resume();

  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 128;
  sourceNode.connect(analyserNode);
  updateMeter();

  processorNode = audioContext.createScriptProcessor(4096, 1, 1);
  processorNode.onaudioprocess = (event) => {
    if (!isReady1 && !isReady2) return;

    const input = event.inputBuffer.getChannelData(0);
    const mono16k =
      audioContext.sampleRate === 16000
        ? input
        : resampleLinear(input, audioContext.sampleRate, 16000);
    const pcm16 = float32ToInt16(mono16k);
    const data = base64FromBytes(new Uint8Array(pcm16.buffer));

    const payload = JSON.stringify({
      realtimeInput: {
        audio: { data, mimeType: "audio/pcm;rate=16000" },
      },
    });

    // Broadcast to both WebSockets in parallel
    if (ws1 && ws1.readyState === WebSocket.OPEN && isReady1) {
      try { ws1.send(payload); } catch (e) { console.error("WS1 send error:", e); }
    }
    if (ws2 && ws2.readyState === WebSocket.OPEN && isReady2) {
      try { ws2.send(payload); } catch (e) { console.error("WS2 send error:", e); }
    }
  };

  sourceNode.connect(processorNode);

  // Mute local output to avoid feedback loop
  const muteNode = audioContext.createGain();
  muteNode.gain.value = 0;
  processorNode.connect(muteNode);
  muteNode.connect(audioContext.destination);
}

function stopMicrophone() {
  if (meterAnimFrame) { cancelAnimationFrame(meterAnimFrame); meterAnimFrame = null; }
  if (analyserNode) { try { analyserNode.disconnect(); } catch {} analyserNode = null; }
  if (micMeterBar) micMeterBar.style.width = "0%";
  if (processorNode) { processorNode.disconnect(); processorNode.onaudioprocess = null; processorNode = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
}

/* ─── Schedule Turn Commit ─── */
function scheduleTurnCommit() {
  if (commitTimeout) clearTimeout(commitTimeout);
  commitTimeout = setTimeout(() => {
    // 히스토리에는 최근 발화된 문장을 추가 (전체 누적 텍스트 중복 방지)
    const getLastLine = (txt) => {
      const parts = txt.trim().split("\n").filter(Boolean);
      return parts.length > 0 ? parts[parts.length - 1] : "";
    };

    const sLast = getLastLine(currentSource);
    const t1Last = getLastLine(currentTarget1);
    const t2Last = getLastLine(currentTarget2);

    if (sLast || t1Last || t2Last) {
      addHistory(sLast, t1Last, t2Last, LANG_CONFIGS[selectedLang]);
    }
    turnActive1 = false;
    turnActive2 = false;
  }, 1400);
}

/* ─── Start Dual Live Translation Session ─── */
async function start() {
  if (ws1 || ws2) return;

  try {
    setStatus("연결 준비 중...", "idle");
    startBtn.disabled = true;

    const config = LANG_CONFIGS[selectedLang];

    // Get API key for direct BidiGenerateContent endpoint
    const apiKey = await getApiKey();
    const wsUrl = `${WS_ENDPOINT_BASE}?key=${encodeURIComponent(apiKey)}`;

    turnActive1 = false;
    turnActive2 = false;
    isReady1 = false;
    isReady2 = false;
    currentSource = "";
    currentTarget1 = "";
    currentTarget2 = "";

    sourceText.textContent = "...";
    target1Text.textContent = "...";
    target2Text.textContent = "...";

    // Setup 1 (Target 1 + Input Audio Transcription)
    ws1 = new WebSocket(wsUrl);
    ws1.onopen = () => {
      console.log(`WS1 (${config.target1.name}: ${config.target1.code}) 연결됨`);
      const setupMsg = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
            translationConfig: {
              targetLanguageCode: config.target1.code,
              echoTargetLanguage: false,
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };
      ws1.send(JSON.stringify(setupMsg));
    };

    ws1.onmessage = async (event) => {
      const raw = typeof event.data === "string" ? event.data : await event.data.text();
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.setupComplete) {
        console.log(`✅ WS1 (${config.target1.name}: ${config.target1.code}) setup 완료`);
        isReady1 = true;
        checkAllReady();
        return;
      }

      const content = msg.serverContent;
      if (!content) return;

      if (!turnActive1 && (content.inputTranscription?.text || content.outputTranscription?.text)) {
        currentSource = appendTurnBreak(currentSource);
        currentTarget1 = appendTurnBreak(currentTarget1);
        turnActive1 = true;
      }

      // Recognized original speech
      if (content.inputTranscription?.text) {
        currentSource += content.inputTranscription.text;
        updatePanel(sourceText, currentSource);
        scheduleTurnCommit();
      }

      // Target 1 translation
      if (content.outputTranscription?.text) {
        currentTarget1 += content.outputTranscription.text;
        updatePanel(target1Text, currentTarget1);
        scheduleTurnCommit();
      } else if (content.modelTurn?.parts) {
        for (const p of content.modelTurn.parts) {
          if (p.text) {
            currentTarget1 += p.text;
            updatePanel(target1Text, currentTarget1);
            scheduleTurnCommit();
          }
        }
      }

      if (content.turnComplete) {
        scheduleTurnCommit();
      }
    };

    ws1.onerror = (e) => console.error("WS1 오류:", e);
    ws1.onclose = (e) => {
      console.log("WS1 종료:", e.code, e.reason);
      if (e.code !== 1000 && (ws1 || ws2)) {
        setStatus(`WS1 연결 끊김 (${e.code})`, "error");
      }
    };

    // Setup 2 (Target 2 translation)
    ws2 = new WebSocket(wsUrl);
    ws2.onopen = () => {
      console.log(`WS2 (${config.target2.name}: ${config.target2.code}) 연결됨`);
      const setupMsg = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
            translationConfig: {
              targetLanguageCode: config.target2.code,
              echoTargetLanguage: false,
            },
          },
          outputAudioTranscription: {},
        },
      };
      ws2.send(JSON.stringify(setupMsg));
    };

    ws2.onmessage = async (event) => {
      const raw = typeof event.data === "string" ? event.data : await event.data.text();
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.setupComplete) {
        console.log(`✅ WS2 (${config.target2.name}: ${config.target2.code}) setup 완료`);
        isReady2 = true;
        checkAllReady();
        return;
      }

      const content = msg.serverContent;
      if (!content) return;

      if (!turnActive2 && content.outputTranscription?.text) {
        currentTarget2 = appendTurnBreak(currentTarget2);
        turnActive2 = true;
      }

      // Target 2 translation
      if (content.outputTranscription?.text) {
        currentTarget2 += content.outputTranscription.text;
        updatePanel(target2Text, currentTarget2);
        scheduleTurnCommit();
      } else if (content.modelTurn?.parts) {
        for (const p of content.modelTurn.parts) {
          if (p.text) {
            currentTarget2 += p.text;
            updatePanel(target2Text, currentTarget2);
            scheduleTurnCommit();
          }
        }
      }

      if (content.turnComplete) {
        scheduleTurnCommit();
      }
    };

    ws2.onerror = (e) => console.error("WS2 오류:", e);
    ws2.onclose = (e) => {
      console.log("WS2 종료:", e.code, e.reason);
      if (e.code !== 1000 && (ws1 || ws2)) {
        setStatus(`WS2 연결 끊김 (${e.code})`, "error");
      }
    };

    async function checkAllReady() {
      if (isReady1 && isReady2 && !mediaStream) {
        setStatus(`🎤 번역 중 (${config.flag} → ${config.target1.flag} · ${config.target2.flag})`, "live");
        stopBtn.disabled = false;
        startedAt = Date.now();
        timerHandle = setInterval(updateTimer, 1000);
        await startMicrophone();
      }
    }
  } catch (error) {
    console.error("세션 시작 실패:", error);
    setStatus(`오류: ${error.message}`, "error");
    startBtn.disabled = false;
    stop();
  }
}

/* ─── Stop Session ─── */
function stop() {
  if (commitTimeout) {
    clearTimeout(commitTimeout);
    commitTimeout = null;
  }

  if (currentSource.trim() || currentTarget1.trim() || currentTarget2.trim()) {
    addHistory(currentSource, currentTarget1, currentTarget2, LANG_CONFIGS[selectedLang]);
  }

  stopMicrophone();

  if (ws1) { try { ws1.close(); } catch {} ws1 = null; }
  if (ws2) { try { ws2.close(); } catch {} ws2 = null; }

  isReady1 = false;
  isReady2 = false;
  turnActive1 = false;
  turnActive2 = false;
  stopBtn.disabled = true;
  startBtn.disabled = false;

  clearInterval(timerHandle);
  timerHandle = null;
  if (timerBadge) timerBadge.textContent = "00:00";
  if (timerEl) timerEl.textContent = "00:00";

  setStatus("대기 중", "idle");
}

/* ─── Event Listeners ─── */
startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", stop);

clearBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  const config = LANG_CONFIGS[selectedLang];
  sourceText.textContent = config.sourcePlaceholder;
  target1Text.textContent = config.target1.placeholder;
  target2Text.textContent = config.target2.placeholder;
  currentSource = "";
  currentTarget1 = "";
  currentTarget2 = "";
  turnActive1 = false;
  turnActive2 = false;
});

fontSizeEl.addEventListener("input", () => {
  const size = `${fontSizeEl.value}px`;
  target1Text.style.fontSize = size;
  target2Text.style.fontSize = size;
});

fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});
