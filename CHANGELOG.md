# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog] and this project adheres to [Semantic Versioning].

<!--
GitHub MD Syntax:
https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax

Highlighting:
https://docs.github.com/assets/cb-41128/mw-1440/images/help/writing/alerts-rendered.webp

> [!NOTE]
>
> Highlights information that users should take into account, even when skimming.

> [!TIP]
>
> Optional information to help a user be more successful.

> [!IMPORTANT]
>
> Crucial information necessary for users to succeed.

> [!WARNING]
>
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
>
> Advised about risks or negative outcomes of certain actions.
-->

## [In Development] - Unreleased

<!--
Section Order:

### Added
### Fixed
### Changed
### Deprecated
### Removed
### Security
### Miscellaneous
-->

<!-- Your changes go here -->

### Added

- Missing callback functions for `onUpdate`, `onBottomReached`, and `onBottomUnreached`, to match the existing events

## [0.1.0] - 2026-08-15

### Added

- Callbacks for `onStick` and `onUnstick` events, which are triggered when an element becomes sticky or unsticky
- Support for scrolling sticky elements, when they are higher than the viewport height
- Code to disconnect the `mutationObserver` to prevent potential issues with sticky
  elements, which are made unsticky

### Changed

- Reduced calls to `.css` by passing an object with multiple properties instead of
  calling `.css` multiple times for each property where possible
- Generate unique sticky wrapper IDs to avoid possible conflicts when multiple sticky
  elements are present on the same page
- Use template literals instead of concatenation where possible

## [0.0.2] - 2026-08-09

### Added

- NPM run scripts for linting and minifying JS files
- Make targets for release handling

### Changed

- Name from `stickyjs` to `@ppfeufer/stickyjs` to avoid name conflicts with other packages
- Moved JS files to `dist` folder
- Moved example files to `examples` folder
- Allow `README.md` in release archives created by GitHub on release

## [0.0.1] - 2026-08-08

### Changed

- Initial release

<!-- Links to be updated upon release -->

[0.0.1]: https://github.com/ppfeufer/stickyjs/commits/v0.0.1 "v0.0.1"
[0.0.2]: https://github.com/ppfeufer/stickyjs/compare/v0.0.1...v0.0.2 "v0.0.2"
[0.1.0]: https://github.com/ppfeufer/stickyjs/compare/v0.0.2...v0.1.0 "v0.1.0"
[in development]: https://github.com/ppfeufer/stickyjs/compare/v0.1.0...HEAD "In Development"
[keep a changelog]: http://keepachangelog.com/ "Keep a Changelog"
[semantic versioning]: http://semver.org/ "Semantic Versioning"
