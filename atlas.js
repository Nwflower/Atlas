// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'

export class atlas extends plugin {
  constructor () {
    let rule = {
      reg: '#?.*(图鉴)*',
      fnc: 'atlas'
    }
    super({
      name: '图鉴',
      dsc: '原神圣遗物、武器图鉴与角色材料，支持热更新',
      event: 'message',
      priority: 10,
      rule: [rule]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.islog = false
    Object.defineProperty(rule, 'log', {
      get: () => this.islog
    })
    this.version = '3.3'
  }

  async init () {
    logger.info('---------QAQ---------')
    logger.info(`Atlas图鉴${this.version}很高兴为您服务~`)
  }

  async atlas (e) {
    let msg
    try {
      msg = e.msg.replaceAll(/图鉴/g, '').trim()
    } catch (e) {
      logger.info(e)
      return false
    }
    if (fs.existsSync(`${this._path}/plugins/Atlas/Genshin-Atlas`)) {
      const syncFiles = fs
        .readdirSync(`${this._path}/plugins/Atlas/Genshin-Atlas`)
        .filter(function (item, index, arr) {
          return item !== '.git'
        })
      for (let sync of syncFiles) {
        let pickrule = await this.getRule(sync)
        if (!pickrule.reg.test(msg)) { continue }
        let Tmpmsg = msg.replaceAll(pickrule.reg, '').trim()
        let Dir = fs.statSync(`${this._path}/plugins/Atlas/Genshin-Atlas/${sync}`)
        if (Dir.isDirectory()) {
          let path = `${this._path}/plugins/Atlas/Genshin-Atlas/${sync}/${await this.getName(Tmpmsg, sync, pickrule.mode)}.png`
          if (fs.existsSync(path)) {
            e.reply(segment.image(path))
            this.islog = true
          }
        }
      }
    }
    return this.islog
  }

  // 获取匹配规则
  async getRule (sync) {
    let syncPath = `${this._path}/plugins/Atlas/resource/rule/${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${this._path}/plugins/Atlas/resource/rule/config.yaml` }
    let YamlObject = YAML.parse(fs.readFileSync(syncPath, 'utf8'))
    let reg = /(#|图鉴)*/g
    if (YamlObject.condition) {
      if (YamlObject.condition === 1) {
        reg = /^#/g
      } else if (YamlObject.condition === 2) {
        reg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
      } else {
        YamlObject.pick.push('#')
        reg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
      }
    }
    return {
      mode: YamlObject.mode,
      reg
    }
  }

  async getName (originName, sync, mode) {
    let syncPath = `${this._path}/plugins/Atlas/resource/othername/${sync}.yaml`
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
