import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const EXPECTED_BEFORE = {
  packageJson: "7a32f731ccbd0117d5b5598998c5237ce0230d8e708f49f1388ae5de79e3ec6b",
  packageLock: "db0ece39a9a66b3fb10a4bd6644b2a4616d82ad42476ba9f513964ec6793e6ed",
};

const EXPECTED_AFTER = {
  packageJson: "5f46bafe79c08db4f6d59074602eb8ae59522b1b2c5fda68488f38dfbd049b61",
  packageLock: "5ad527e78c65a005054d6078a90eb6a2bf19c0712ba0b846937ba0f6daee8d8b",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const frontendRoot = path.resolve(process.argv[2] ?? process.cwd());
const packageJsonPath = path.join(frontendRoot, "package.json");
const packageLockPath = path.join(frontendRoot, "package-lock.json");
const packageJsonTemp = `${packageJsonPath}.APP-SEC-DEPS-001.tmp`;
const packageLockTemp = `${packageLockPath}.APP-SEC-DEPS-001.tmp`;

const packageJsonBefore = await readFile(packageJsonPath);
const packageLockBefore = await readFile(packageLockPath);
const before = {
  packageJson: sha256(packageJsonBefore),
  packageLock: sha256(packageLockBefore),
};

if (
  before.packageJson === EXPECTED_AFTER.packageJson &&
  before.packageLock === EXPECTED_AFTER.packageLock
) {
  console.log("APP-SEC-DEPS-001 ya está materializado con los hashes esperados.");
  process.exit(0);
}

assert(
  before.packageJson === EXPECTED_BEFORE.packageJson,
  `package.json fuera de baseline: ${before.packageJson}`,
);
assert(
  before.packageLock === EXPECTED_BEFORE.packageLock,
  `package-lock.json fuera de baseline: ${before.packageLock}`,
);

const packageJson = JSON.parse(packageJsonBefore.toString("utf8"));
const packageLock = JSON.parse(packageLockBefore.toString("utf8"));

assert(packageJson.dependencies?.next === "^16.1.1", "Versión declarada de Next inesperada.");
assert(packageJson.dependencies?.uuid === "^11.1.0", "Versión declarada de uuid inesperada.");
assert(packageLock.packages?.["node_modules/next"]?.version === "16.2.10", "Next resuelto inesperado.");
assert(packageLock.packages?.["node_modules/postcss"]?.version === "8.5.16", "PostCSS seguro raíz ausente.");
assert(packageLock.packages?.["node_modules/uuid"]?.version === "11.1.1", "uuid seguro raíz ausente.");
assert(packageLock.packages?.["node_modules/prismjs"]?.version === "1.30.0", "PrismJS seguro raíz ausente.");

packageJson.overrides = {
  postcss: "8.5.16",
  "js-yaml": "4.2.0",
  uuid: "$uuid",
  prismjs: "1.30.0",
};

delete packageLock.packages["node_modules/next/node_modules/postcss"];
delete packageLock.packages["node_modules/next-auth/node_modules/uuid"];
delete packageLock.packages["node_modules/refractor/node_modules/prismjs"];

packageLock.packages["node_modules/js-yaml"] = {
  version: "4.2.0",
  resolved: "https://registry.npmjs.org/js-yaml/-/js-yaml-4.2.0.tgz",
  integrity: "sha512-ePWsvanv0DWuDRsW8dnt+R4jQ31SCRCQ7hhNcPXZPsoBZiemuZNYGf7adZdqX2D86j6rvKp3RpCxVTSb8WQlOw==",
  license: "MIT",
  funding: [
    { type: "github", url: "https://github.com/sponsors/puzrin" },
    { type: "github", url: "https://github.com/sponsors/nodeca" },
  ],
  dependencies: { argparse: "^2.0.1" },
  bin: { "js-yaml": "bin/js-yaml.js" },
};

const packageJsonAfter = Buffer.from(`${JSON.stringify(packageJson, null, 2)}\n`);
const packageLockAfter = Buffer.from(`${JSON.stringify(packageLock, null, 2)}\n`);
const after = {
  packageJson: sha256(packageJsonAfter),
  packageLock: sha256(packageLockAfter),
};

assert(
  after.packageJson === EXPECTED_AFTER.packageJson,
  `Hash candidato package.json inesperado: ${after.packageJson}`,
);
assert(
  after.packageLock === EXPECTED_AFTER.packageLock,
  `Hash candidato package-lock.json inesperado: ${after.packageLock}`,
);

await writeFile(packageJsonTemp, packageJsonAfter, { flag: "wx" });
await writeFile(packageLockTemp, packageLockAfter, { flag: "wx" });
await rename(packageJsonTemp, packageJsonPath);
await rename(packageLockTemp, packageLockPath);

console.log(JSON.stringify({
  vertical: "APP-SEC-DEPS-001",
  before,
  after,
  overrides: packageJson.overrides,
  removedNestedCopies: [
    "next/node_modules/postcss@8.4.31",
    "next-auth/node_modules/uuid@8.3.2",
    "refractor/node_modules/prismjs@1.27.0",
  ],
  upgraded: ["js-yaml@4.1.1 -> 4.2.0"],
}, null, 2));
