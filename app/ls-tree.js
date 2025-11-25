import fs from "fs";
import { promisify } from "util";
import path from "path";
import zlib from "zlib";

const readFile = promisify(fs.readFile);
const inflate = promisify(zlib.inflate);

async function decompressBlob(buffer) {
  try {
    const decompressed = await inflate(buffer);
    return decompressed;
  } catch (error) {
    console.error('Decompression failed: ', error);
  }
}

export async function lsTree(args) {
  const nameOnlyCmd = "--name-only";
  const treeSha = args[1];

  if (args[0] !== nameOnlyCmd || !treeSha) {
    throw new Error("Please provide right arguments: --name-only sha1")
  }

  const dirName = treeSha.slice(0, 2);
  const fileName = treeSha.slice(2);

  const objPath = "./.git/objects"
  const filePath = path.join(objPath, dirName, fileName);

  const blobData = await readFile(filePath);
  const decompressed = await decompressBlob(blobData);

  const nullIndex = decompressed.indexOf(0);
  const content = decompressed.subarray(nullIndex + 1);

  const entries = [];
  let i = 0;

  while (i < content.length) {
    // Mode (ASCII until space)
    let spaceIdx = content.indexOf(0x20, i);
    const mode = content.subarray(i, spaceIdx).toString();

    // Filename (null-terminated string)
    let nullIdx = content.indexOf(0x00, spaceIdx + 1);
    const fileName = content.subarray(spaceIdx + 1, nullIdx).toString();

    // SHA1 (20-byte binary)
    const sha = content.subarray(nullIdx + 1, nullIdx + 21);

    entries.push({
      mode,
      fileName,
      sha1: sha.toString("hex")
    });

    i = nullIdx + 21;
  }

  for (let entry of entries) {
    console.log(entry.fileName)
  }
}
