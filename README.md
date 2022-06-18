# WinGet Releaser (GitHub Action)

[![Documentation][docs-badge]][docs]
[![Issues][issues-badge]][issues]

Publish new releases of your application to the [Windows Package Manager][winget-pkgs-repo] easily.

- Workflow with the minimal configuration:

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest # action can only be run on windows
    steps:
      - uses: vedantmgoyal2009/winget-releaser@latest
        with:
          identifier: Package.Identifier
          token: ${{ secrets.WINGET_TOKEN }}
```

- Workflow using all the available configuration options:

```yaml
name: Publish to WinGet
on:
  release:
    types: [released]
jobs:
  publish:
    runs-on: windows-latest # action can only be run on windows
    steps:
      - uses: vedantmgoyal2009/winget-releaser@latest
        with:
          identifier: Package.Identifier
          version-regex: '[0-9.]+'
          installers-regex: '\.exe$' # only .exe files
          delete-previous-version: 'false' # don't forget the quotes
          token: ${{ secrets.WINGET_TOKEN }}
          fork-user: <github-username> # don't put "@" when writing username, defaults to repository owner/organization
```

> **Note** All updates will be pushed to the **_latest_** tag, so you don't have to update version tag in your workflow manually everytime, when the action is updated 🙂

[docs-badge]: https://img.shields.io/badge/Documentation-bittu.eu.org-blue
[docs]: https://bittu.eu.org/docs/wr-intro
[issues-badge]: https://img.shields.io/badge/Issues-Click%20here!-important
[issues]: https://github.com/vedantmgoyal2009/vedantmgoyal2009/issues/new/choose
[winget-pkgs-repo]: https://github.com/microsoft/winget-pkgs
