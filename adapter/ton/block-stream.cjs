"use strict";
const { WebSocket } = require("ws");

// One upstream connection for the whole explorer, following LTC SharedFeed's
// reconnect/watchdog lifecycle. Browsers consume our cached fanout, not upstream.
class BlockStream {
  constructor({ onHead, onStatus = () => {}, url = process.env.TON_BLOCK_STREAM_URL || "wss://mainnet-v4.tonhubapi.com/block/watch/changed", WebSocketClass = WebSocket }) {
    Object.assign(this, { onHead, onStatus, url, WebSocketClass });
    this.stopped = true;
    this.attempt = 0;
    this.state = "disconnected";
    this.lastMessage = 0;
    this.lastEvent = null;
    this.connections = 0;
  }
  status(state) {
    this.state = state;
    this.onStatus(this.health());
  }
  health() {
    return { state: this.state, lastMessageAt: this.lastMessage ? new Date(this.lastMessage).toISOString() : null, lastEvent: this.lastEvent, connections: this.connections };
  }
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }
  connect() {
    if (this.stopped) return;
    this.status("connecting");
    const socket = this.socket = new this.WebSocketClass(this.url, { handshakeTimeout: 10000, maxPayload: 4 * 1024 * 1024 });
    this.connections++;
    this.lastMessage = Date.now();
    socket.on("open", () => {
      if (this.stopped || socket !== this.socket) return;
      this.status("connected");
      this.watchdog = setInterval(() => {
        if (Date.now() - this.lastMessage > 30000) socket.terminate();
        else if (socket.readyState === 1) socket.ping();
      }, 10000);
      this.watchdog.unref?.();
    });
    socket.on("message", raw => {
      if (this.stopped || socket !== this.socket) return;
      let event;
      try { event = JSON.parse(raw.toString()); } catch { return; }
      const seqno = Number(event?.seqno);
      if (!Number.isSafeInteger(seqno) || seqno <= 0) return;
      this.lastMessage = Date.now();
      this.lastEvent = { seqno, receivedAt: new Date(this.lastMessage).toISOString() };
      this.attempt = 0;
      this.status("live");
      // Notification fields establish a target, never fabricated header values.
      this.onHead({ seqno, lastUtime: event.lastUtime, receivedAt: this.lastMessage });
    });
    socket.on("error", () => {});
    socket.on("close", () => {
      clearInterval(this.watchdog);
      if (this.stopped || socket !== this.socket) return;
      this.status("reconnecting");
      const delay = Math.min(60000, 1000 * 2 ** Math.min(this.attempt++, 6)) + Math.floor(Math.random() * 300);
      this.retry = setTimeout(() => this.connect(), delay);
      this.retry.unref?.();
    });
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.watchdog);
    this.socket?.terminate();
    this.status("stopped");
  }
}
module.exports = { BlockStream };
