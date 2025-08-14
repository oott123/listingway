import { downloadBigFileWithRetryToOpfs } from './download'

void downloadBigFileWithRetryToOpfs(
  'http://devbox.33.xp:8080/100mb.test',
  '100mb.test',
  4,
  1024 * 1024,
  console.log,
  {},
)
