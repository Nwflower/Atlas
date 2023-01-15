import { pluginName } from "./model/path.js";
import fs from "fs";

logger.info('---------QAQ---------')
logger.info(`Atlas图鉴3.4.0很高兴为您服务~`)

let apps = {}
const files = fs.readdirSync(`./plugins/${pluginName}/apps`).filter((file) => file.endsWith('.js'))
for (let file of files) {
  let name = file.replace('.js', '')
  apps[name] = (await import(`./apps/${file}`))[name]
}

let index = { atlas: {} }
export const atlas = index.atlas || {}

export { apps }
