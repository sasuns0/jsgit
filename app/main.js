import fs from "fs"
import path from "path"
import { catFile } from "./cat-file.js";
import { hashObject } from "./hash-object.js";
import { lsTree } from "./ls-tree.js";
import { writeTree } from "./write-tree.js";
import { commitTree } from "./commit-tree.js";
import { clone } from "./clone.js";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage
const command = process.argv[2];

const args = process.argv.slice(3);

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    catFile(args);
    break;
  case "hash-object":
    hashObject(args)
    break;
  case "ls-tree":
    // lsTree(args);
    break;
  case "write-tree":
    // writeTree();
    break;
  case "commit-tree":
    // commitTree(args);
    break;
  case "clone":
    // clone(args);
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}
