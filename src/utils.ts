import { exec, execSync } from 'child_process';
import { createHash } from 'crypto';
import { request } from 'https';
import { createReadStream, createWriteStream, readFileSync } from 'fs';

export function downloadFileFromUrl(
  url: string,
  fileName: string | undefined = undefined,
): string {
  const file = createWriteStream(fileName || (url.split('/').pop() as string));
  request(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302)
      return downloadFileFromUrl(
        res.headers.location as string,
        file.path as string,
      );
    res.pipe(file).on('finish', () => file.close());
  });
  return file.path as string;
}

export async function getFileSha256Hash(fileName: string): Promise<string> {
  const hash = createHash('sha256');
  return new Promise((resolve, reject) => {
    createReadStream(fileName)
      .on('data', (chunk) => hash.update(chunk))
      .on('close', () => resolve(hash.digest('hex')))
      .on('error', (err) => reject(err));
  });
}

export async function getMsiProductCode(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `Get-MsiProductCode -msiPath ${fileName}`,
      { cwd: process.cwd(), shell: 'pwsh' },
      (error, stdout) => {
        if (error) reject(error);
        resolve(stdout);
      },
    );
  });
}

export async function getMsixSignatureSha256Hash(
  fileName: string,
): Promise<string> {
  execSync(
    `& \'C:\\Program Files\\7-Zip\\7z.exe\' e ${fileName} AppxSignature.p7x -y`,
    {
      shell: 'pwsh',
    },
  );
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream('AppxSignature.p7x')
      .on('error', (err) => reject(err))
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

export function getMsixPackageFamilyName(fileName: string): string {
  const encodingTable = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  execSync(
    `& \'C:\\Program Files\\7-Zip\\7z.exe\' e ${fileName} AppxManifest.xml -y`,
    {
      shell: 'pwsh',
    },
  );
  let appxManifest = readFileSync('AppxManifest.xml', 'utf8'),
    hashPart = '';
  const identityName = appxManifest.match(/(?<=<Identity Name=")[^"]+/g)![0];
  const identityPublisher = appxManifest.match(
    /(?<=<Identity.*Publisher=")[^"]+/g,
  )![0];
  const publisherAsUnicodeBytes = Buffer.from(identityPublisher, 'utf16le');
  const publisherSha256 = createHash('sha256')
    .update(publisherAsUnicodeBytes)
    .digest('hex');
  const publisherSha256First8Bytes = Buffer.from(publisherSha256, 'hex')
    .subarray(0, 8)
    .toString('binary');
  const publisherSha256First8BytesAsBinary = publisherSha256First8Bytes
    .split('')
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
  const binaryStringWithPadding = publisherSha256First8BytesAsBinary.padEnd(
    65,
    '0',
  );
  for (let i = 0; i < binaryStringWithPadding.length; i += 5)
    hashPart +=
      encodingTable[parseInt(binaryStringWithPadding.substring(i, i + 5), 2)];
  return `${identityName}_${hashPart}`;
}

export async function getPackageVersions(
  packageIdentifier: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec(
      `wingetdev show --exact --id ${packageIdentifier} --versions --disable-interactivity`,
      {
        cwd: 'wingetdev',
        shell: 'cmd.exe',
      },
      (error, stdout) => {
        if (error) reject(error);
        resolve(stdout.split('\r\n').slice(3, -1));
      },
    );
  });
}
