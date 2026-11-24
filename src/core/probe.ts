import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ENGINE_VERSION } from "../version.js";

export type Issue = {
  ruleId: string;
  message: string;
  severity: "error" | "warn";
};

export type ProbeResult = {
  schemaVersion: "1.0";
  engineVersion: string;
  cwd: string;
  hooksPath: string | null;
  issues: Issue[];
  artifacts: { json: string; markdown: string };
};

function gitConfig(cwd: string, key: string): string | null {
  try {
    return execFileSync("git", ["config", "--get", key], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function probeHooks(cwd: string, outDir: string): ProbeResult {
  const issues: Issue[] = [];
  const gitDir = path.join(cwd, ".git");
  if (!fs.existsSync(gitDir)) {
    issues.push({
      ruleId: "NOT_A_GIT_REPO",
      message: "no .git directory",
      severity: "error",
    });
  }

  const hooksPath = gitConfig(cwd, "core.hooksPath");
  const huskyDir = path.join(cwd, ".husky");
  const classicHooks = path.join(cwd, ".git", "hooks");

  if (fs.existsSync(huskyDir)) {
    const pre = path.join(huskyDir, "pre-commit");
    if (!fs.existsSync(pre)) {
      issues.push({
        ruleId: "HUSKY_MISSING_PRECOMMIT",
        message: ".husky exists but pre-commit hook file is missing",
        severity: "error",
      });
    }
    if (!hooksPath || !hooksPath.replace(/\\/g, "/").includes(".husky")) {
      issues.push({
        ruleId: "HOOKS_PATH_NOT_HUSKY",
        message: "core.hooksPath is not pointing at .husky (hooks may be skipped)",
        severity: "error",
      });
    }
  } else if (hooksPath) {
    const abs = path.isAbsolute(hooksPath) ? hooksPath : path.join(cwd, hooksPath);
    if (!fs.existsSync(abs)) {
      issues.push({
        ruleId: "HOOKS_PATH_MISSING",
        message: `core.hooksPath=${hooksPath} does not exist`,
        severity: "error",
      });
    }
  } else if (fs.existsSync(classicHooks)) {
    const sample = path.join(classicHooks, "pre-commit.sample");
    const active = path.join(classicHooks, "pre-commit");
    if (!fs.existsSync(active) && fs.existsSync(sample)) {
      issues.push({
        ruleId: "NO_ACTIVE_PRECOMMIT",
        message: "only sample hooks present; no active pre-commit hook",
        severity: "warn",
      });
    }
  } else if (fs.existsSync(gitDir)) {
    issues.push({
      ruleId: "NO_HOOKS_CONFIGURED",
      message: "no husky/.hooksPath/classic hooks detected",
      severity: "warn",
    });
  }

  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const prep = pkg.scripts?.prepare || pkg.scripts?.postinstall || "";
    if (String(prep).includes("husky") && !fs.existsSync(huskyDir)) {
      issues.push({
        ruleId: "HUSKY_SCRIPT_WITHOUT_DIR",
        message: "package.json prepare mentions husky but .husky is missing",
        severity: "error",
      });
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const result: ProbeResult = {
    schemaVersion: "1.0",
    engineVersion: ENGINE_VERSION,
    cwd,
    hooksPath,
    issues,
    artifacts: { json: "report.json", markdown: "summary.md" },
  };
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(
    path.join(outDir, "summary.md"),
    [
      "# HookProbe report",
      "",
      `hooksPath: \`${hooksPath ?? "(default)"}\``,
      `Issues: ${issues.length}`,
      "",
      ...issues.map((i) => `- **${i.severity}** \`${i.ruleId}\` — ${i.message}`),
      "",
      "## Agent checklist",
      "- Ensure husky install / core.hooksPath is set after clone",
      "- Do not commit with --no-verify unless intentional",
    ].join("\n"),
  );
  return result;
}
