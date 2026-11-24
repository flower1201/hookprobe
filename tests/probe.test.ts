import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { probeHooks } from "../src/core/probe.js";

describe("probeHooks", () => {
  it("flags husky dir without hooksPath", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "hookprobe-"));
    execFileSync("git", ["init"], { cwd, stdio: "ignore" });
    fs.mkdirSync(path.join(cwd, ".husky"));
    fs.writeFileSync(path.join(cwd, ".husky", "pre-commit"), "#!/bin/sh\n");
    const result = probeHooks(cwd, path.join(cwd, "out"));
    expect(result.issues.some((i) => i.ruleId === "HOOKS_PATH_NOT_HUSKY")).toBe(true);
  });
});
