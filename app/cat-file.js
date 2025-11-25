import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";

const inflate = promisify(zlib.inflate);

async function decompressBlob(buffer) {
  try {
    const decompressed = await inflate(buffer);
    return decompressed;
  } catch (error) {
    console.error('Decompression failed: ', error);
  }
}

export async function catFile(args) {
  if (args[0] !== "-p") {
    throw new Error("please prove -p flag");
  }

  const objectsPath = "./.git/objects/"
  const hashName = args[1];
  const folderName = hashName.slice(0, 2);
  const fileName = hashName.slice(2);

  const completePath = path.join(objectsPath, folderName, fileName);

  const blobData = fs.readFileSync(completePath);
  const decompressed = await decompressBlob(blobData)
  const nullIndex = decompressed.indexOf(0);
  const content = decompressed.slice(nullIndex + 1);

  process.stdout.write(content)
}
