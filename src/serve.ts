// bazi serve：本机 Web 排盘服务。
// 仅监听 127.0.0.1，提供静态页面与唯一业务 API POST /api/paipan。
// 默认端口 3000，--port 可覆盖，端口被占用时明确失败，Ctrl-C 干净关闭。

import { createServer, wrapServer, type PaipanServer } from "./http-server.js";

export interface ServeOptions {
  port?: number;
}

export function serve(opts: ServeOptions = {}): Promise<PaipanServer> {
  const port = opts.port ?? 3000;
  const server = createServer();

  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error("端口 " + port + " 已被占用，请使用 --port 指定其他端口"));
      } else {
        reject(err);
      }
    };
    server.once("error", onError);

    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onError);
      const url = "http://127.0.0.1:" + port;
      console.log("bazi serve 运行于 " + url);
      resolve(wrapServer(server, port));
    });
  });
}
