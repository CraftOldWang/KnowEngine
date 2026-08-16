import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Keep worker scratch files in this project, including on restricted Windows hosts.
const scratch = fileURLToPath(new URL("../.tmp/", import.meta.url));
mkdirSync(scratch, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
    ),
    "run",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, TEMP: scratch, TMP: scratch, TMPDIR: scratch },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
