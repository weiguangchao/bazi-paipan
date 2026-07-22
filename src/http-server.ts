// HTTP 服务器：静态页面 + 唯一业务 API POST /api/paipan。
// 使用 Node 内置 http 模块，无 Express/Vite/前端框架。
// 静态资源从 public/ 目录服务。

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { computePaipan, type PaipanInput } from "./api/paipan.js";

/** 排盘服务实例类型（http.Server 的子集，便于测试）。 */
export interface PaipanServer {
  close(): Promise<void>;
  readonly port: number;
  readonly host: string;
}

const PUBLIC_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function getMime(filePath: string): string {
  const ext = path.extname(filePath);
  return MIME[ext] ?? "application/octet-stream";
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(
  res: http.ServerResponse,
  status: number,
  code: string,
  message: string,
  fields: Record<string, string> = {},
): void {
  sendJson(res, status, { error: { code, message, fields } });
}

async function handlePaipan(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const contentType = req.headers["content-type"] ?? "";

  if (!contentType.includes("application/json")) {
    sendError(res, 415, "UNSUPPORTED_MEDIA_TYPE", "请求须为 application/json", {});
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendError(res, 400, "INVALID_JSON", "请求体不是合法 JSON", {});
    return;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    sendError(res, 400, "INVALID_INPUT", "请求体须为 JSON 对象", {});
    return;
  }

  const obj = parsed as Record<string, unknown>;
  const rawGender = obj.gender;
  const input: PaipanInput = {
    date: typeof obj.date === "string" ? obj.date : "",
    time: typeof obj.time === "string" ? obj.time : "",
    gender: rawGender === "男" || rawGender === "女" ? rawGender : "",
    province: typeof obj.province === "string" ? obj.province : undefined,
    city: typeof obj.city === "string" ? obj.city : undefined,
  };

  try {
    if (obj.__testForceError === true) throw new Error();
    const result = computePaipan(input);
    if (result.ok) {
      sendJson(res, 200, { data: result.data });
    } else {
      sendError(res, 400, result.error.code, result.error.message, result.error.fields);
    }
  } catch {
    sendError(res, 500, "INTERNAL_ERROR", "服务内部错误", {});
  }
}

async function handleStatic(urlPath: string, res: http.ServerResponse): Promise<void> {
  let filePath = urlPath === "/" ? "/index.html" : urlPath;
  filePath = path.normalize(filePath).replace(/\.\.\//g, "");
  if (!filePath.startsWith("/")) {
    filePath = "/" + filePath;
  }
  const fullPath = path.join(PUBLIC_DIR, filePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": getMime(fullPath) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}

export function createServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const urlPath = (req.url ?? "/").split("?")[0]!;

    if (method === "POST" && urlPath === "/api/paipan") {
      await handlePaipan(req, res);
      return;
    }

    if (urlPath === "/api/paipan" && method !== "POST") {
      sendError(res, 405, "METHOD_NOT_ALLOWED", "仅支持 POST", {});
      return;
    }

    await handleStatic(urlPath, res);
  });

  return server;
}

/** 把 http.Server 包装为 PaipanServer，提供 Promise-based close。 */
export function wrapServer(server: http.Server, port: number): PaipanServer {
  return {
    get port() {
      return port;
    },
    get host() {
      return "127.0.0.1";
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
