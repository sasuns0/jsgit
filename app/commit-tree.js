import { promisify } from "util";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";

const mkdir = promisify(fs.mkdir);
const deflate = promisify(zlib.deflate);
const writeFile = promisify(fs.writeFile);

export async function commitTree(args) {
  const treeHash = args[0];

  let content = Buffer.alloc(0);

  const treeData = Buffer.from(`tree ${treeHash}\n`);
  const parent = Buffer.from(`parent ${args[2]}\n`);
  const author = Buffer.from(`author John Doeee <john@example.com> ${Date.now()} +0000\n`);
  const committer = Buffer.from(`committer John Doe <john@example.com> ${Date.now()} +0000\n`);
  const commitMsg = `${args[args.length - 1]}\n`;

  const header = Buffer.from(`commit ${content.length}\0`);

  content = Buffer.concat([header, treeData, parent, author, committer, Buffer.from("\n"), Buffer.from(commitMsg)]);

  const shasum = crypto.createHash("sha1");
  shasum.update(content);
  const commitHash = shasum.digest('hex');

  const objPath = path.join(process.cwd(), '.git', 'objects');
  const dir = commitHash.slice(0, 2);
  const newDirPath = path.join(objPath, dir);

  if (!fs.existsSync(newDirPath)) {
    await mkdir(path.join(objPath, dir), { recursive: true });
  }

  const compressedData = await deflate(content);
  await writeFile(path.join(objPath, dir, commitHash.slice(2)), compressedData)

  process.stdout.write(commitHash);
}
