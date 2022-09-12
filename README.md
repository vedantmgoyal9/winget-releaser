<p align="center">
  <a href="https://github.com/vedantmgoyal2009/winget-releaser">
    <img src="https://user-images.githubusercontent.com/83997633/189393292-4a470cc3-38e6-4f91-bee2-1d59e672ec81.svg" alt="Logo" width="80" height="80">
  </a>
  <h3 align="center">WinGet Releaser (GitHub Action)</h3>

  <p align="center">
    Publish new releases of your application to the Windows Package Manager easily.
    <br/>
    <br/>
    <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues/new?assignees=vedantmgoyal2009&labels=bug%2Chelp+wanted&template=bug.yml&title=%5BBug%5D%3A+">Report Bug</a>
    •
    <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues/new?assignees=vedantmgoyal2009&labels=feat&template=feat.yml&title=%5BFeature%2FIdea%5D%3A+">Request Feature</a>
  </p>

  <p align="center">
    <img alt="GitHub contributors (via allcontributors.org)" src="https://img.shields.io/github/all-contributors/vedantmgoyal2009/winget-releaser/main?style=for-the-badge">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/vedantmgoyal2009/winget-releaser?style=for-the-badge">
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/vedantmgoyal2009/winget-releaser?style=for-the-badge">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/vedantmgoyal2009/winget-releaser?style=for-the-badge">
    <img alt="GitHub" src="https://img.shields.io/github/license/vedantmgoyal2009/winget-releaser?style=for-the-badge">
  </p>
</p>

## About The Project

![Screen Shot](https://user-images.githubusercontent.com/74878137/189383287-a873af57-08cd-4154-9848-a7c661af784c.png)

Creating manifests and pull requests for every release of your application can be time-consuming and error-prone.

WinGet Releaser allows you to automate this process, with pull requests that are trusted amongst the community, often expediting the amount of time it takes for a submission to be reviewed.

## Usage

### Workflow with minimal configuration:
```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest # Action can only be run on windows
    steps:
      - uses: vedantmgoyal2009/winget-releaser@latest
        with:
          identifier: Package.Identifier # Identifier of package on winget-pkgs
          token: ${{ secrets.WINGET_TOKEN }} # Personal Access Token of submitting user
```

## Configuration

### Package Identifier (identifier)
  - Required: ✅

  The package identifier of the package to be updated in the [Windows Package Manager Community Repository](https://github.com/microsoft/winget-pkgs). For example, `Microsoft.Excel`.

```yaml
identifier: Publisher.Package
```

### Version (version)
  - Required: ❌

The `PackageVersion` of the package you want to release.
  
```yaml
version: '1.2.3'
```

### Installers Regex (installers-regex)
  - Required: ❌

```yaml
installers-regex: '\.exe$'
```

Common Regular Expressions:
```yaml
'\.msi$' # All MSI's
'\.exe$' # All EXE's
'\.(exe|msi)' # All EXE's and MSI's
```

### Delete Previous Version (delete-previous-version)
  - Required: ❌

Set this to true if you want to overwrite the previous version of the package with the latest version.

```yaml
delete-previous-version: 'true'
```

### Release tag (release-tag)
  - Required: ❌ (Defaults to the GitHub release tag name)

This is the release tag to be used for creating the manifest.

```yaml
release-tag: 3.2.1
```

### Token (token)
  - Required: ✅

This is the GitHub token with which the action will authenticate with GitHub and create a pull request on the winget-pkgs repository.

```yaml
token: ${{ secrets.WINGET_TOKEN }} # Repository secret called 'WINGET_TOKEN`
```

#### The token should have the `public_repo` scope.

> **Caution** Do **not** directly put the token in the action. Instead, create a repository secret containing the token and use that in the workflow. See [using encrypted secrets in a workflow](https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow) for more details.

### Use fork under which user (fork-user)
  - Required: ❌ (Defaults to the GitHub repository owner)

This is the GitHub username of the user where the fork of [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) is present.

```yaml
fork-user: JohnDoe123
```
## Roadmap

See the [open issues](https://github.com/vedantmgoyal2009/winget-releaser/issues) for a list of proposed features (and known issues).

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="http://russell.bandev.uk"><img src="https://avatars.githubusercontent.com/u/74878137?v=4?s=90" width="90px;" alt=""/><br /><sub><b>Russell Banks</b></sub></a><br /><a href="#ideas-russellbanks" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=russellbanks" title="Documentation">📖</a></td>
      <td align="center"><a href="https://bittu.eu.org"><img src="https://avatars.githubusercontent.com/u/83997633?v=4?s=90" width="90px;" alt=""/><br /><sub><b>Vedant</b></sub></a><br /><a href="https://github.com/vedantmgoyal2009/winget-releaser/commits?author=vedantmgoyal2009" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
