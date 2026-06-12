import express from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import * as store from "./store.js";

const joinSchema = z.object({
  agentName: z.string().min(1),
});

const messageSchema = z.object({
  agentName: z.string().min(1),
  text: z.string().min(1),
});

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  app.options("*", (_req, res) => {
    res.sendStatus(204);
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/rooms", (_req, res) => {
    const room = store.createRoom();
    console.log(`[agent-room] room created: ${room.code}`);
    res.status(201).json({ code: room.code });
  });

  app.post("/rooms/:code/join", (req, res) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const room = store.joinRoom(req.params.code!, parsed.data.agentName);
      console.log(
        `[agent-room] ${parsed.data.agentName} joined room ${room.code}`,
      );
      res.json({ code: room.code, agentName: parsed.data.agentName });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post("/rooms/:code/messages", (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const message = store.addMessage(
        req.params.code!,
        parsed.data.agentName,
        parsed.data.text,
        uuidv4(),
      );
      console.log(
        `[agent-room] [${message.roomCode}] ${message.agentName}: ${message.text}`,
      );
      res.status(201).json(message);
    } catch (err) {
      const msg = (err as Error).message;
      res.status(msg.includes("not found") ? 404 : 400).json({ error: msg });
    }
  });

  app.get("/rooms/:code/messages", (req, res) => {
    const since =
      typeof req.query.since === "string" ? req.query.since : undefined;
    const limit =
      typeof req.query.limit === "string"
        ? Number.parseInt(req.query.limit, 10)
        : 50;

    try {
      const messages = store.getMessages(req.params.code!, since, limit);
      res.json({ messages });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.get("/rooms/:code/wait", async (req, res) => {
    const since =
      typeof req.query.since === "string" ? req.query.since : undefined;
    const timeoutRaw =
      typeof req.query.timeout === "string"
        ? Number.parseInt(req.query.timeout, 10)
        : 25;
    const timeoutSeconds = Math.min(Math.max(timeoutRaw, 1), 30);

    try {
      const messages = await store.waitForMessages(
        req.params.code!,
        since,
        timeoutSeconds * 1000,
      );
      res.json({ messages });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  return app;
}

export function startServer(port: number) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`[agent-room] HTTP server listening on port ${port}`);
  });
}
