import { promisify } from "util";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const deflate = promisify(zlib.deflate);
const writeFile = promisify(fs.writeFile);

function isExecutable(filePath) {
  try {
    const stats = fs.statSync(filePath);

    const isExec = (stats.mode & fs.constants.S_IXUSR) !== 0 ||
      (stats.mode & fs.constants.S_IXGRP) !== 0 ||
      (stats.mode & fs.constants.S_IXOTH) !== 0;

    return isExec;
  } catch (err) {
    return false;
  }
}

async function writeTreeObject(dirName) {
  let dirData = await readDir(dirName);
  dirData = dirData.filter(name => name !== '.git');
  dirData.sort((a, b) => a.localeCompare(b));

  let content = Buffer.alloc(0);

  for (let entryName of dirData) {
    const stats = fs.statSync(path.join(dirName, entryName));

    if (stats.isDirectory()) {
      const treeSha1 = await writeTreeObject(path.join(dirName, entryName));

      const mode = '40000';
      const entryHeader = Buffer.from(`${mode} ${entryName}\0`);
      const sha1Binary = Buffer.from(treeSha1, 'hex'); // Convert hex to binary

      content = Buffer.concat([content, entryHeader, sha1Binary]);
    } else {
      const fileContent = await readFile(path.join(dirName, entryName));
      const fileContentLength = fileContent.length;
      const header = `blob ${fileContentLength}\0`;
      const hashData = Buffer.concat([Buffer.from(header), fileContent]);

      const shasum = crypto.createHash("sha1");
      shasum.update(hashData);
      const fileNameHash = shasum.digest('hex');

      let fileMode;
      if (stats.isSymbolicLink()) {
        fileMode = "120000";
      } else if (isExecutable(path.join(dirName, entryName))) {
        fileMode = "100755";
      } else {
        fileMode = "100644";
      }

      const entryHeader = Buffer.from(`${fileMode} ${entryName}\0`);
      const sha1Binary = Buffer.from(fileNameHash, 'hex'); // Convert hex to binary

      content = Buffer.concat([content, entryHeader, sha1Binary]);

      const objPath = path.join(process.cwd(), '.git', 'objects');
      const dir = fileNameHash.slice(0, 2);
      const newDirPath = path.join(objPath, dir);

      if (!fs.existsSync(newDirPath)) {
        await mkdir(path.join(objPath, dir), { recursive: true });
      }

      const compressedData = await deflate(hashData);
      await writeFile(path.join(objPath, dir, fileNameHash.slice(2)), compressedData)
    }
  }

  const treeObjHeader = Buffer.from(`tree ${content.length}\0`)
  const fullObj = Buffer.concat([treeObjHeader, content]);

  const hash = crypto.createHash('sha1');
  hash.update(fullObj);
  const digestedHash = hash.digest('hex');

  const objPath = path.join(process.cwd(), '.git', 'objects');
  const dir = digestedHash.slice(0, 2);

  const newDirPath = path.join(objPath, dir);

  if (!fs.existsSync(newDirPath)) {
    await mkdir(newDirPath, { recursive: true });
  }

  const compressedData = await deflate(fullObj);
  await writeFile(path.join(objPath, dir, digestedHash.slice(2)), compressedData);

  return digestedHash;
}

export async function writeTree() {
  const treeHash = await writeTreeObject("./");

  process.stdout.write(treeHash);
}
