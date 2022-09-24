const { getInput, info, getBooleanInput, error } = require("@actions/core");
const { context, getOctokit } = require("@actions/github");
const { execSync } = require("child_process");
const { resolve } = require("path");

(async () => {
  // check if the runner operating system is windows
  if (process.platform != "win32") {
    error("This action only works on Windows.");
    process.exit(1);
  }

  // get the inputs from the action
  const pkgid = getInput("identifier");
  const version = getInput("version");
  const instRegex = getInput("installers-regex");
  const releaseTag = getInput("release-tag");
  const delPrevVersion = getBooleanInput("delete-previous-version");
  const token = getInput("token");
  const forkUser = getInput("fork-user");

  // get only data, and exclude status, url, and headers
  releaseInfo = {
    ...(
      await getOctokit(token).rest.repos.getReleaseByTag({
        owner: context.repo.owner,
        repo: context.repo.name,
        tag: releaseTag,
      })
    ).data,
  };

  // install powershell-yaml, clone winget-pkgs repo and configure remotes, update yamlcreate, and
  // download wingetdev from vedantmgoyal2009/vedantmgoyal2009 (winget-pkgs-automation)
  info(
    `::group::Install powershell-yaml, clone winget-pkgs and configure remotes, update YamlCreate, download wingetdev...`,
  );
  execSync(
    `Install-Module -Name powershell-yaml -Repository PSGallery -Scope CurrentUser -Force`,
    { shell: "pwsh", stdio: "inherit" },
  );
  // remove winget-pkgs directory if it exists, in case the action is run multiple times for
  // publishing multiple packages in the same workflow
  execSync(
    `Remove-Item -Path .\\winget-pkgs\\ -Recurse -Force -ErrorAction SilentlyContinue`,
    { shell: "pwsh", stdio: "inherit" },
  );
  execSync(
    `git clone https://x-access-token:${token}@github.com/microsoft/winget-pkgs.git`,
    {
      stdio: "inherit",
    },
  );
  execSync(
    `git -C winget-pkgs config --local user.name github-actions`,
    { stdio: "inherit" },
  );
  execSync(
    `git -C winget-pkgs config --local user.email 41898282+github-actions[bot]@users.noreply.github.com`,
    { stdio: "inherit" },
  );
  execSync(`git -C winget-pkgs remote rename origin upstream`, {
    stdio: "inherit",
  });
  execSync(
    `git -C winget-pkgs remote add origin https://github.com/${forkUser}/winget-pkgs.git`,
    { stdio: "inherit" },
  );
  execSync(
    // NOTE: replace latest with main, while testing the action after modifying yamlcreate.ps1
    `Invoke-WebRequest -Uri https://github.com/vedantmgoyal2009/winget-releaser/raw/latest/YamlCreate.ps1 -OutFile .\\winget-pkgs\\Tools\\YamlCreate.ps1`,
    { shell: "pwsh", stdio: "inherit" },
  );
  execSync(`git -C winget-pkgs commit --all -m \"Update YamlCreate.ps1\"`, {
    stdio: "inherit",
  });
  execSync(
    `svn checkout https://github.com/vedantmgoyal2009/vedantmgoyal2009/trunk/tools/wingetdev`,
    { stdio: "inherit" },
  );
  info(`::endgroup::`);

  // resolve wingetdev path
  process.env.WINGETDEV = resolve("wingetdev", "wingetdev.exe");

  // set GH_TOKEN env variable for GitHub CLI (gh)
  process.env.GH_TOKEN = token;
  // https://github.com/cli/cli/blob/trunk/cmd/gh/main.go#L312

  info(`::group::Update manifests and create pull request`);
  const inputObject = JSON.stringify({
    PackageIdentifier: pkgid,
    PackageVersion: version ||
      new RegExp(/(?<=v).*/g).exec(releaseInfo.tag_name)[0],
    InstallerUrls: releaseInfo.assets
      .filter((asset) => {
        return new RegExp(instRegex, "g").test(asset.name);
      })
      .map((asset) => {
        return asset.browser_download_url;
      }),
    ReleaseNotesUrl: releaseInfo.html_url,
    ReleaseDate: new Date(releaseInfo.published_at).toISOString().slice(0, 10),
    DeletePreviousVersion: delPrevVersion,
  });
  execSync(`.\\YamlCreate.ps1 \'${inputObject}\'`, {
    cwd: "winget-pkgs/Tools",
    shell: "pwsh",
    stdio: "inherit",
  });
  info(`::endgroup::`);
})();
