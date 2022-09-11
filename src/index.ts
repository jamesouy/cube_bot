/// Register @paths in tsconfig
import { register } from 'tsconfig-paths';
const tsConfig = require('../tsconfig.json');
const { outDir, paths } = tsConfig.compilerOptions;
register({ baseUrl: outDir, paths });

/// Start the bot
require('dotenv').config()
import { CubeBot } from '@bot-framework'
if (process.argv.slice(2).includes('-deploy')) {
  CubeBot.deploy().then(() => CubeBot.start())
} else CubeBot.start()