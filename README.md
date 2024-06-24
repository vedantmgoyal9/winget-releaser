<h1> <img src="https://github.com/vedantmgoyal9/winget-releaser/blob/main/.github/github-actions-logo.png" width="32" height="32" alt="Logo" /> WinGet Releaser (GitHub Action) </h1>

![GitHub contributors (via allcontributors.org)][github-all-contributors-badge]
![GitHub issues][github-issues-badge]
![GitHub release (latest by date)][github-release-badge]
![GitHub Repo stars][github-repo-stars-badge]
![GitHub][github-license-badge]
[![Badge](https://img.shields.io/badge/docs.bittu.eu.org%2Fdocs%2Fwinget--releaser--playground-abcdef?style=flat&logo=windowsterminal&label=Playground%20(dry-run))][playground-link]

Publish new releases of your application to the Windows Package Manager easily.

![pr-example-screenshot][pr-screenshot-image]

Creating manifests and pull requests for every release of your application can be time-consuming and error-prone.

WinGet Releaser allows you to automate this process, with pull requests that are trusted amongst the community, often
expediting the amount of time it takes for a submission to be reviewed.

## Getting Started 🚀

> [!IMPORTANT]
> At least **one** version of your package should already be present in the [Windows Package Manager Community Repository][winget-pkgs-repo].
> The action will use that version as a base to create manifests for new versions of the package.

1. You will need to create a _classic_ Personal Access Token (PAT) with `public_repo` scope. _New_ fine-grained PATs aren't supported by the action. Review https://github.com/vedantmgoyal9/winget-releaser/issues/172 for information.

2. Fork [microsoft/winget-pkgs][winget-pkgs-repo] under the same account/organization as the project's repository. If you are forking [winget-pkgs][winget-pkgs-repo] on a different account (e.g. bot/personal account), you can use the `fork-user` input to specify the username of the account where the fork is present.

   - Ensure that the fork is up-to-date with the upstream. You can use **[<img src="https://github.com/vedantmgoyal9/winget-releaser/blob/main/.github/pull-app-logo.svg" valign="bottom"/> Pull App][pull-app-auto-update-forks]** which keeps your fork up-to-date via automated pull requests.

3. Add the action to your workflow file (e.g. `.github/workflows/<name>.yml`).

> [!IMPORTANT]
> The action will only work when the release is **published** (not a draft), because the release assets (binaries) aren't available publicly until the release is published.

> [!NOTE]
> In case you're pinning the action to a commit hash, you'll need to update the hash frequently to get the latest features & bug fixes. Therefore, it is **highly** recommended to setup dependabot auto-updates for your repository. Check out [keeping your actions up to date with Dependabot][dependabot-setup-guide] for guidance on how to do this. (Yes, it also supports updating actions pinned to a commit hash!)

## Examples 📝

<table>
<tr>
<th align="center"> Workflow with the minimal configuration </th>
<th align="center"> Workflow with a filter to only publish .exe files </th>
<th align="center"> Workflow to publish multiple packages </th>
<th align="center"> Workflow with implementation of custom package version </th>
</tr>
<tr>
<td>

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest
    steps:
      - uses: vedantmgoyal9/winget-releaser@main
        with:
          identifier: Package.Identifier
          max-versions-to-keep: 5 # keep only latest 5 versions
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
<td>

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest
    steps:
      - uses: vedantmgoyal9/winget-releaser@main
        with:
          identifier: Package.Identifier
          installers-regex: '\.exe$' # Only .exe files
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
<td>

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest
    steps:
      - name: Publish X to WinGet
        uses: vedantmgoyal9/winget-releaser@main
        with:
          identifier: Package.Identifier<X>
          installers-regex: '\.exe$' # Only .exe files
          token: ${{ secrets.WINGET_TOKEN }}
      - name: Publish Y to WinGet
        uses: vedantmgoyal9/winget-releaser@main
        with:
          identifier: Package.Identifier<Y>
          installers-regex: '\.msi$' # Only .msi files
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
<td>

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest
    steps:
      - name: Get version
        id: get-version
        run: |
          # Finding the version from release name
          $VERSION="${{ github.event.release.name }}" -replace '^.*/ '
          "version=$VERSION" >> $env:GITHUB_OUTPUT
        shell: pwsh
      - uses: vedantmgoyal9/winget-releaser@main
        with:
          identifier: Package.Identifier
          version: ${{ steps.get-version.outputs.version }}
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
</tr>
</table>

## Configuration Options ⚒️

- `identifier`: The package identifier of the package to be updated in the [WinGet Community Repository][winget-pkgs-repo].

  - **Required**: ✅
  - **Example**: `identifier: Publisher.Package # Microsoft.Excel`

- `version`: The `PackageVersion` of the package you want to release.

  - **Required**: ❌ (defaults to tag, excluding `v` prefix: `v1.0.0` -> `1.0.0`)
  - **Example**: `version: ${{ github.event.release.tag_name }} # For tags without the 'v' prefix`

- `installers-regex`: A regular expression to match the installers from the release artifacts which are to be published to Windows Package
  Manager (WinGet).

  - **Required**: ❌ (Default value: `.(exe|msi|msix|appx)(bundle){0,1}$`)
  - **Example**: `installers-regex: '\.exe$' # All EXE's`

- `max-versions-to-keep`: The maximum number of versions of the package to keep in the [WinGet Community Repository][winget-pkgs-repo]. If after the current release, the number of versions exceeds this limit, the oldest version will be deleted.

  - **Required**: ❌ (Default value: `0` - unlimited)
  - **Example**: `max-versions-to-keep: 5 # keep only the latest 5 versions`

- `release-tag`: The GitHub release tag of the release you want to publish to Windows Package Manager (WinGet).

  - **Required**: ❌ (Default value: `${{ github.event.release.tag_name || github.ref_name }}`)
  - **Example**: `release-tag: ${{ inputs.version }} # workflow_dispatch input 'version'`

- `token`: The GitHub token with which the action will authenticate with GitHub API and create a pull request on the [WinGet Community Repository][winget-pkgs-repo]. **The token should have a `public_repo` scope.**

  - **Required**: ✅
  - **Example**: `token: ${{ secrets.WINGET_TOKEN }} # Repository secret called 'WINGET_TOKEN'`

> [!WARNING]
> Do **not** directly put the token in the action. Instead, create a repository secret containing the token and use that in the workflow. Refer to [using encrypted secrets in a workflow][gh-encrypted-secrets] for more information.

- `fork-user`: The GitHub username of the user where a fork of [winget-pkgs][winget-pkgs-repo] is present. This
  fork will be used to create the pull request.
  - **Required**: ❌ (Default value: `${{ github.repository_owner }} # repository owner`)
  - **Example**: `fork-user: dotnet-winget-bot # for example purposes only`

<h2> 🚀 Integrating with <a href="https://github.com/russellbanks/Komac"> <img src="https://github.com/vedantmgoyal9/winget-releaser/blob/main/.github/komac-logo.svg" height="24px" style="vertical-align:bottom" alt="Komac logo" /> </a> - Supercharging WinGet Releaser </h1>

The action uses [Komac][komac-repo] under the hood to create manifests and publish them to the [Windows Package Manager Community Repository][winget-pkgs-repo] because of its unique capability to update installer URLs with respect to architecture, installer type, scope, etc.

I'm grateful to [Russell Banks][russellbanks-github-profile], the creator of Komac, for creating such an amazing & wonderful winget manifest creator, which is the core of this action. Again, it is because of Komac that the action can now be used on any platform (Windows, Linux, macOS) and not just Windows (as it was before).

## 🌟 Stargazers over time 👀

[![Stargazers over time](https://starchart.cc/vedantmgoyal9/winget-releaser.svg)](https://starchart.cc/vedantmgoyal9/winget-releaser)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/daiyam"><img src="https://avatars.githubusercontent.com/u/587742?v=4?s=90" width="90px;" alt="Baptiste Augrain"/><br /><sub><b>Baptiste Augrain</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=daiyam" title="Code">💻</a> <a href="#ideas-daiyam" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Adaiyam" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://blog.256bit.org"><img src="https://avatars.githubusercontent.com/u/244927?v=4?s=90" width="90px;" alt="Christian Brabandt"/><br /><sub><b>Christian Brabandt</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Achrisbra" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linwood.dev"><img src="https://avatars.githubusercontent.com/u/20452814?v=4?s=90" width="90px;" alt="CodeDoctor"/><br /><sub><b>CodeDoctor</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3ACodeDoctorDE" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/doug24"><img src="https://avatars.githubusercontent.com/u/17227248?v=4?s=90" width="90px;" alt="Doug P"/><br /><sub><b>Doug P</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Adoug24" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://erictrenkel.com"><img src="https://avatars.githubusercontent.com/u/7342321?v=4?s=90" width="90px;" alt="Eric Trenkel"/><br /><sub><b>Eric Trenkel</b></sub></a><br /><a href="#financial-bostrot" title="Financial">💵</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Abostrot" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Fndroid"><img src="https://avatars.githubusercontent.com/u/16091562?v=4?s=90" width="90px;" alt="Fndroid"/><br /><sub><b>Fndroid</b></sub></a><br /><a href="#financial-fndroid" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dorssel"><img src="https://avatars.githubusercontent.com/u/17404029?v=4?s=90" width="90px;" alt="Frans van Dorsselaer"/><br /><sub><b>Frans van Dorsselaer</b></sub></a><br /><a href="#ideas-dorssel" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gerardog"><img src="https://avatars.githubusercontent.com/u/3901474?v=4?s=90" width="90px;" alt="Gerardo Grignoli"/><br /><sub><b>Gerardo Grignoli</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=gerardog" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sink.io"><img src="https://avatars.githubusercontent.com/u/1359421?v=4?s=90" width="90px;" alt="Justin M. Keyes"/><br /><sub><b>Justin M. Keyes</b></sub></a><br /><a href="#ideas-justinmk" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sprout2000"><img src="https://avatars.githubusercontent.com/u/52094761?v=4?s=90" width="90px;" alt="Kei Touge"/><br /><sub><b>Kei Touge</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Asprout2000" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.marc-auberer.com"><img src="https://avatars.githubusercontent.com/u/59527509?v=4?s=90" width="90px;" alt="Marc Auberer"/><br /><sub><b>Marc Auberer</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Amarcauberer" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.maximmax42.ru"><img src="https://avatars.githubusercontent.com/u/2225711?v=4?s=90" width="90px;" alt="Maxim"/><br /><sub><b>Maxim</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Amaximmax42" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://lohr.dev"><img src="https://avatars.githubusercontent.com/u/3979930?v=4?s=90" width="90px;" alt="Michael Lohr"/><br /><sub><b>Michael Lohr</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=michidk" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://russell.bandev.uk"><img src="https://avatars.githubusercontent.com/u/74878137?v=4?s=90" width="90px;" alt="Russell Banks"/><br /><sub><b>Russell Banks</b></sub></a><br /><a href="#ideas-russellbanks" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=russellbanks" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trbrink"><img src="https://avatars.githubusercontent.com/u/1315577?v=4?s=90" width="90px;" alt="Tim Brinkley"/><br /><sub><b>Tim Brinkley</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Atrbrink" title="Bug reports">🐛</a> <a href="#financial-trbrink" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/twpayne"><img src="https://avatars.githubusercontent.com/u/6942?v=4?s=90" width="90px;" alt="Tom Payne"/><br /><sub><b>Tom Payne</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Atwpayne" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://bittu.eu.org"><img src="https://avatars.githubusercontent.com/u/83997633?v=4?s=90" width="90px;" alt="Vedant"/><br /><sub><b>Vedant</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=vedantmgoyal2009" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/igoogolx"><img src="https://avatars.githubusercontent.com/u/27353191?v=4?s=90" width="90px;" alt="igoogolx"/><br /><sub><b>igoogolx</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Aigoogolx" title="Bug reports">🐛</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=igoogolx" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ilike2burnthing"><img src="https://avatars.githubusercontent.com/u/59480337?v=4?s=90" width="90px;" alt="ilike2burnthing"/><br /><sub><b>ilike2burnthing</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Ailike2burnthing" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/isaak654"><img src="https://avatars.githubusercontent.com/u/12372772?v=4?s=90" width="90px;" alt="isaak654"/><br /><sub><b>isaak654</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Aisaak654" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/repolevedavaj"><img src="https://avatars.githubusercontent.com/u/3026221?v=4?s=90" width="90px;" alt="repolevedavaj"/><br /><sub><b>repolevedavaj</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Arepolevedavaj" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sitiom"><img src="https://avatars.githubusercontent.com/u/56180050?v=4?s=90" width="90px;" alt="sitiom"/><br /><sub><b>sitiom</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=sitiom" title="Documentation">📖</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Asitiom" title="Bug reports">🐛</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=sitiom" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.
Contributions of any kind welcome!

[playground-link]: https://docs.bittu.eu.org/docs/winget-releaser-playground
[dependabot-setup-guide]: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot#example-dependabotyml-file-for-github-actions
[github-all-contributors-badge]: https://img.shields.io/github/all-contributors/vedantmgoyal9/winget-releaser/main?logo=opensourceinitiative&logoColor=white
[github-issues-badge]: https://img.shields.io/github/issues/vedantmgoyal9/winget-releaser?logo=target
[github-release-badge]: https://img.shields.io/github/v/release/vedantmgoyal9/winget-releaser?logo=github
[github-repo-stars-badge]: https://img.shields.io/github/stars/vedantmgoyal9/winget-releaser?logo=githubsponsors
[github-license-badge]: https://img.shields.io/github/license/vedantmgoyal9/winget-releaser?logo=gnu
[pr-screenshot-image]: https://github.com/vedantmgoyal9/winget-releaser/blob/main/.github/pull-request-by-action-example.png
[winget-pkgs-repo]: https://github.com/microsoft/winget-pkgs
[komac-repo]: https://github.com/russellbanks/komac
[russellbanks-github-profile]: https://github.com/russellbanks
[pull-app-auto-update-forks]: https://github.com/wei/pull
[gh-encrypted-secrets]: https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow
