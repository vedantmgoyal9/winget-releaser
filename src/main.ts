import { getInput, info, getBooleanInput, error } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { simpleGit } from 'simple-git';
import { request } from "https";
import * as fs from "fs";

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
  const delPrevVersion = getBooleanInput('delete-previous-version');
  const token = getInput('token');
  const forkUser = getInput('fork-user');

  // get only data, and exclude status, url, and headers
  const releaseInfo = {
    ...(
      await getOctokit(token).rest.repos.getReleaseByTag({
        owner: context.repo.owner,
        // https://github.blog/changelog/2022-09-27-github-actions-additional-information-available-in-github-event-payload-for-scheduled-workflow-runs
        repo: releaseRepository, // || context.repo.repo,
        tag: releaseTag,
      })
    ).data,
  };

  const remote = "https://x-access-token:${token}@github.com/microsoft/winget-pkgs.git"
  const modifiedYamlCreate = "https://github.com/vedantmgoyal2009/winget-releaser/raw/${process.env.GITHUB_ACTION_REF}/src/YamlCreate.ps1"

  const inputObject = JSON.stringify({
    PackageIdentifier: pkgid,
    PackageVersion:
        version || new RegExp(/(?<=v).*/g).exec(releaseInfo.tag_name)![0],
    InstallerUrls: releaseInfo.assets
        .filter((asset) => {
          return new RegExp(instRegex, 'g').test(asset.name);
        })
        .map((asset) => {
          return asset.browser_download_url;
        }),
    ReleaseNotesUrl: releaseInfo.html_url,
    ReleaseDate: new Date(releaseInfo.published_at!).toISOString().slice(0, 10),
    DeletePreviousVersion: delPrevVersion,
  });

  // install powershell-yaml, clone winget-pkgs repo and configure remotes, update yamlcreate, and
  // download wingetdev from vedantmgoyal2009/vedantmgoyal2009 (winget-pkgs-automation)
  info(
    `::group::Install powershell-yaml, clone winget-pkgs and configure remotes, update YamlCreate, download wingetdev...`,
  );
  execSync(
    `Install-Module -Name powershell-yaml -Repository PSGallery -Scope CurrentUser -Force`,
    { shell: 'pwsh', stdio: 'inherit' },
  );
  // remove winget-pkgs directory if it exists, in case the action is run multiple times for
  // publishing multiple packages in the same workflow
  execSync(
    `If (Test-Path -Path .\\winget-pkgs\\) { Remove-Item -Path .\\winget-pkgs\\ -Recurse -Force -ErrorAction SilentlyContinue }`,
    { shell: 'pwsh', stdio: 'inherit' },
  );

  simpleGit()
      .clone(remote)
      .cwd("winget-pkgs")
      .addConfig("user.name", "github-actions", false, 'local')
      .addConfig("user.email", "41898282+github-actions[bot]@users.noreply.github.com", false, 'local')
      .remote(["rename", "origin", "upstream"])
      .addRemote("origin", `https://github.com/${forkUser}/winget-pkgs.git`)
      .exec(() => {
        request(modifiedYamlCreate).pipe(fs.createWriteStream('Tools\\YamlCreate.ps1'))
      })
      .commit("Update YamlCreate.ps1")
      .checkout("https://github.com/vedantmgoyal2009/vedantmgoyal2009/trunk/tools/wingetdev")

  process.env.WINGETDEV = resolve('wingetdev', 'wingetdev.exe')

  info(`::group::Update manifests and create pull request`);
  execSync(`.\\YamlCreate.ps1 \'${inputObject}\'`, {
    cwd: 'winget-pkgs/Tools',
    shell: 'pwsh',
    stdio: 'inherit',
    env: { ...process.env, GH_TOKEN: token }, // set GH_TOKEN env variable for GitHub CLI (gh)
  });
  info(`::endgroup::`);

  info(`::group::Checking for action updates...`);
  // check if action version is a version (starts with `v`) and not a pinned commit ref
  if (/^v\d+$/g.test(process.env.GITHUB_ACTION_REF!)) {
    const latestVersion = (
      await getOctokit(token).rest.repos.getLatestRelease({
        owner: 'vedantmgoyal2009',
        repo: 'winget-releaser',
      })
    ).data.tag_name;

    info(`Current action version: ${process.env.GITHUB_ACTION_REF}`);
    info(`Latest version found: ${latestVersion}`);

    // if the latest version is greater than the current version, then update the action
    if (latestVersion > process.env.GITHUB_ACTION_REF!) {
      simpleGit()
          .clone(`https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`)
          .cwd(process.env.GITHUB_REPOSITORY!.split('/')[1])
          .addConfig("user.name", "github-actions", false, 'local')
          .addConfig("user.email", "41898282+github-actions[bot]@users.noreply.github.com", false, 'local')
          .exec(() => {
            execSync(
                `find -name '*.yml' -or -name '*.yaml' -exec sed -i 's/vedantmgoyal2009\\/winget-releaser@${process.env.GITHUB_ACTION_REF}/vedantmgoyal2009\\/winget-releaser@${latestVersion}/g' {} +`,
                {
                  stdio: 'inherit',
                  cwd: `${
                      process.env.GITHUB_REPOSITORY!.split('/')[1]
                  }/.github/workflows`,
                  shell: 'bash',
                },
            )
          })
          .commit(`ci(winget-releaser): update action from ${process.env.GITHUB_ACTION_REF} to ${latestVersion}`)
          .branch([ '-c', `winget-releaser/update-to-${latestVersion}` ])
          .push(['--force-with-lease', '--set-upstream', 'origin', `winget-releaser/update-to-${latestVersion}`]);
      execSync(
        `@\"
This PR was automatically created by the [WinGet Releaser GitHub Action](https://github.com/vedantmgoyal2009/winget-releaser) to update the action version from \`${process.env.GITHUB_ACTION_REF}\` to \`${latestVersion}\`.\`r\`n
The auto-update function help maintainers keep their workflows up-to-date with the latest version of the action.\`r\`n
You can close this pull request if you don't want to update the action version.\`r\`n
Mentioning @vedantmgoyal2009 for a second pair of eyes, in case any breaking changes have been introduced in the new version of the action.
\"@ | gh pr create --fill --body-file -`,
        {
          stdio: 'inherit',
          cwd: process.env.GITHUB_REPOSITORY!.split('/')[1],
          shell: 'pwsh',
          env: { ...process.env, GH_TOKEN: token }, // set GH_TOKEN env variable for GitHub CLI (gh)
        },
      );
    } else {
      info(`No updates found. Bye bye!`);
    }
  } else {
    info(
      `The workflow maintainer has pinned the action to a commit ref. Skipping update check...`,
    );
  }
  info(`::endgroup::`);
})();
