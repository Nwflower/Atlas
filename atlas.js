import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'
import gsCfg from '../genshin/model/gsCfg.js'
import puppeteer from '../../lib/puppeteer/puppeteer.js'

let context = {} // 索引表
let num = {} // 计数器
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
    this.ignore = ['.git', 'role', 'food', 'weekboss']
    Object.defineProperty(rule, 'log', { get: () => this.islog })
  }

  get pluginName () { return fs.existsSync(`${this._path}/plugins/Atlas`) ? 'Atlas' : 'atlas' }

  async atlas (e) {
    let msg
    try { msg = e.msg.trim() } catch (e) { return false }
    if ((typeof msg!='string')||msg.constructor!==String) { return false }
    if (context[this.e.user_id]) { if (await this.select(e)) { delete num[this.e.user_id] } }
    if (fs.existsSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`)) {
      let ignore = this.ignore
      const syncFiles = fs.readdirSync(`${this._path}/plugins/${this.pluginName}/Genshin-Atlas`).filter(function (item, index, arr) { return !ignore.includes(item) })
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
              return this.islog
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
          let divi = ''
          switch (rule.condition) {
            case 1:
            case 3:
              divi = '#'
              break
            case 2:
              divi = `${rule.pick[0]}`
              break
            case 4:
              divi = `#${rule.pick[0]}`
              break
          }
          let sendmsg = []
          let MsgArray = []
          for (let i in re[element]) {
            re[element][i] = divi + re[element][i]
            sendmsg.push({
              name: re[element][i],
              Num: Number(i)+1
            })
            MsgArray.push({
              message: `${Number(i)+1}、${re[element][i]}`,
              nickname: Bot.nickname,
              user_id: Bot.uin
            })
          }
          this.reply(sendmsg, true, {MsgArray})
          context[this.e.user_id] = re[element]
          return true
        }
      }
    }
    return false
  }

  /** 消息风控处理 */
  async reply (msgs, quote, data) {
    if (!msgs) return false
    let result
    if (!Array.isArray(msgs)) {
      msgs = [msgs]
      result = await super.reply(msgs, quote)
    } else {
      let forwardMsg = await Bot.makeForwardMsg(data.MsgArray);
      forwardMsg.data = forwardMsg.data
        .replace('<?xml version="1.0" encoding="utf-8"?>','<?xml version="1.0" encoding="utf-8" ?>')
        .replace(/\n/g, '')
        .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
        .replace(/___+/, '<title color="#777777" size="26">请点击查看内容</title>');
      result = await super.reply(forwardMsg, quote)
    }
    if (!result || !result.message_id) {
      let base64 = await puppeteer.screenshot('AtlasIndex', {
        tplFile: `${this._path}/plugins/${this.pluginName}/resource/massage/text.html`,
        pluResPath: `${this._path}/plugins/${this.pluginName}/resource/`,
        imgType: 'png',
        massage: msgs,
        name: this.e.nickname
      })
      result = await super.reply(base64)
      if (!result || !result.message_id) { logger.error('Atlas处理图鉴列表时处理失败，请检查账号是否被风控') }
    }
    return result
  }

  async select (e) {
    if (num[this.e.user_id]) { num[this.e.user_id]++ } else { num[this.e.user_id] = 1 }
    if (num[this.e.user_id] >= 4) {
      delete context[this.e.user_id]
      delete num[this.e.user_id]
      return false
    }
    let i = Number(this.e.msg.trim())
    if (isNaN(i)) { return false } else { e.msg = context[this.e.user_id][i - 1] }
    return this.atlas(e)
  }

  async getRule (sync) {
    let path = `${this._path}/plugins/${this.pluginName}/resource/rule/`
    let pathDef = `${this._path}/plugins/${this.pluginName}/resource/rule_default/`
    const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
    for (let file of files) { if (!fs.existsSync(`${path}${file}`)) { fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`) } }
    let syncPath = `${path}${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${path}config.yaml` }
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
