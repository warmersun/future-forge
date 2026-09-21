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

export { resampleFloat32, float32ToPcm16Base64, base64Pcm16ToFloat32 };

export const VOICE_SAMPLE_RATE = 24_000;
const CHUNK_SAMPLES = 2400; // 100 ms at 24 kHz
const CONTEXT_DEBOUNCE_MS = 1000;

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
  let captureCtx = null;
  let playCtx = null;
  let processor = null;
  let sourceNode = null;
  let muted = false;
  let playTime = 0;
  /** @type {AudioBufferSourceNode[]} */
  let playing = [];
  let pendingPcm = new Float32Array(0);
  let contextTimer = 0;
  let startedOk = false;
  let reserved = false;

  const setState = (next, detail) => {
    state = next;
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

  const stopPlayback = () => {
    for (const src of playing) {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
    }
    playing = [];
    if (playCtx) playTime = playCtx.currentTime;
  };

  const enqueuePlayback = (float32) => {
    if (!playCtx || !float32.length) return;
    if (playCtx.state === "suspended") {
      void playCtx.resume().catch(() => {});
    }
    const buf = playCtx.createBuffer(1, float32.length, VOICE_SAMPLE_RATE);
    buf.copyToChannel(float32, 0);
    const src = playCtx.createBufferSource();
    src.buffer = buf;
    src.connect(playCtx.destination);
    const now = playCtx.currentTime;
    if (playTime < now) playTime = now;
    src.start(playTime);
    playTime += buf.duration;
    playing.push(src);
    src.onended = () => {
      playing = playing.filter((s) => s !== src);
    };
  };

  const sendJson = (obj) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  };

  const flushCapture = (float32) => {
    if (muted || !float32.length) return;
    const native = captureCtx?.sampleRate || VOICE_SAMPLE_RATE;
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

  const stopMic = () => {
    try {
      processor?.disconnect();
    } catch {
      /* ignore */
    }
    processor = null;
    try {
      sourceNode?.disconnect();
    } catch {
      /* ignore */
    }
    sourceNode = null;
    try {
      captureCtx?.close();
    } catch {
      /* ignore */
    }
    captureCtx = null;
    if (mediaStream) {
      for (const t of mediaStream.getTracks()) {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      }
    }
    mediaStream = null;
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
    stopMic();
    stopPlayback();
    try {
      playCtx?.close();
    } catch {
      /* ignore */
    }
    playCtx = null;
    session = null;
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
    if (type === "ready") {
      startedOk = true;
      try {
        opts.afterRequest?.("voice", true);
      } catch {
        /* host */
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

  const startMic = async () => {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    captureCtx = new AudioContext();
    playCtx = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
    playTime = playCtx.currentTime;
    sourceNode = captureCtx.createMediaStreamSource(mediaStream);
    const bufSize = 2048;
    processor = captureCtx.createScriptProcessor(bufSize, 1, 1);
    processor.onaudioprocess = (ev) => {
      if (muted) return;
      const input = ev.inputBuffer.getChannelData(0);
      flushCapture(new Float32Array(input));
    };
    const silent = captureCtx.createGain();
    silent.gain.value = 0;
    sourceNode.connect(processor);
    processor.connect(silent);
    silent.connect(captureCtx.destination);
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
    if (opts.beforeRequest) {
      const ok = await opts.beforeRequest("voice");
      if (!ok) return;
    }
    reserved = true;
    stopReadAloud();
    setState("connecting");
    live = call;
    startedOk = false;
    try {
      const ctx = opts.getContext?.() || {};
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
      await startMic();
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

  const pushContext = (context) => {
    if (!session) return;
    if (contextTimer) clearTimeout(contextTimer);
    contextTimer = setTimeout(() => {
      contextTimer = 0;
      sendJson({ type: "context", context });
    }, CONTEXT_DEBOUNCE_MS);
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
