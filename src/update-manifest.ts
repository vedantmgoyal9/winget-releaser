import { dump, load } from 'js-yaml';
import { join } from 'path';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { error } from '@actions/core';
import {
  downloadFileFromUrl,
  getFileSha256Hash,
  getMsiProductCode,
  getMsixPackageFamilyName,
  getMsixSignatureSha256Hash,
} from './utils';

type UpdateInfo = {
  installerUrls: string[];
  packageVersion: string;
  releaseDate: string;
  releaseNotesUrl: string;
  manifestVersion: string;
  packageDir: string;
};

export default async ({
  installerUrls,
  packageVersion,
  releaseDate,
  releaseNotesUrl,
  manifestVersion,
  packageDir,
}: UpdateInfo) => {
  const schemas = await Promise.all([
    fetch(
      `https://raw.githubusercontent.com/microsoft/winget-cli/master/schemas/JSON/manifests/v${manifestVersion}/manifest.installer.${manifestVersion}.json`,
    ).then((res) => res.json()),
    fetch(
      `https://raw.githubusercontent.com/microsoft/winget-cli/master/schemas/JSON/manifests/v${manifestVersion}/manifest.defaultLocale.${manifestVersion}.json`,
    ).then((res) => res.json()),
    fetch(
      `https://raw.githubusercontent.com/microsoft/winget-cli/master/schemas/JSON/manifests/v${manifestVersion}/manifest.locale.${manifestVersion}.json`,
    ).then((res) => res.json()),
    fetch(
      `https://raw.githubusercontent.com/microsoft/winget-cli/master/schemas/JSON/manifests/v${manifestVersion}/manifest.version.${manifestVersion}.json`,
    ).then((res) => res.json()),
  ]);
  const installerProperties = Object.keys(schemas[0].properties);
  const defaultLocaleProperties = Object.keys(schemas[1].properties);
  const localeProperties = Object.keys(schemas[2].properties);
  const versionProperties = Object.keys(schemas[3].properties);

  for (const file of readdirSync(join(packageDir, packageVersion))) {
    const filePath = join(packageDir, packageVersion, file);
    let manifest: any = load(readFileSync(filePath, 'utf8')),
      sortedManifest: any,
      keysOrder: string[] = [];
    switch (manifest.ManifestType) {
      case 'installer':
        keysOrder = installerProperties;
        manifest.PackageVersion = packageVersion;
        manifest.ReleaseDate = releaseDate;
        manifest.Installers = await updateInstallers(
          manifest.Installers,
          installerUrls,
          manifest,
        );
        break;
      case 'defaultLocale':
        keysOrder = defaultLocaleProperties;
        manifest.PackageVersion = packageVersion;
        manifest.ReleaseNotesUrl = releaseNotesUrl;
        delete manifest.ReleaseNotes;
        break;
      case 'locale':
        keysOrder = localeProperties;
        manifest.PackageVersion = packageVersion;
        manifest.ReleaseNotesUrl = releaseNotesUrl;
        delete manifest.ReleaseNotes;
        break;
      case 'version':
        keysOrder = versionProperties;
        manifest.PackageVersion = packageVersion;
        break;
      default:
        error(`Invalid manifest type: ${manifest.ManifestType}`);
    }
    keysOrder.forEach((key) => (sortedManifest[key] = manifest[key] || '🤷'));
    writeFileSync(
      filePath,
      `# Created using WinGet Releaser 🛫 version ${process.env.GITHUB_ACTION_REF}\r\n` +
        `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${manifest.ManifestType}.${manifest.ManifestVersion}.schema.json\r\n\r\n` +
        dump(sortedManifest, {
          noArrayIndent: true,
          sortKeys: false,
        }).replaceAll(/(\w\d)+(?=:\s🤷)/g, '# $&'),
      { encoding: 'utf8', flag: 'w' },
    );
  }
};

async function updateInstallers(
  installers: any,
  installerUrls: string[],
  manifest: any,
): Promise<any> {
  // check that unique installer urls in installers match installerUrls.length
  if (
    new Set(installers.map((i: any) => i.InstallerUrl)).size !==
    installerUrls.length
  ) {
    error('Installer urls in manifest do not match installer urls in release');
    process.exit(1);
  }

  // sort installers by installer url
  installers.sort((a: any, b: any) =>
    (a.InstallerUrl as string).localeCompare(b.InstallerUrl as string),
  );

  // sort installer urls
  installerUrls.sort((a: string, b: string) => a.localeCompare(b));

  // update installers
  let previousOldInstallerUrl: string;
  for (let i = 0, urlsItr = 0; i < installers.length; i++) {
    const installer = installers[i];
    // @ts-ignore 2454: variable 'previousOldInstallerUrl' is used before being assigned.
    if (installer.InstallerUrl === previousOldInstallerUrl) {
      installer.InstallerUrl = installers[i - 1].InstallerUrl;
      installer.InstallerSha256 = installers[i - 1].InstallerSha256;
      if (installers[i - 1].ProductCode)
        installer.ProductCode = installers[i - 1].ProductCode;
      if (installers[i - 1].SignatureSha256)
        installer.SignatureSha256 = installers[i - 1].SignatureSha256;
      if (installers[i - 1].PackageFamilyName)
        installer.PackageFamilyName = installers[i - 1].PackageFamilyName;
    } else {
      previousOldInstallerUrl = installer.InstallerUrl;
      installer.InstallerUrl = installerUrls[urlsItr++];
      const downloadedFile = downloadFileFromUrl(installer.InstallerUrl);
      installer.InstallerSha256 = getFileSha256Hash(downloadedFile);
      if (installer.ProductCode)
        installer.ProductCode = await getMsiProductCode(downloadedFile);
      else if (
        ['appx', 'msi', 'msix', 'wix', 'burn'].includes(installer.InstallerType)
      )
        delete installer.ProductCode;
      if (['msix', 'appx'].includes(installer.InstallerType)) {
        installer.SignatureSha256 = await getMsixSignatureSha256Hash(
          downloadedFile,
        );
        if (!manifest.PackageFamilyName && !installer.PackageFamilyName)
          installer.PackageFamilyName = getMsixPackageFamilyName(
            installer.InstallerUrl,
          );
      } else delete installer.SignatureSha256;
    }
    installers[i] = installer;
  }
}
