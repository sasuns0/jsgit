function buildPktLine(data) {
  const length = data.length + 4;
  return length.toString(16).padStart(4, '0') + data;
}

async function getRefs(gitUrl) {
  const url = new URL(gitUrl);
  const lsRefsResponse = await fetch(
    `https://${url.hostname}${url.pathname}/git-upload-pack`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-git-upload-pack-request',
        'Git-Protocol': 'version=2'
      },
      body: buildPktLine('command=ls-refs') +
        buildPktLine('agent=git/2.0.0') +
        '0001' +  // delimiter
        buildPktLine('peel') +
        buildPktLine('symrefs') +
        buildPktLine('ref-prefix HEAD') +
        buildPktLine('ref-prefix refs/heads/') +
        buildPktLine('ref-prefix refs/tags/') +
        '0000'  // flush
    }
  );
  const lsResponseText = await lsRefsResponse.text();
  const refs = lsResponseText.split("\n").filter(line => line.trim() !== ''); // Filter empty lines
  return refs;
}

function extractHash(refLine) {
  const content = refLine.slice(4);
  const hash = content.split(' ')[0].split('\x00')[0];
  return hash;
}

async function recievePack(gitUrl, refs) {
  const url = new URL(gitUrl);
  const pathname = url.pathname;

  const validRefs = refs.filter(line =>
    line !== '0000' && !line.includes('# service=')
  );
  const hashes = validRefs.map(extractHash);

  let body = "";
  body += buildPktLine("command=fetch");
  body += buildPktLine("agent=git/2.39.5.(Apple.Git-154)");
  body += "0001";
  body += buildPktLine("thin-pack")
  body += buildPktLine('ofs-delta');
  body += buildPktLine('no-progress');

  hashes.forEach(hash => {
    body += buildPktLine(`want ${hash}`);
  });

  body += buildPktLine('done');
  body += '0000';

  const response = await fetch(`https://${url.hostname}${pathname}/git-upload-pack`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/x-git-upload-pack-request',
      'Git-Protocol': 'version=2',
    },
    body: body,
  });

  const packfile = await response.arrayBuffer();
  return packfile;
}

function parseHeader(header) {
  const magic = header.slice(0, 4);
  const version = header.slice(4, 9);
  const objNum = header.slice(9);

  if (magic !== "PACK") {
    throw new Error("Wrong pack file");
  }

  return { version, objNum }
}

function parseObjectHeader(arrayBuffer, offset) {
  const bytes = new Uint8Array(arrayBuffer);
  let byte = bytes[offset++];
}

async function parsePackFile(packfile) {
  const { version, objNum } = parseHeader(packfile.slice(0, 12));
}

export async function clone(args) {
  const URL = args[0];
  const refs = await getRefs(URL);

  const packfile = await recievePack(URL, refs);
}
