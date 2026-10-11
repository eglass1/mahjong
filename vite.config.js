import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

function offlineWorker() {
  let outDir;
  return {
    name: "learning-table-offline-worker",
    apply: "build",
    configResolved(config) {
      outDir = new URL(`./${config.build.outDir}/`, import.meta.url);
    },
    async closeBundle() {
      const template = await readFile(
        new URL("./src/service-worker.js", import.meta.url),
        "utf8",
      );
      const files = [
        "index.html",
        "manifest.webmanifest",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
      ];
      const buffers = await Promise.all(
        files.map((file) => readFile(new URL(file, outDir))),
      );
      const hash = createHash("sha256").update(template);
      for (const buffer of buffers) hash.update(buffer);
      await writeFile(
        new URL("sw.js", outDir),
        template.replace("__BUILD_ID__", hash.digest("hex").slice(0, 20)),
      );
    },
  };
}
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile(), offlineWorker()],
  build: { outDir: "docs", emptyOutDir: true },
});
