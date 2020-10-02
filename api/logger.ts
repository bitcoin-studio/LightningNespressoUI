import log from 'loglevel'
import chalk, {Chalk} from 'chalk'
import prefix from 'loglevel-plugin-prefix'

type Colors = {[key: string]: Chalk}
const colors: Colors = {
  TRACE: chalk.magenta,
  DEBUG: chalk.cyan,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
}

prefix.reg(log)
log.enableAll()

prefix.apply(log, {
  timestampFormatter(date): string {
    return date.toISOString().slice(0, 19)
  },
  format(level, _, timestamp) {
    return `${chalk.green(`[${timestamp.toString()}]`)} ${colors[level.toUpperCase()](level)}:`
  },
})

export {log}
