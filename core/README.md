# Migration Tool Core

The core package contains the main logic of migration tool creation.
It is the internal A12 package that intentionally is used by other A12 Engines, e.g. Overview, Form or Tree Engine.

## Install

```sh
npm install --save-dev @com.mgmtp.a12.migrationtool/migrationtool-core
```

## Usage

The below example shows how to create both CLI and API migration tools for an imaginary page model.

```typescript
// config.ts
import { MIGRATION_STEPS } from "./steps";

export const MIGRATION_CONFIG = {
	modelType: "page",
	minimumSupportedVersion: "5.0.0",
	migrationSteps: MIGRATION_STEPS
};

// api.ts
import { createMigrationTool } from "@com.mgmtp.a12.migrationtool/migrationtool-core/lib/web";
import { MIGRATION_CONFIG } from "./config";

export const pageMigrationTool = createMigrationTool(MIGRATION_CONFIG);

// cli.ts
import { createMigrationCLI } from "@com.mgmtp.a12.migrationtool/migrationtool-core/lib/cli";
import { MIGRATION_CONFIG } from "./config";

createMigrationCLI(MIGRATION_CONFIG);
```

## API

### createMigrationCLI(params: MigrationParameters): void

Create the command-line interface for any A12 Engine migration tool. See [`CLI Options`](#cli-options) for command line options.

### createMigrationTool(params: MigrationParameters): MigrationTool

Create an instance of [`MigrationTool`](#migrationtool) interface that uses to migrate the target models in the browser environments.

## Interfaces

### MigrationParameters

#### modelType

Type: `string`

The type of the target model, e.g. "overview", "tree", etc.

#### minimumSupportedVersion

Type: `string | undefined`

Default: `undefined`

The minimum version the tool supports

#### migrationSteps

Type: `Array<{version: string; transform?(model: Model): Model>; schema: any}>`

A list of migration steps. Each migration step contains a target version,
transform function to migrate from the previous version and a schema for model validation.

#### deprecationMessage

Type: `string | undefined`

Default: `undefined`

The message to show when the migrating model is lower than the minimum supported version.

#### extension

Type: `string | undefined`

Default: `'json'`

The extension of the model files.

#### modelAttributeAccessor

Type: `ModelAttributeAccessor`

Default: default implementation based on A12 Base model

The accessor to get and set the model attributes.

### ModelAttributeAccessor

#### isTargetModel

Type: `(model: object) => boolean`

Check if the model is the target model.

#### isIgnoreModel

Type: `(model: object) => boolean`

Check if the model should be ignored.

#### getId

Type: `(model: object) => string`

Get the model ID.

#### getVersion

Type: `(model: object) => string`

Get the model version.

#### setVersion

Type: `(model: object, version: string) => object`

Set the model version.

### MigrationTool

Type: `{migrate(models: Model[]): MigrationResult[]}`

The shared interface for all A12 Engine web-based migration tools.

## CLI Options

Unlike the browser based version, the command line tool has come additional configuration options, which are summarized in the table below. All boolean flags can also be prefixed with "no-" to negate them.

| Option name         | Description                                                       | Type      | Default                             |
| ------------------- | ----------------------------------------------------------------- | --------- | ----------------------------------- |
| `--backup`          | Backup models before migration                                    | `boolean` | `false`                             |
| `--debug`           | Print debug output                                                | `boolean` | `false`                             |
| `--next`            | Migrate only to the next version, not further                     | `boolean` | `false`                             |
| `--force`           | Force migration even if the model has 'do-not-migrate' annotation | `boolean` | `false`                             |
| `--help`            | Print help output                                                 | `boolean` | `false`                             |
| `--config`          | Path to the configuration file                                    | `string`  | `<cwd>/${configFileTemplate}.[tj]s` |
| `--validate-schema` | Enable or disable validation of models against the JSON schemas   | `boolean` | `true`                              |
