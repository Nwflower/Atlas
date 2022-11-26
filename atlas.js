import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'
import gsCfg from '../genshin/model/gsCfg.js'
import { isArray } from 'lodash'

// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
export class atlas extends plugin {
  constructor () {
    let rule = {
      reg: '#?[\u4e00-\u9fa5]+(图鉴)*',
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
    Object.defineProperty(rule, 'log', { get: () => this.islog })
    this.version = '3.3'
    this.pluginName = 'Atlas'
  }

  async init () {
    logger.info('---------QAQ---------')
    logger.info(`Atlas图鉴${this.version}很高兴为您服务~`)
    if (!fs.existsSync(`./plugins/${this.pluginName}`)) { this.pluginName = this.pluginName.toLowerCase() }
  }

  async atlas (e) {
    let msg
    try { msg = e.msg.replaceAll(/图鉴/g, '').trim() } catch (e) {
      logger.debug(e)
      return false
    }
    if (fs.existsSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`)) {
      const syncFiles = fs.readdirSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`).filter(function (item, index, arr) {
        return item !== '.git'
      })
      for (let sync of syncFiles) {
        let pickrule = await this.getRule(sync)
        if (isArray(pickrule.pickreg)) {
          let flag = false
          pickrule.pickreg.forEach((val) => { if (!val.test(msg)) { flag = true } })
          if (flag) { continue }
        }
        if (!pickrule.pickreg.test(msg)) { continue }
        let Tmpmsg = msg.replaceAll(pickrule.reg, '').trim()
        let Dir = fs.statSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas/${sync}`)
        if (Dir.isDirectory()) {
          // 角色材料特殊处理
          if (sync === 'material for role') {
            let rolename = gsCfg.getRole(Tmpmsg, '突破|材料|素材|更新')
            if (!rolename) return false
            if (['10000005', '10000007', '20000000'].includes(String(rolename.roleId))) { return await this.e.reply('暂无主角素材') }
            Tmpmsg = rolename.name
          }
          let path = `${this._path}/plugins/${this.pluginName}/Genshin-Atlas/${sync}/${await this.getName(Tmpmsg, sync)}.png`
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
    let syncPath = `${this._path}/plugins/${this.pluginName}/resource/rule/${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${this._path}/plugins/${this.pluginName}/resource/rule/config.yaml` }
    let YamlObject = YAML.parse(fs.readFileSync(syncPath, 'utf8'))
    let pickreg = /#?[\u4e00-\u9fa5]+(图鉴)*/g
    let reg = /.*/g
    if (YamlObject.condition) {
      if (YamlObject.condition === 1) {
        reg = /#/g
        pickreg = /^#*/g
      } else if (YamlObject.condition === 2) {
        pickreg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
        YamlObject.pick.push('#')
        reg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
      } else if (YamlObject.condition === 3) {
        YamlObject.pick.push('#')
        pickreg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
        reg = pickreg
      } else {
        pickreg = [/^#/g, new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')]
        YamlObject.pick.push('#')
        reg = new RegExp(`(${YamlObject.pick.join('|')})+`, 'g')
      }
    }
    return {
      mode: YamlObject.mode,
      reg,
      pickreg
    }
  }

  async getName (originName, sync) {
    if (fs.existsSync(`${this._path}/plugins/${this.pluginName}/resource/othername/${sync}.yaml`)) {
      let YamlObject = YAML.parse(fs.readFileSync(`${this._path}/plugins/${this.pluginName}/resource/othername/${sync}.yaml`, 'utf8'))
      for (let element in YamlObject) { if (YamlObject[element].includes(originName)) { return element } }
    }
    return originName
  }
}
