# Migration Tool Utils

Utility commands to develop a migration tool.

## Install

```sh
npm install --save-dev @com.mgmtp.a12.migrationtool/migrationtool-utils
```

## Usage

```
$ migration-tool-utils --help

Usage: migration-tool-utils <command> [options]

Commands:
  migration-tool-utils generate-step               Create a new step interactively
  migration-tool-utils compile                     Compile JSON schemas and all source files
  migration-tool-utils validate-consistency        Validate the model definition in the latest step model is matched the one in core module
  migration-tool-utils validate-official-version   Validate the latest step is an official version for final release

Options:
      --version  Show version number                                                 [boolean]
  -c, --config   Path to the config file. If not specified, the tool will look for
                 'migration-tool.config.json' file in the current working directory   [string]
      --help     Show help                                                           [boolean]
```

## Configurations

The tool requires a configuration file in JSON format to run.
By default, it will look for `migration-tool.config.json` file in the current working directory.
A customized path to the config file can be specified by using `--config` option.

The table below summarizes all the available options. Note that all path options are relative to the configuration file itself.

| Option name           | Description                                                                                            | Type                                  | Note                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------- |
| `modelInterfaceName`  | The name of the model interface or an array of tuples of Semver version range and model interface name | `string` or `Array<[string, string]>` | Required                                                         |
| `stepModelFileName`   | The name of the model definition file in each step directory                                           | `string`                              | Required                                                         |
| `referenceModelPath`  | The path to the model definition file in the core package of the engine                                | `string`                              | Required for `generate-step` and `validate-consistency` commands |
| `stepsDirPath`        | The path to source steps directory                                                                     | `string`                              | Default: "./src/internal/steps"                                  |
| `tsConfigPath`        | The path to tsconfig file for generating JSON schemas                                                  | `string`                              | Default: "./tsconfig.json"                                       |
| `adjustModelFuncPath` | The path to the function adjusts the target model file to make it compatible with the migration tool   | `string`                              | None                                                             |

Additionally, the `compile` command can be called with `--no-schema`, which skips the generation of JSON schema files. This should only be used in non-production environments. When specifying this option, you must also specify `--no-validate-schema` during the model migration step, which is currently only available in the cli migration tool.
