// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'

export class atlas extends plugin {
  constructor () {
    let rule = {
      /** 命令正则匹配 */
      reg: '#.*',
      /** 执行方法 */
      fnc: 'atlas'
    }
    super({
      /** 功能名称 */
      name: '图鉴',
      /** 功能描述 */
      dsc: '简单开发示例',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 2,
      rule: [rule]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.islog = false
    Object.defineProperty(rule, 'log', {
      get: () => this.islog
    })
  }

  async atlas (e) {
    let msg
    try {
      msg = e.msg.replaceAll(/#|图鉴/g, '').trim()
    } catch (e) {
      logger.info(e)
      return false
    }
    if (fs.existsSync(`${this._path}/plugins/Atlas/Genshin-Atlas`)) {
      let p = JSON.parse(fs.readFileSync(`${this._path}/plugins/Atlas/Genshin-Atlas/path.json`, 'utf-8'))
      for (let key in p) {
        for (let word of p[key]) {
          if (msg.includes(word)) {
            msg = msg.replaceAll(word, '').trim()
            let Dir = fs.statSync(`${this._path}/plugins/Atlas/Genshin-Atlas/${key}`)
            if (Dir.isDirectory()) {
              let path = `${this._path}/plugins/Atlas/Genshin-Atlas/${key}/${await this.getName(msg, key)}.png`
              if (fs.existsSync(path)) {
                e.reply(segment.image(path))
                this.islog = true
                return this.islog
              }
            }
          }
        }
      }
      const syncFiles = fs
        .readdirSync(`${this._path}/plugins/Atlas/Genshin-Atlas`)
        .filter(function (item, index, arr) {
          return item !== '.git'
        })
      for (let sync of syncFiles) {
        let Dir = fs.statSync(`${this._path}/plugins/Atlas/Genshin-Atlas/${sync}`)
        if (Dir.isDirectory()) {
          let path = `${this._path}/plugins/Atlas/Genshin-Atlas/${sync}/${await this.getName(msg, sync)}.png`
          if (fs.existsSync(path)) {
            e.reply(segment.image(path))
            this.islog = true
          }
        }
      }
    }
    return this.islog
  }

  async getName (originName, sync) {
    let syncPath = `${this._path}/plugins/Atlas/yaml/${sync}.yaml`
    if (fs.existsSync(syncPath)) {
      let YamlObject = YAML.parse(fs.readFileSync(syncPath, 'utf8'))
      for (let element in YamlObject) {
        if (YamlObject[element].includes(originName)) {
          return element
        }
      }
    }
    return originName
  }
}
