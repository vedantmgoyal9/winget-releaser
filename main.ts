import { endGroup, error, getInput, startGroup, info } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { exec, execSync } from 'node:child_process';
import { join } from 'node:path';
import fetch from 'node-fetch';
import { SimpleGit, simpleGit, SimpleGitProgressEvent } from 'simple-git';
import { existsSync, rmSync } from 'node:fs';

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

  const git: SimpleGit = simpleGit({
    progress: ({
      method,
      stage,
      progress,
      processed,
      total,
    }: SimpleGitProgressEvent) => {
      info(
        `git.${method} ${progress}% complete... (${processed}/${total}) (${stage})`,
      );
    },
  });
  const github = getOctokit(token);

  // check if at least one version of the package is already present in winget-pkgs repository
  fetch(
    `https://github.com/microsoft/winget-pkgs/tree/master/manifests/${pkgid
      .charAt(0)
      .toLowerCase()}/${pkgid.replace('.', '/')}`,
    { method: 'HEAD' },
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

  // fetch latest build of wingetdev from the action repository (vedantmgoyal2009/winget-releaser)
  execSync(
    `svn checkout https://github.com/vedantmgoyal2009/winget-releaser/trunk/wingetdev`,
    {
      shell: 'pwsh',
      stdio: 'inherit',
    },
  );

  // fetch komac.jar from the latest release
  execSync(
    `Invoke-WebRequest -Uri https://github.com/russellbanks/Komac/releases/download/nightly/Komac-0.9.0-all.jar -OutFile komac.jar`,
    {
      shell: 'pwsh',
    },
  );

  // get release information using the release tag
  const releaseInfo = {
    ...(
      await github.rest.repos.getReleaseByTag({
        owner: context.repo.owner,
        repo: releaseRepository,
        tag: releaseTag,
      })
    ).data, // get only data, and exclude status, url, and headers
  };

  startGroup('Updating manifests and creating pull request...');
  const pkgVersion =
    version || new RegExp(/(?<=v).*/g).exec(releaseInfo.tag_name)![0];
  const installerUrls = releaseInfo.assets
    .filter((asset) => {
      return new RegExp(instRegex, 'g').test(asset.name);
    })
    .map((asset) => {
      return asset.browser_download_url;
    });

  // execute komac to update the manifest and submit the pull request
  execSync(
    `java -jar komac.jar update --id ${pkgid} --version ${pkgVersion} --urls \'${installerUrls.join(
      ',',
    )}\' --submit`,
    {
      shell: 'pwsh',
      stdio: 'inherit',
    },
  );
  endGroup();

  // get the list of existing versions of the package using wingetdev
  let existingVersions = await getPackageVersions(pkgid);

  // if maxVersionsToKeep is not 0, and no. of existing versions is greater than maxVersionsToKeep,
  // delete the older versions (starting from the oldest version)
  startGroup('Deleting old versions...');

  info(`Number of existing versions: ${existingVersions.length}`);
  info(`Number of versions to keep: ${maxVersionsToKeep}`);

  if (
    maxVersionsToKeep !== 0 &&
    existingVersions.length + 1 > maxVersionsToKeep
  ) {
    // check if winget-pkgs already exists, and delete it if it does
    if (existsSync('winget-pkgs')) {
      rmSync('winget-pkgs', { recursive: true, force: true });
    }

    // clone the winget-pkgs repository, and configure remotes
    await git
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

    // build the path to the package directory (e.g. winget-pkgs/manifests/m/Microsoft/OneDrive)
    const pkgDir = join(
      'winget-pkgs',
      'manifests',
      `${pkgid[0].toLowerCase()}`,
      `${pkgid.replace('.', '/')}`,
    );

    // remove the newer versions from the list of existing versions
    // the left over versions will be deleted
    for (let iterator = 0; iterator < maxVersionsToKeep; iterator++)
      existingVersions.shift();

    // iterate over the left over versions and delete them
    existingVersions.forEach(
      async (version) =>
        await git
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
  } else {
    info('Result: No versions will be deleted.');
  }
  endGroup();

  // check for action updates, and create a pull request if there are any
  startGroup('Checking for action updates...');
  // check if action version is a version (starts with `v`) and not a pinned commit ref
  if (!/^v\d+$/g.test(process.env.GITHUB_ACTION_REF!)) {
    info(
      `The workflow maintainer has pinned the action to a commit ref. Skipping update check...`,
    );
    process.exit(0);
  }

  const latestVersion = (
    await github.rest.repos.getLatestRelease({
      owner: 'vedantmgoyal2009',
      repo: 'winget-releaser',
    })
  ).data.tag_name;

  info(`Current action version: ${process.env.GITHUB_ACTION_REF}`);
  info(`Latest version found: ${latestVersion}`);

  // if the latest version is not greater than the current version, exit
  if (!(latestVersion > process.env.GITHUB_ACTION_REF!)) {
    info(`No updates found. Bye bye!`);
    process.exit(0);
  }

  await git
    .clone(
      `https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`,
    )
    .cwd(process.env.GITHUB_REPOSITORY!.split('/')[1])
    .addConfig('user.name', 'github-actions[bot]', false, 'local')
    .addConfig(
      'user.email',
      '41898282+github-actions[bot]@users.noreply.github.com',
      false,
      'local',
    )
    .exec(() => {
      execSync(
        `find -name '*.yml' -or -name '*.yaml' -exec sed -i 's/vedantmgoyal2009\\/winget-releaser@${process.env.GITHUB_ACTION_REF}/vedantmgoyal2009\\/winget-releaser@${latestVersion}/g' {} +`,
        {
          stdio: 'inherit',
          cwd: '.github/workflows',
          shell: 'bash',
        },
      );
    })
    .commit(
      `ci(winget-releaser): update action from ${process.env.GITHUB_ACTION_REF} to ${latestVersion}`,
    )
    .branch(['-c', `winget-releaser/update-to-${latestVersion}`])
    .push([
      '--force-with-lease',
      '--set-upstream',
      'origin',
      `winget-releaser/update-to-${latestVersion}`,
    ])
    .exec(
      async () =>
        await github.rest.pulls.create({
          ...context.repo,
          title: `ci(winget-releaser): update action from ${process.env.GITHUB_ACTION_REF} to ${latestVersion}`,
          head: `winget-releaser/update-to-${latestVersion}`,
          base: (
            await github.rest.repos.get({
              ...context.repo,
            })
          ).data.default_branch,
          body:
            `This PR was automatically created by the [WinGet Releaser GitHub Action](https://github.com/vedantmgoyal2009/winget-releaser) to update the action version from \`${process.env.GITHUB_ACTION_REF}\` to \`${latestVersion}\`.\r\n` +
            'The auto-update function help maintainers keep their workflows up-to-date with the latest version of the action.\r\n' +
            "You can close this pull request if you don't want to update the action version.\r\n" +
            'Mentioning @vedantmgoyal2009 for a second pair of eyes, in case any breaking changes have been introduced in the new version of the action.',
        }),
    );
  endGroup();
})();

async function getPackageVersions(
  packageIdentifier: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec(
      `wingetdev show --exact --id ${packageIdentifier} --versions --accept-source-agreements --disable-interactivity`,
      {
        cwd: 'wingetdev',
        shell: 'cmd.exe',
      },
      (error, stdout) => {
        if (error) reject(error);
        const stdoutLines = stdout.split('\r\n');
        resolve(stdoutLines.slice(stdoutLines.indexOf('Version') + 2, -1));
      },
    );
  });
}
