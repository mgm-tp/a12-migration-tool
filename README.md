<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://www.mgm-tp.com/global-content/cd/logos/a12/app-icons/dark/A12-Dark.svg" />
  <img src="https://www.mgm-tp.com/global-content/cd/logos/a12/app-icons/light/A12-Light.svg" height="200" alt="A12 logo" />
</picture>

# Migration Tool

A comprehensive toolkit for building and executing A12 Node-based migration tools, providing a unified logic to migrate A12 models.

Refer to https://geta12.com/#/docs to get started with A12 development

---

## License

Parts of the A12 platform are made available under a **dual license**.
Please check the [LICENSE](./LICENSE) file for details.

---

## Getting Started

### How to Use It

#### Import & Install

This is the internal A12 repository that is used by other A12 Engines. In case you want to use it in your project, you still can install the packages:

```sh
npm install @com.mgmtp.a12.migrationtool/migrationtool-core @com.mgmtp.a12.migrationtool/migrationtool-utils
```

---

### How to Build and Run

#### Prerequisites

The following tools are required in order to build this repository:

| Tool                        | Version |
| --------------------------- | ------: |
| [Node](https://nodejs.org/) |  `22.x` |
| [pnpm](https://pnpm.io/)    |  `11.x` |

#### How to Build

Install all dependencies and link local packages:

```sh
pnpm install
```

Build all packages:

```sh
pnpm compile
```

#### How to Test

Run unit tests in all packages:

```sh
pnpm test
```

#### How to Run

Start the development environment:

```sh
pnpm start
```

This will start the dev servers and TypeScript compilers in watch mode. This is the recommended way to start developing instead of starting individual packages.

#### How to Access It

We currently do not provide a showcase for this repository.

#### How to Clean and Format

Remove all build artifacts:

```sh
pnpm clean
```

Run linting:

```sh
pnpm lint
```

Fix linting issues:

```sh
pnpm format
```

---

### Documentation

- Full technical documentation is available at [GetA12.com](https://GetA12.com).
- The website also provides access to the **A12 Discourse Community Forum**.

---

**The mgm A12 Team**

[mgm technology partners GmbH](https://www.mgm-tp.com) • [Imprint](https://www.mgm-tp.com/imprint.html)
