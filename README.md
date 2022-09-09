<br/>
<p align="center">
  <a href="https://github.com/vedantmgoyal2009/winget-releaser">
    <img src="https://user-images.githubusercontent.com/83997633/189393292-4a470cc3-38e6-4f91-bee2-1d59e672ec81.svg" alt="Logo" width="80" height="80">
  </a>
  <h3 align="center">WinGet Releaser (GitHub Action)</h3>

  <p align="center">
    Publish new releases of your application to the Windows Package Manager easily.
    <br/>
    <br/>
    <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues">Report Bug</a>
    .
    <a href="https://github.com/vedantmgoyal2009/winget-releaser/issues">Request Feature</a>
  </p>
</p>

![Issues](https://img.shields.io/github/issues/vedantmgoyal2009/winget-releaser) ![License](https://img.shields.io/github/license/vedantmgoyal2009/winget-releaser) 

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

### Version Regex (version-regex)
  - Required: ❌

The regex to grab the version number from the GitHub release tag.
  
```yaml
version-regex: '[0-9.]+'
```
  
> **Tip** If you follow [semantic versioning](https://semver.org/) guidelines, and the package version is the same version as in your GitHub release tag, you can safely ignore this. The action will automatically grab the latest version number from release tag.

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
delete-previous-version: 'false'
```

### Token (token)
  - Required: ✅

This is the GitHub token with which the action will authenticate with GitHub and create a pull request on the winget-pkgs repository.

#### The token should have the `public_repo` scope.

> **Caution** Do **not** directly put the token in the action. Instead, create a repository secret containing the token and use that in the workflow. See [using encrypted secrets in a workflow](https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow) for more details.

## Roadmap

See the [open issues](https://github.com/vedantmgoyal2009/winget-releaser/issues) for a list of proposed features (and known issues).

## License

[![GNU AGPLv3 Logo](https://www.gnu.org/graphics/agplv3-155x51.png)](https://www.gnu.org/licenses/agpl-3.0.en.html)

WinGet Releaser is Free Software: You can use, study share and improve it at your will. Specifically you can redistribute and/or modify it under the terms of the GNU General Affero Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
