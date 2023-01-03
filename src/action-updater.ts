import { info } from '@actions/core';
import { execSync } from 'node:child_process';
import { simpleGit } from 'simple-git';
import { context, getOctokit } from '@actions/github';

export default async (githubToken: string) => {
  const github = getOctokit(githubToken);

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

  simpleGit()
    .clone(
      `https://x-access-token:${githubToken}@github.com/${process.env.GITHUB_REPOSITORY}.git`,
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
};
