import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

// 敏感信息检查：只存「类别模式」，不存任何具体敏感串，
// 因此本脚本可安全提交。匹配内容在输出中做掩码处理。
const roots = ["src", "dist", "docs", "public", "scripts"];
const rootFiles = [
  "manifest.json",
  "package.json",
  "README.md",
  "BLOG.md",
  "DESIGN.md",
  "PRODUCT.md",
  "PRIVACY.md",
  "STORE_LISTING.md",
];
// 本文件自身仅包含转义/拼接形式的检测模式，无敏感实例，跳过以避免自匹配。
const selfPath = join("scripts", "check-secrets.mjs");

const patterns = [
  {
    name: "tailscale-magicdns",
    // 形如 <node>.tail<hex>.ts.net 的 Tailscale 私网全名
    regex: /\b[a-z0-9-]+\.tail[0-9a-f]{4,}\.ts\.net\b/gi,
  },
  {
    name: "tailscale-domain",
    regex: /\bts\.net\b/gi,
  },
  {
    name: "personal-email",
    regex: /[A-Za-z0-9._%+-]+@(?:gmail|qq|outlook|163|foxmail)\.com/gi,
  },
  {
    name: "google-authuser-param",
    // 拼接构造，避免脚本文本自匹配
    regex: new RegExp("auth" + "user=", "gi"),
  },
];

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
]);

async function collect(path) {
  let info;
  try {
    info = await stat(path);
  } catch {
    return [];
  }
  if (info.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => collect(join(path, entry.name))),
  );
  return nested.flat();
}

function mask(text) {
  if (text.length <= 4) return "*".repeat(text.length);
  return text.slice(0, 2) + "*".repeat(Math.max(3, text.length - 4)) + text.slice(-2);
}

const files = (
  await Promise.all([...roots, ...rootFiles].map((path) => collect(path)))
).flat();
const hits = [];

for (const file of files) {
  const rel = relative(process.cwd(), file);
  if (rel.split(sep).join("/") === selfPath.split(sep).join("/")) continue;
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const content = await readFile(file, "utf8");
  const lines = content.split("\n");
  for (const { name, regex } of patterns) {
    lines.forEach((line, index) => {
      regex.lastIndex = 0;
      const match = regex.exec(line);
      if (match) {
        hits.push(`${rel}:${index + 1} [${name}] ${mask(match[0])}`);
      }
    });
  }
}

if (hits.length > 0) {
  console.error("Secret check failed:");
  for (const hit of hits) console.error(`- ${hit}`);
  process.exitCode = 1;
} else {
  console.log(`Secret check passed (${files.length} files scanned).`);
}
