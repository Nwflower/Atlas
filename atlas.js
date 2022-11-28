import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'
import gsCfg from '../genshin/model/gsCfg.js'
// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
export class atlas extends plugin {
  constructor () {
    let rule = {
      reg: '#?.+(图鉴)*',
      fnc: 'atlas'
    }
    super({
      name: '图鉴',
      dsc: '原神各类图鉴与角色材料，支持热更新',
      event: 'message',
      priority: 10,
      rule: [rule]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.islog = false
    Object.defineProperty(rule, 'log', { get: () => this.islog })
  }

  get pluginName () { if (!fs.existsSync(`${this._path}/plugins/Atlas`)) { return 'atlas' } else { return 'Atlas' } }

  async atlas () {
    let msg
    try { msg = this.e.msg.trim() } catch (e) { return false }
    if (fs.existsSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`)) {
      const syncFiles = fs.readdirSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`).filter(function (item, index, arr) { return item !== '.git' })
      for (let sync of syncFiles) {
        let rule = await this.getRule(sync)
        let Tmpmsg = await this.PickRule(msg, rule)
        if (!Tmpmsg) { continue }
        if (!await this.index(sync, Tmpmsg, rule)) {
          if (fs.statSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas/${sync}`).isDirectory()) {
            let path = `${this._path}/plugins/${this.pluginName}/Genshin-Atlas/${sync}/${await this.getName(Tmpmsg, sync, rule.mode)}.png`
            if (fs.existsSync(path)) {
              this.reply(segment.image(path))
              this.islog = true
            }
          }
        }
      }
    } else { logger.error('Atlas图鉴拓展包没有正确安装。请发送指令 #图鉴升级 以获取Atlas图鉴拓展包') }
    return this.islog
  }

  async index (sync, key, rule) {
    let respath = `${this._path}/plugins/${this.pluginName}/resource/text/${sync}.yaml`
    if (fs.existsSync(respath)) {
      let re = YAML.parse(fs.readFileSync(respath, 'utf8'))
      for (let element in re) {
        if (key === element) {
          let divi = '\n'
          switch (rule.condition) {
            case 1:
            case 3:
              divi = '\n#'
              break
            case 2:
              divi = `\n${rule.pick[0]}`
              break
            case 4:
              divi = `\n#${rule.pick[0]}`
              break
          }
          this.reply(`请选择：${divi}${re[element].join(divi)}`)
          return true
        }
      }
    }
    return false
  }

  async getRule (sync) {
    let syncPath = `${this._path}/plugins/${this.pluginName}/resource/rule/${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${this._path}/plugins/${this.pluginName}/resource/rule/config.yaml` }
    return YAML.parse(fs.readFileSync(syncPath, 'utf8'))
  }

  async PickRule (msg, Rule) {
    let pickreg = /图鉴/g
    if ('pick' in Rule) { pickreg = new RegExp(`(${Rule.pick.join('|')})`, 'g') }
    switch (Rule.condition) {
      case 0:// 去除可能的前缀#
        return msg.replaceAll('#', '').trim()
      case 1:// 匹配前缀#并去除
        if (/^#.*$/g.test(msg)) { return msg.replaceAll('#', '').trim() }
        return false
      case 2:// 匹配关键字并去除
        if (pickreg.test(msg)) { return msg.replaceAll('#', '').replaceAll(pickreg, '').trim() }
        return false
      case 3:// 匹配关键字或前缀#并去除
        if (pickreg.test(msg) || /^#.*$/g.test(msg)) { return msg.replaceAll('#', '').replaceAll(pickreg, '').trim() }
        return false
      case 4:// 匹配关键字和前缀#并去除
        if (pickreg.test(msg) && /^#.*$/g.test(msg)) { return msg.replaceAll('#', '').replaceAll(pickreg, '').trim() }
    }
    return false
  }

  async getName (originName, sync, pickmode) {
    if (fs.existsSync(`${this._path}/plugins/${this.pluginName}/resource/othername/${sync}.yaml`)) {
      let YamlObject = YAML.parse(fs.readFileSync(`${this._path}/plugins/${this.pluginName}/resource/othername/${sync}.yaml`, 'utf8'))
      for (let element in YamlObject) { if (pickmode) { if (pickmode === 1) { for (let Elementword of YamlObject[element]) { if (Elementword.includes(originName)) { return element } } } else { for (let Elementword of YamlObject[element]) { if (originName.includes(Elementword)) { return element } } } } else { if (YamlObject[element].includes(originName)) { return element } } }
    }
    if (sync.includes('role')) {
      let rolename = gsCfg.getRole(originName)
      if (rolename) return rolename.name
    }
    return originName
  }
}
