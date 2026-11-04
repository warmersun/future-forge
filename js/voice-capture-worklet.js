/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Mic capture off the main thread. Posts ~2048-sample Float32 chunks.
 * Loaded by audioWorklet.addModule; not a page module.
 */
class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = new Float32Array(2048);
    this.n = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || !channel.length) return true;
    let offset = 0;
    while (offset < channel.length) {
      const space = this.pending.length - this.n;
      const take = Math.min(space, channel.length - offset);
      this.pending.set(channel.subarray(offset, offset + take), this.n);
      this.n += take;
      offset += take;
      if (this.n === this.pending.length) {
        const chunk = this.pending;
        this.pending = new Float32Array(2048);
        this.n = 0;
        this.port.postMessage(chunk, [chunk.buffer]);
      }
    }
    return true;
  }
}

registerProcessor("voice-capture", VoiceCaptureProcessor);
