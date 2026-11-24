import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { probeHooks } from "../dist/index.js";

const cwd = path.resolve("examples/demo-repo");
fs.mkdirSync(cwd, { recursive: true });
if (!fs.existsSync(path.join(cwd, ".git"))) {
  execFileSync("git", ["init"], { cwd, stdio: "ignore" });
}
fs.mkdirSync(path.join(cwd, ".husky"), { recursive: true });
fs.writeFileSync(path.join(cwd, ".husky", "pre-commit"), "#!/bin/sh\necho hi\n");
const out = path.resolve("examples/out-demo");
const r = probeHooks(cwd, out);
console.log(JSON.stringify({ issues: r.issues.length, out }, null, 2));
