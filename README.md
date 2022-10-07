<h1> <img src="https://github.com/vedantmgoyal2009/winget-releaser/blob/main/.github/github-actions-logo.png" width="32" height="32" /> WinGet Releaser (GitHub Action) </h1>

![GitHub contributors (via allcontributors.org)][github-all-contributors-badge]
![GitHub issues][github-issues-badge]
![GitHub release (latest by date)][github-release-badge]
![GitHub Repo stars][github-repo-stars-badge]
![GitHub][github-license-badge]
[![Playground-dry-run][playground-dry-run-badge]][playground-dry-run]

Publish new releases of your application to the Windows Package Manager easily.

![pr-example-screenshot][pr-screenshot-image]

Creating manifests and pull requests for every release of your application can be time-consuming and error-prone.

WinGet Releaser allows you to automate this process, with pull requests that are trusted amongst the community, often expediting the amount of time it takes for a submission to be reviewed.

## Getting Started 🚀

1. You will need to create a Personal Access Token (PAT) with `public_repo` scope.

<img src="https://github.com/vedantmgoyal2009/winget-releaser/blob/main/.github/pat-scope.png" />

2. Fork the [winget-pkgs][winget-pkgs-repo] repository under the same account/organization as your repository on which you want to use this action. Ensure that the fork is up-to-date with the upstream repository. You can do this using one of the following methods:

- Give `workflow` permission to the token you created in Step 1. This will allow the action to automatically update your fork with the upstream repository.
- You can use **[<img src="https://github.com/vedantmgoyal2009/winget-releaser/blob/main/.github/pull-app-logo.svg" valign="bottom"/> Pull App][pull-app-auto-update-forks]** which keeps your fork up-to-date with the upstream repository via automated pull requests.

<table>
<tr>
<th align="center"> Workflow with the minimal configuration </th>
<th align="center"> Workflow with a filter to only publish .exe files </th>
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
    # Action can only be run on windows
    runs-on: windows-latest
    steps:
      - uses: vedantmgoyal2009/winget-releaser@v1
        with:
          identifier: Package.Identifier
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
      - uses: vedantmgoyal2009/winget-releaser@v1
        with:
          identifier: Package.Identifier
          installers-regex: '\.exe$' # Only .exe files
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
</tr>
<tr>
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
      - name: Publish X to WinGet
        uses: vedantmgoyal2009/winget-releaser@v1
        with:
          identifier: Package.Identifier<X>
          installers-regex: '\.exe$' # Only .exe files
          token: ${{ secrets.WINGET_TOKEN }}
      - name: Publish Y to WinGet
        uses: vedantmgoyal2009/winget-releaser@v1
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
          echo "::set-output name=version::$VERSION"
        shell: pwsh
      - uses: vedantmgoyal2009/winget-releaser@v1
        with:
          identifier: Package.Identifier
          version: ${{ steps.get-version.outputs.version }}
          token: ${{ secrets.WINGET_TOKEN }}
```

</td>
</tr>
</table>

## Configuration Options

### Package Identifier (identifier)

- Required: ✅

The package identifier of the package to be updated in the [Windows Package Manager Community Repository][winget-pkgs-repo].

```yaml
identifier: Publisher.Package # Microsoft.Excel
```

### Version (version)

- Required: ❌ (defaults to tag, excluding `v` prefix: `v1.0.0` -> `1.0.0`)

The `PackageVersion` of the package you want to release.

```yaml
version: '1.2.3'
```

### Installers Regex (installers-regex)

- Required: ❌ (Default value: `.(exe|msi|msix|appx)(bundle){0,1}$`)

A regular expression to match the installers from the release artifacts which are to be published to Windows Package Manager (WinGet).

```yaml
installers-regex: '\.exe$'
# Some common regular expressions include:
## '\.msi$'      -> All MSI's
## '\.exe$'      -> All EXE's
## '\.(exe|msi)' -> All EXE's and MSI's
## '\.zip$'      -> All ZIP's
```

### Delete Previous Version (delete-previous-version)

- Required: ❌ (Default value: `'false'`)

Set this to true if you want to overwrite the previous version of the package with the latest version.

```yaml
delete-previous-version: 'true' # don't forget to quotes
```

### Release tag (release-tag)

- Required: ❌ (Default value: `${{ github.event.release.tag_name || github.ref }}`)

The GitHub release tag of the release you want to publish to Windows Package Manager (WinGet).

```yaml
release-tag: ${{ github.event.inputs.version }} # workflow_dispatch input `version`
```

### Token (token)

- Required: ✅

The GitHub token with which the action will authenticate with GitHub API and create a pull request on the [microsoft/winget-pkgs][winget-pkgs-repo] repository.

```yaml
token: ${{ secrets.WINGET_TOKEN }} # Repository secret called 'WINGET_TOKEN'
```

#### The token should have the `public_repo` scope.

> **Note** Do **not** directly put the token in the action. Instead, create a repository secret containing the token and use that in the workflow. See [using encrypted secrets in a workflow][gh-encrypted-secrets] for more details.

### Use fork under which user (fork-user)

- Required: ❌ (Default value: `${{ github.repository_owner }} # repository owner`)

This is the GitHub username of the user where the fork of [microsoft/winget-pkgs][winget-pkgs-repo] is present. This fork will be used to create the pull request.

```yaml
fork-user: dotnet-winget-bot # for example purposes only
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://github.com/daiyam"><img src="https://avatars.githubusercontent.com/u/587742?v=4?s=90" width="90px;" alt="Baptiste Augrain"/><br /><sub><b>Baptiste Augrain</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=daiyam" title="Code">💻</a> <a href="#ideas-daiyam" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center"><a href="https://github.com/sprout2000"><img src="https://avatars.githubusercontent.com/u/52094761?v=4?s=90" width="90px;" alt="Kei Touge"/><br /><sub><b>Kei Touge</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Asprout2000" title="Bug reports">🐛</a></td>
      <td align="center"><a href="https://www.maximmax42.ru"><img src="https://avatars.githubusercontent.com/u/2225711?v=4?s=90" width="90px;" alt="Maxim"/><br /><sub><b>Maxim</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Amaximmax42" title="Bug reports">🐛</a></td>
      <td align="center"><a href="http://russell.bandev.uk"><img src="https://avatars.githubusercontent.com/u/74878137?v=4?s=90" width="90px;" alt="Russell Banks"/><br /><sub><b>Russell Banks</b></sub></a><br /><a href="#ideas-russellbanks" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=russellbanks" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/trbrink"><img src="https://avatars.githubusercontent.com/u/1315577?v=4?s=90" width="90px;" alt="Tim Brinkley"/><br /><sub><b>Tim Brinkley</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Atrbrink" title="Bug reports">🐛</a> <a href="#financial-trbrink" title="Financial">💵</a></td>
      <td align="center"><a href="https://bittu.eu.org"><img src="https://avatars.githubusercontent.com/u/83997633?v=4?s=90" width="90px;" alt="Vedant"/><br /><sub><b>Vedant</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=vedantmgoyal2009" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/sitiom"><img src="https://avatars.githubusercontent.com/u/56180050?v=4?s=90" width="90px;" alt="sitiom"/><br /><sub><b>sitiom</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=sitiom" title="Documentation">📖</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues?q=author%3Asitiom" title="Bug reports">🐛</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=sitiom" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

[playground-dry-run-badge]: https://img.shields.io/badge/Playground_(dry--run)-bittu.eu.org%2Fdocs%2Fwr--playground-abcdef?logo=windowsterminal
[playground-dry-run]: https://bittu.eu.org/docs/wr-playground
[github-all-contributors-badge]: https://img.shields.io/github/all-contributors/vedantmgoyal2009/winget-releaser/main?logo=opensourceinitiative&logoColor=white
[github-issues-badge]: https://img.shields.io/github/issues/vedantmgoyal2009/winget-releaser?logo=target
[github-release-badge]: https://img.shields.io/github/v/release/vedantmgoyal2009/winget-releaser?logo=github
[github-repo-stars-badge]: https://img.shields.io/github/stars/vedantmgoyal2009/winget-releaser?logo=githubsponsors
[github-license-badge]: https://img.shields.io/github/license/vedantmgoyal2009/winget-releaser?logo=gnu
[pr-screenshot-image]: https://github.com/vedantmgoyal2009/winget-releaser/blob/main/.github/pull-request-by-action-example.png
[winget-pkgs-repo]: https://github.com/microsoft/winget-pkgs
[pull-app-auto-update-forks]: https://github.com/wei/pull
[gh-encrypted-secrets]: https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow
