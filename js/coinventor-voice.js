/**
 * Grok Voice client for the AI co-inventor.
 * Captures mic PCM, plays assistant audio, relays captions/proposals.
 * One live call for the whole app.
 */

import { getClientSessionId } from "./client-session.js";
import { apiFetch, isClerkReady, openCloudSignIn } from "./auth.js";
import { stopReadAloud } from "./read-aloud.js";
import {
  resampleFloat32,
  float32ToPcm16Base64,
  base64Pcm16ToFloat32,
} from "./voice-pcm.js";
import { isRecoverableVoiceError } from "./voice-errors.js";
import { voiceContextFingerprint } from "./voice-context.js";

export { resampleFloat32, float32ToPcm16Base64, base64Pcm16ToFloat32 };

export const VOICE_SAMPLE_RATE = 24_000;
const CHUNK_SAMPLES = 2400; // 100 ms at 24 kHz
const CONTEXT_DEBOUNCE_MS = 1000;
/** Hold the first ~120 ms of a reply so a late TCP chunk does not punch a hole. */
const PREROLL_SAMPLES = Math.round(VOICE_SAMPLE_RATE * 0.12);
const PREROLL_MS = 120;
const CAPTURE_WORKLET_URL = new URL("./voice-capture-worklet.js?v=voice-6", import.meta.url).href;

/** @typedef {"idle"|"connecting"|"listening"|"speaking"|"muted"|"error"} VoiceUiState */

/** @type {VoiceCall|null} */
let live = null;
/** @type {VoiceCall|null} */
let sharedCall = null;
/** @type {object|null} */
let boundHost = null;

export function isVoiceLive() {
  return Boolean(live && live.state !== "idle" && live.state !== "error");
}

export function hangupVoice() {
  live?.hangup();
}

export function voiceUiState() {
  return live?.state || "idle";
}

/**
 * @param {object} opts
 * @param {() => object} opts.getContext
 * @param {(mode: string) => boolean|Promise<boolean>} [opts.beforeRequest]
 * @param {(mode: string, ok: boolean) => void} [opts.afterRequest]
 * @param {(body: object) => Promise<unknown>} [opts.transport]
 * @param {(ev: object) => void} [opts.onEvent]
 * @param {(state: VoiceUiState, detail?: object) => void} [opts.onState]
 */
export function createVoiceCall(opts) {
  /** @type {VoiceUiState} */
  let state = "idle";
  let ws = null;
  let session = null;
  let mediaStream = null;
  /** @type {Promise<MediaStream>|null} */
  let micPromise = null;
  /** @type {AudioContext|null} */
  let audioCtx = null;
  let processor = null;
  let sourceNode = null;
  let muted = false;
  let playTime = 0;
  /** @type {AudioBufferSourceNode[]} */
  let playing = [];
  let pendingPcm = new Float32Array(0);
  /** @type {Float32Array[]} */
  let holdChunks = [];
  let holdSamples = 0;
  let playbackPrimed = false;
  let holdTimer = 0;
  let contextTimer = 0;
  let startedOk = false;
  let reserved = false;
  /** Fingerprint of the invent snapshot already given to this call. */
  let sentFp = "";
  let pendingFp = "";
  /** @type {object|null} */
  let pendingContext = null;

  const setState = (next, detail) => {
    const same = state === next && detail == null;
    state = next;
    if (same) return;
    try {
      opts.onState?.(next, detail);
    } catch {
      /* host */
    }
  };

  const emit = (ev) => {
    try {
      opts.onEvent?.(ev);
    } catch {
      /* host */
    }
  };

  const clearHold = () => {
    holdChunks = [];
    holdSamples = 0;
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = 0;
    }
  };

  const stopPlayback = () => {
    clearHold();
    playbackPrimed = false;
    for (const src of playing) {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
    }
    playing = [];
    if (audioCtx) playTime = audioCtx.currentTime;
  };

  const schedulePlayback = (float32) => {
    if (!audioCtx || !float32.length) return;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    const buf = audioCtx.createBuffer(1, float32.length, VOICE_SAMPLE_RATE);
    buf.copyToChannel(float32, 0);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (playTime < now) playTime = now;
    src.start(playTime);
    playTime += buf.duration;
    playing.push(src);
    src.onended = () => {
      playing = playing.filter((s) => s !== src);
    };
  };

  const flushHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = 0;
    }
    if (!holdSamples) {
      playbackPrimed = true;
      return;
    }
    const merged = new Float32Array(holdSamples);
    let offset = 0;
    for (const chunk of holdChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    holdChunks = [];
    holdSamples = 0;
    playbackPrimed = true;
    schedulePlayback(merged);
  };

  const enqueuePlayback = (float32) => {
    if (!audioCtx || !float32.length) return;
    if (playbackPrimed) {
      schedulePlayback(float32);
      return;
    }
    holdChunks.push(float32);
    holdSamples += float32.length;
    if (holdSamples >= PREROLL_SAMPLES) {
      flushHold();
      return;
    }
    if (!holdTimer) holdTimer = setTimeout(flushHold, PREROLL_MS);
  };

  const sendJson = (obj) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  };

  const flushCapture = (float32) => {
    if (muted || !float32.length) return;
    const native = audioCtx?.sampleRate || VOICE_SAMPLE_RATE;
    const resampled = resampleFloat32(float32, native, VOICE_SAMPLE_RATE);
    const merged = new Float32Array(pendingPcm.length + resampled.length);
    merged.set(pendingPcm);
    merged.set(resampled, pendingPcm.length);
    let offset = 0;
    while (merged.length - offset >= CHUNK_SAMPLES) {
      const slice = merged.subarray(offset, offset + CHUNK_SAMPLES);
      sendJson({
        type: "input_audio_buffer.append",
        audio: float32ToPcm16Base64(slice),
      });
      offset += CHUNK_SAMPLES;
    }
    pendingPcm = merged.slice(offset);
  };

  const stopStream = (stream) => {
    if (!stream) return;
    for (const t of stream.getTracks()) {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    }
  };

  const stopMic = () => {
    try {
      processor?.disconnect();
    } catch {
      /* ignore */
    }
    if (processor?.port) {
      try {
        processor.port.onmessage = null;
        processor.port.close();
      } catch {
        /* ignore */
      }
    }
    processor = null;
    try {
      sourceNode?.disconnect();
    } catch {
      /* ignore */
    }
    sourceNode = null;
    const pendingMic = micPromise;
    micPromise = null;
    if (mediaStream) stopStream(mediaStream);
    else if (pendingMic) {
      void pendingMic.then((stream) => stopStream(stream)).catch(() => {});
    }
    mediaStream = null;
    try {
      audioCtx?.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
    pendingPcm = new Float32Array(0);
  };

  const hangup = () => {
    if (contextTimer) {
      clearTimeout(contextTimer);
      contextTimer = 0;
    }
    sendJson({ type: "hangup" });
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
    stopPlayback();
    stopMic();
    session = null;
    sentFp = "";
    pendingFp = "";
    pendingContext = null;
    if (reserved && !startedOk) {
      try {
        opts.afterRequest?.("voice", false);
      } catch {
        /* host */
      }
    }
    reserved = false;
    startedOk = false;
    muted = false;
    if (live === call) live = null;
    setState("idle");
  };

  const onServerEvent = (event) => {
    const type = String(event.type || "");
    if (type === "reconnecting") {
      stopPlayback();
      setState("connecting", { reconnecting: true });
      return;
    }
    if (type === "ready") {
      const firstReady = !startedOk;
      startedOk = true;
      if (firstReady) {
        try {
          opts.afterRequest?.("voice", true);
        } catch {
          /* host */
        }
      }
      if (!muted) setState("listening");
      return;
    }
    if (type === "error") {
      const err = String(event.error || "voice_error");
      if (isRecoverableVoiceError(err)) return;
      emit({ type: "error", error: err });
      if (err === "sign_in_required" && isClerkReady()) openCloudSignIn();
      hangup();
      setState("error", { error: err });
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      // server_vad already barges in. Canceling with no in-flight
      // response yields "Cancellation failed: no active response found"
      // and must not hang up the call.
      stopPlayback();
      if (!muted) setState("listening");
      emit({ type: "user_speech_started" });
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      emit({ type: "user_speech_stopped" });
      return;
    }
    if (type === "conversation.item.input_audio_transcription.updated") {
      emit({
        type: "user_caption",
        text: String(event.transcript || event.text || ""),
        final: false,
      });
      return;
    }
    if (type === "conversation.item.input_audio_transcription.completed") {
      emit({
        type: "user_caption",
        text: String(event.transcript || event.text || ""),
        final: true,
      });
      return;
    }
    if (type === "response.created") {
      // Each response, including the one after a tool, gets its own preroll.
      // Audio already scheduled for the previous response keeps playing.
      clearHold();
      playbackPrimed = false;
      if (!muted) setState("speaking");
      return;
    }
    if (type === "response.output_audio_transcript.delta") {
      emit({
        type: "assistant_caption",
        text: String(event.delta || ""),
        final: false,
      });
      return;
    }
    if (type === "response.output_audio_transcript.done") {
      emit({
        type: "assistant_caption",
        text: String(event.transcript || event.text || ""),
        final: true,
      });
      return;
    }
    if (type === "response.output_audio.delta" || type === "response.audio.delta") {
      const b64 = String(event.delta || event.audio || "");
      if (b64) enqueuePlayback(base64Pcm16ToFloat32(b64));
      if (!muted) setState("speaking");
      return;
    }
    if (type === "response.done") {
      emit({ type: "assistant_turn_done" });
      if (!muted) setState("listening");
      return;
    }
    if (type === "proposals") {
      emit({
        type: "proposals",
        proposals: event.proposals,
        message: event.message || "",
        endTutoring: Boolean(event.endTutoring),
      });
    }
  };

  const attachGraph = async (stream) => {
    mediaStream = stream;
    sourceNode = audioCtx.createMediaStreamSource(stream);
    const silent = audioCtx.createGain();
    silent.gain.value = 0;
    let captureNode = null;
    try {
      await audioCtx.audioWorklet.addModule(CAPTURE_WORKLET_URL);
      const node = new AudioWorkletNode(audioCtx, "voice-capture");
      node.port.onmessage = (ev) => {
        if (muted) return;
        const data = ev.data;
        if (data instanceof Float32Array && data.length) flushCapture(data);
      };
      captureNode = node;
    } catch {
      captureNode = audioCtx.createScriptProcessor(2048, 1, 1);
      captureNode.onaudioprocess = (ev) => {
        if (muted) return;
        flushCapture(new Float32Array(ev.inputBuffer.getChannelData(0)));
      };
    }
    processor = captureNode;
    sourceNode.connect(captureNode);
    captureNode.connect(silent);
    silent.connect(audioCtx.destination);
    playTime = audioCtx.currentTime;
  };

  const releaseEarlyMic = async () => {
    const pendingMic = micPromise;
    micPromise = null;
    if (pendingMic) {
      try {
        stopStream(await pendingMic);
      } catch {
        /* permission denied or already stopped */
      }
    }
    try {
      await audioCtx?.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
  };

  const start = async () => {
    if (state === "connecting" || state === "listening" || state === "speaking" || state === "muted") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error", { error: "mic_unsupported" });
      emit({ type: "error", error: "mic_unsupported" });
      return;
    }
    // Same turn as the click. Safari drops the user gesture across the awaits below.
    try {
      micPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      audioCtx = new AudioContext();
      void audioCtx.resume().catch(() => {});
    } catch (e) {
      await releaseEarlyMic();
      const msg = String(e?.message || e || "mic_unsupported");
      emit({ type: "error", error: msg });
      setState("error", { error: msg });
      return;
    }
    if (opts.beforeRequest) {
      let ok = false;
      try {
        ok = await opts.beforeRequest("voice");
      } catch {
        ok = false;
      }
      if (!ok) {
        await releaseEarlyMic();
        return;
      }
    }
    reserved = true;
    stopReadAloud();
    const ctx = opts.getContext?.() || {};
    sentFp = voiceContextFingerprint(ctx);
    pendingFp = "";
    pendingContext = null;
    live = call;
    setState("connecting");
    startedOk = false;
    try {
      const streamPromise = micPromise;
      if (typeof opts.transport === "function") {
        await opts.transport({
          mode: "voice",
          clientSessionId: getClientSessionId(),
          context: ctx,
          reservedAp: 1,
          tutor: Boolean(ctx.tutorMode),
        });
      }
      const res = await apiFetch("/api/co-invent-voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSessionId: getClientSessionId(),
          context: ctx,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "sign_in_required" && isClerkReady()) openCloudSignIn();
        throw new Error(data.message || data.error || "Voice session failed");
      }
      session = data;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const path = data.wsPath || "/ws/co-invent-voice";
      ws = new WebSocket(`${proto}//${location.host}${path}`);
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Voice socket timed out")), 12_000);
        ws.onopen = () => {
          clearTimeout(t);
          resolve();
        };
        ws.onerror = () => {
          clearTimeout(t);
          reject(new Error("Voice socket failed"));
        };
      });
      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        let event;
        try {
          event = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (event) onServerEvent(event);
      };
      ws.onclose = () => {
        if (live === call && (state === "listening" || state === "speaking" || state === "muted" || state === "connecting")) {
          hangup();
        }
      };
      sendJson({ type: "auth", sessionId: data.sessionId, token: data.token });
      const stream = await streamPromise;
      if (live !== call) {
        stopStream(stream);
        return;
      }
      await attachGraph(stream);
      scheduleContextFlush();
    } catch (e) {
      const msg = String(e?.message || e);
      emit({ type: "error", error: msg });
      hangup();
      setState("error", { error: msg });
    }
  };

  const setMuted = (on) => {
    muted = Boolean(on);
    if (mediaStream) {
      for (const t of mediaStream.getAudioTracks()) t.enabled = !muted;
    }
    if (muted) {
      pendingPcm = new Float32Array(0);
      sendJson({ type: "input_audio_buffer.clear" });
      setState("muted");
    } else if (session) {
      setState("listening");
    }
  };

  const scheduleContextFlush = () => {
    if (contextTimer) clearTimeout(contextTimer);
    contextTimer = setTimeout(() => {
      contextTimer = 0;
      if (!pendingContext || pendingFp === sentFp) {
        pendingFp = "";
        pendingContext = null;
        return;
      }
      if (sendJson({ type: "context", context: pendingContext })) {
        sentFp = pendingFp;
        pendingFp = "";
        pendingContext = null;
        return;
      }
      if (
        state === "connecting" ||
        state === "listening" ||
        state === "speaking" ||
        state === "muted"
      ) {
        scheduleContextFlush();
      }
    }, CONTEXT_DEBOUNCE_MS);
  };

  const pushContext = (context) => {
    const fp = voiceContextFingerprint(context);
    if (fp === sentFp) return;
    pendingContext = context;
    pendingFp = fp;
    scheduleContextFlush();
  };

  const onPageHide = () => hangup();
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", onPageHide);
  }

  const call = {
    get state() {
      return state;
    },
    get muted() {
      return muted;
    },
    start,
    hangup,
    setMuted,
    pushContext,
    toggle: async () => {
      if (state === "idle" || state === "error") await start();
      else hangup();
    },
  };
  return call;
}

/**
 * Point the singleton call at the visible co-inventor panel.
 * @param {object|null} host
 */
export function bindVoiceHost(host) {
  boundHost = host || null;
}

/**
 * One call for the whole app. Rebind host on remount so captions land on the live panel.
 * @param {object} host
 */
export function sharedVoiceCallFor(host) {
  bindVoiceHost(host);
  if (sharedCall) return sharedCall;
  sharedCall = createVoiceCall({
    getContext: () =>
      boundHost?._buildRequestContext?.() || boundHost?.getContext?.() || {},
    beforeRequest: (mode) =>
      boundHost?.beforeRequest ? boundHost.beforeRequest(mode) : true,
    afterRequest: (mode, ok) => boundHost?.afterRequest?.(mode, ok),
    transport: (body) => boundHost?.transport?.(body),
    onEvent: (ev) => boundHost?.onVoiceEvent?.(ev),
    onState: (st, detail) => boundHost?.onVoiceState?.(st, detail),
  });
  return sharedCall;
}
