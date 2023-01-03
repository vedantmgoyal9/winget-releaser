import { endGroup, error, getInput, startGroup } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { SimpleGit, simpleGit } from 'simple-git';
import updateManifests from './update-manifest';
import checkActionUpdateAndCreatePR from './action-updater';
import { getPackageVersions } from './utils';
import { copyFileSync, existsSync, rmSync } from 'node:fs';

(async () => {
  // check if the runner operating system is windows
  if (process.platform !== 'win32') {
    error('This action only works on Windows.');
    process.exit(1);
  }

  // get the inputs from the action
  const pkgid = getInput('identifier');
  const version = getInput('version');
  const instRegex = getInput('installers-regex');
  const releaseRepository = getInput('release-repository');
  const releaseTag = getInput('release-tag');
  const maxVersionsToKeep = Number(getInput('max-versions-to-keep'));
  const token = getInput('token');
  const forkUser = getInput('fork-user');

  const git: SimpleGit = simpleGit();
  const github = getOctokit(token);

  // check if at least one version of the package is already present in winget-pkgs repository
  fetch(
    `https://github.com/microsoft/winget-pkgs/tree/master/manifests/${pkgid[0].toLowerCase()}/${pkgid}`,
  ).then((res) => {
    if (!res.ok) {
      error(
        `Package ${pkgid} does not exist in the winget-pkgs repository. Please add atleast one version of the package before using this action.`,
      );
      process.exit(1);
    }
  });

  // check if max-versions-to-keep is a valid number and is 0 (keep all versions) or greater than 0
  if (!Number.isInteger(maxVersionsToKeep) || maxVersionsToKeep < 0) {
    error(
      'Invalid input supplied: max-versions-to-keep should be 0 (zero - keep all versions) or a positive integer.',
    );
    process.exit(1);
  }

  // remove winget-pkgs directory if it exists (before cloning again), in case the action
  // is ran multiple times for publishing multiple packages in the same workflow
  // clone winget-pkgs repo, configure remotes, and fetch wingetdev from the repository
  startGroup(
    'Cloning winget-pkgs repository, configuring remotes, and fetching wingetdev...',
  );
  if (existsSync('winget-pkgs')) {
    rmSync('winget-pkgs', { recursive: true, force: true });
  }
  git
    .clone(
      `https://x-access-token:${token}@github.com/microsoft/winget-pkgs.git`,
    )
    .cwd('winget-pkgs')
    .addConfig('user.name', 'github-actions', false, 'local')
    .addConfig(
      'user.email',
      '41898282+github-actions[bot]@users.noreply.github.com',
      false,
      'local',
    )
    .remote(['rename', 'origin', 'upstream'])
    .addRemote('origin', `https://github.com/${forkUser}/winget-pkgs.git`);
  execSync(
    `svn checkout https://github.com/vedantmgoyal2009/winget-releaser/trunk/wingetdev`,
    { stdio: 'inherit' },
  );
  endGroup();

  const releaseInfo = {
    ...(
      await github.rest.repos.getReleaseByTag({
        owner: context.repo.owner,
        repo: releaseRepository,
        tag: releaseTag,
      })
    ).data, // get only data, and exclude status, url, and headers
  };
  const pkgDir = join(
    process.cwd(),
    'winget-pkgs',
    'manifests',
    `${pkgid[0].toLowerCase()}`,
    `${pkgid.replace('.', '/')}`,
  );
  let existingVersions = await getPackageVersions(pkgid);
  copyFileSync(join(pkgDir, existingVersions[0]), join(pkgDir, version));

  startGroup('Updating manifests and creating pull request...');
  await updateManifests({
    installerUrls: releaseInfo.assets
      .filter((asset) => {
        return new RegExp(instRegex, 'g').test(asset.name);
      })
      .map((asset) => {
        return asset.browser_download_url;
      }),
    packageVersion: version,
    releaseDate: new Date(releaseInfo.published_at!).toISOString().slice(0, 10),
    releaseNotesUrl: releaseInfo.html_url,
    manifestVersion: '1.2.0',
    packageDir: pkgDir,
  });
  git
    .cwd('winget-pkgs')
    .fetch('upstream', 'master')
    .checkoutLocalBranch(`HEAD:${pkgid}-v${version}`)
    .add('.')
    .commit(`New version: ${pkgid} version ${version}`)
    .push('origin', `HEAD:${pkgid}-v${version}`)
    .exec(
      async () =>
        await github.rest.pulls.create({
          owner: 'microsoft',
          repo: 'winget-pkgs',
          title: `New version: ${pkgid} version ${version}`,
          head: `${forkUser}:${pkgid}-v${version}`,
          base: 'master',
          body: '### Pull request has been automatically created using 🛫 [WinGet Releaser](https://github.com/vedantmgoyal2009/winget-releaser).',
        }),
    );
  endGroup();

  if (
    maxVersionsToKeep !== 0 &&
    existingVersions.length + 1 > maxVersionsToKeep
  ) {
    startGroup('Deleting old versions...');
    for (let iterator = 0; iterator < maxVersionsToKeep; iterator++)
      existingVersions.shift();
    existingVersions.forEach((version) =>
      git
        .cwd('winget-pkgs')
        .fetch('upstream', 'master')
        .checkoutLocalBranch(`HEAD:${pkgid}-v${version}-REMOVE`)
        .exec(() => {
          if (existsSync(join(pkgDir, version)))
            rmSync(join(pkgDir, version), { recursive: true, force: true });
        })
        .add('.')
        .commit(`Remove: ${pkgid} version ${version}`)
        .push('origin', `HEAD:${pkgid}-v${version}-REMOVE`)
        .exec(
          async () =>
            await github.rest.pulls.create({
              owner: 'microsoft',
              repo: 'winget-pkgs',
              title: `Remove: ${pkgid} version ${version}`,
              head: `${forkUser}:${pkgid}-v${version}-REMOVE`,
              base: 'master',
              body:
                '#### Reason for removal: This version is older than what has been set in `max-versions-to-keep` by the publisher.\n\n' +
                '###### Pull request has been automatically created using 🛫 [WinGet Releaser](https://github.com/vedantmgoyal2009/winget-releaser).',
            }),
        ),
    );
    endGroup();
  }

  // check for action updates, and create a pull request if there are any
  startGroup('Checking for action updates...');
  await checkActionUpdateAndCreatePR(token);
  endGroup();
})();
