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

Type: `Array<{version: string; transform?(model: Model, logger: Logger, context?: MigrationStepContext): Model; schema: any}>`

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

Type: `{migrate(models: Model[], workspace?: Workspace): MigrationResult[]}`

The shared interface for all A12 Engine web-based migration tools. An optional `Workspace` can be provided for resource lookup and side result generation.

### Workspace

Workspace input containing models and resources from the current working environment.

#### models

Type: `WorkspaceModel[]`

Models (JSON files with A12 header) in the workspace. Each entry contains:

- `header` — the parsed model header (id, modelType, version, etc.)
- `path` — relative path to the model file within the workspace

#### resources

Type: `WorkspaceResource[]`

Resources (non-model files) in the workspace. Each entry contains:

- `path` — file name or relative path of the resource
- `hash` — SHA-256 hex hash of the file content, used for deduplication

### MigrationStepContext

Context passed to migration steps via the optional third parameter of the `transform` function. Provides workspace access and side result creation.

#### workspace

Type: `Workspace | undefined`

The workspace with existing models and resources, if provided.

#### findModel(id: string): WorkspaceModel | undefined

Find a model in the workspace by its ID.

#### findResource(path: string): WorkspaceResource | undefined

Find an existing resource in the workspace by its relative path.

#### resolveModel(model: WorkspaceModel): GenericModel | undefined

Resolve the full model object from a `WorkspaceModel` reference. Returns `undefined` if no `resolveModel` callback is configured on the workspace.

#### resolveResource(resource: WorkspaceResource): Uint8Array | undefined

Resolve the binary content of a `WorkspaceResource` reference. Returns `undefined` if no `resolveResource` callback is configured on the workspace.

#### addResource(input: SideResultResourceInput): SideResultResource

Add a resource file as a side result of migration. The SHA-256 hash is always computed from the content and used for deduplication against the workspace and other side results.

Input fields:

- `originalName` — original file name or relative path, e.g. `"logo.png"` or `"assets/logo.png"`
- `content` — binary content of the resource
- `mimeType?` — MIME type, e.g. `"image/png"`
- `additionalProperties?` — additional metadata, e.g. image dimensions
- `path?` — file name or relative path where the resource should be written. Defaults to `"{originalBaseName}_{hash8}.{extension}"`. Use `generateResourceName` and `sha256Hex` (available from `./web`) to generate reproducible names ahead of time.

If the same content already exists in the workspace or was already added as a side result, the existing entry is returned.

#### addModel(input: SideResultModelInput): SideResultModel

Add a JSON model as a side result of migration. The model must be a valid A12 model with a `header`.

Input fields:

- `model` — the model object, already at the current/target version
- `path?` — file name or relative path where the model should be written. Defaults to `"{model.header.id}.json"`.

If a model at the same path already exists in the workspace or was already added as a side result, the existing entry is returned.

#### deleteCurrentModel(reason?: string): void

Mark the currently migrating model for deletion (e.g. when it has been merged into another model). In the CLI, the file will be deleted after migration completes. Works regardless of whether a workspace is configured.

#### deleteModel(id: string, reason?: string): void

Queue a workspace model for deletion by its ID. In the CLI, the file is resolved via the scanned workspace and deleted after migration completes. Requires a workspace to be configured.

#### deleteResource(path: string, reason?: string): void

Queue a workspace resource for deletion by its path (relative to the resources directory). In the CLI, the file is deleted after migration completes. Requires a workspace to be configured.

### MigrationResult

Type: `{ status: "success"; model: object; sideResources?: SideResultResource[]; sideModels?: SideResultModel[]; isDeleted?: boolean; deletedModels?: string[]; deletedResources?: string[] } | { status: "skip"; ... } | { status: "error"; ... }`

The result of migrating a single model. Successful results may include:

- `sideResources` — generated resource files (e.g. extracted images)
- `sideModels` — generated model files (e.g. extracted sub-models)
- `isDeleted` — `true` if the current model was marked for deletion via `deleteCurrentModel`
- `deletedModels` — workspace models queued for deletion via `deleteModel`
- `deletedResources` — workspace resource names queued for deletion via `deleteResource`

### Utilities

The following utilities are re-exported from `./web` or `./cli` for use in migration steps.

#### generateResourceName(originalName: string, hash: string): string

Generate a reproducible resource file name in the format `"{originalBaseName}_{hash8}.{extension}"`, e.g. `"logo_a1b2c3d4.png"`. The `originalName` can be a relative path like `"assets/logo.png"` — the directory structure is preserved.

#### sha256Hex(content: Uint8Array): string

Compute the SHA-256 hex hash of binary content. Useful for generating a stable hash to pass to `generateResourceName` or for deduplication checks.

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
| `--workspace`, `-w` | Path to the workspace directory for resource and model lookup     | `string`  | —                                   |
| `--resources`       | Path to the resources directory for side result output            | `string`  | value of `--workspace`              |
