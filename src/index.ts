import { CubeBot } from 'bot-framework'

if (process.argv.slice(2).includes('-deploy')) {
  CubeBot.deploy().then(() => CubeBot.start())
} else CubeBot.start()