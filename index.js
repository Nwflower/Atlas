import { pluginName } from './model/path.js'
import fs from 'fs'
import common from '../../lib/common/common.js'

let currentVersion = '4.3.0'

logger.info('---------QAQ---------')
logger.info(`Atlas图鉴${currentVersion}很高兴为您服务~`)

let apps = {}
const files = fs.readdirSync(`./plugins/${pluginName}/apps`).filter((file) => file.endsWith('.js'))
for (let file of files) {
  let name = file.replace('.js', '')
  apps[name] = (await import(`./apps/${file}`))[name]
}

setTimeout(async function () {
  let msgStr = await redis.get('atlas:restart-msg')
  if (msgStr) {
    let msg = JSON.parse(msgStr)
    await common.relpyPrivate(msg.qq, msg.msg)
    await redis.del('atlas:restart-msg')
    let msgs = `当前Atlas版本: ${currentVersion}`
    await common.relpyPrivate(msg.qq, msgs)
  }
}, 1000)

if (!global.segment) {
  global.segment = (await import('oicq')).segment
}

let index = { atlas: {} }
export const atlas = index.atlas || {}

export { apps }
