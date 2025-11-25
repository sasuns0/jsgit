import fs from "fs";
import path from "path";
import { promisify } from "util";
import crypto from "crypto";
import zlib from "zlib";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const deflate = promisify(zlib.deflate);

export async function hashObject(args) {
  let fileName;

  if (args[0] === "-w") {
    fileName = args[1];
  } else {
    fileName = args[0];
  }

  const fileContent = await readFile(fileName, { encoding: "utf8" });
  const fileContentLength = Buffer.byteLength(fileContent, "utf8");
  const header = `blob ${fileContentLength}\0`;
  const hashData = header + fileContent;

  const shasum = crypto.createHash("sha1");
  shasum.update(hashData);
  const fileNameHash = shasum.digest('hex');

  process.stdout.write(fileNameHash);

  if (args[0] === "-w") {
    const objPath = "./.git/objects";
    const dir = fileNameHash.slice(0, 2);

    await mkdir(path.join(objPath, dir));

    const compressedData = await deflate(hashData);
    await writeFile(path.join(objPath, dir, fileNameHash.slice(2)), compressedData)
  }
}
