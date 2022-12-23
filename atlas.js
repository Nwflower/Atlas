import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { segment } from 'oicq'
import YAML from 'yaml'
import gsCfg from '../genshin/model/gsCfg.js'
import puppeteer from '../../lib/puppeteer/puppeteer.js'
import { pluginRoot,pluginResources } from "./model/path.js";

let context = {} // 索引表
let num = {} // 计数器

// 检查配置文件
if (!fs.existsSync(`${pluginResources}/config.yaml`)) { fs.copyFileSync(`${pluginResources}/config_default.yaml`, `${pluginResources}/config.yaml`) }
let atlasConfig = YAML.parse(fs.readFileSync(`${pluginResources}/config.yaml`, 'utf8'))

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
      priority: atlasConfig.priority,
      rule: [rule]
    })
    this.islog = false
    this.ignore = ['.git', 'food', 'WeekBOSS']
    Object.defineProperty(rule, 'log', { get: () => this.islog })
  }

  init () {
    // 检查匹配规则文件
    let path = `${pluginResources}/rule/`
    let pathDef = `${pluginResources}/rule_default/`
    const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
    for (let file of files) { if (!fs.existsSync(`${path}${file}`)) { fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`) } }
  }

  async atlas (e) {
    // 提取有效口令
    let msg
    try { msg = e.msg.trim() } catch (e) { return false }
    if ((typeof msg!='string')||msg.constructor!==String) { return false }

    // 检查是否在响应索引
    if (context[this.e.user_id]) { if (await this.select(e)) { delete num[this.e.user_id] } }

    // 校验资源目录
    if (fs.existsSync(`${pluginRoot}/Genshin-Atlas/path.json`)) {
      // 获取所有图鉴模块
      let ignore = this.ignore
      const imagePath = JSON.parse(fs.readFileSync(`${pluginRoot}/Genshin-Atlas/path.json`,'utf-8'))
      const syncFiles = Object.keys(imagePath).filter(function (item, index, arr) { return !ignore.includes(item) })

      for (let sync of syncFiles) {
        // 口令转名称
        let rule = await this.getRule(sync)
        let Tmpmsg = await this.PickRule(msg, rule)
        if (!Tmpmsg) { continue }

        // 先遍历索引
        if (!await this.index(sync, Tmpmsg, rule)) {
          // 别名转正名
          let rightname = await this.getName(Tmpmsg, sync, rule.mode)

          // 检查资源是否存在
          if (rightname in imagePath[sync]) {
            let path = `${pluginRoot}/Genshin-Atlas${imagePath[sync][rightname]}`
            if (fs.existsSync(path)) {
              // 回复图片
              this.reply(segment.image(path))
              this.islog = true
              // 是否交给其他插件处理
              return atlasConfig.success
            }
          }
        } else {
          // 索引遍历成功 返回FALSE防止指令覆盖
          this.islog = true
          return false
        }
      }
    } else { logger.error('Atlas图鉴拓展包没有正确安装或者不是最新版本。请发送指令 #图鉴升级 以获取或升级Atlas图鉴拓展包') }
    return this.islog
  }

  async index (sync, key, rule) {
    // 获取索引文件目录
    let respath = `${pluginResources}/text/${sync}.yaml`
    if (fs.existsSync(respath)) {
      let re = YAML.parse(fs.readFileSync(respath, 'utf8'))
      for (let element in re) {
        // 如果口令匹配到
        if (key === element) {
          // 对象转口令
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
          // 发送消息
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

  // 消息防风控
  async reply (msgs, quote, data) {
    if (!msgs) return false
    let result
    if (!Array.isArray(msgs)) {
      // 图片交给父方法
      msgs = [msgs]
      result = await super.reply(msgs, quote)
    } else {
      // 先以转发消息形式处理
      let forwardMsg = await Bot.makeForwardMsg(data.MsgArray);
      forwardMsg.data = forwardMsg.data
        .replace('<?xml version="1.0" encoding="utf-8"?>','<?xml version="1.0" encoding="utf-8" ?>')
        .replace(/\n/g, '')
        .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
        .replace(/___+/, '<title color="#777777" size="26">请点击查看内容</title>');
      result = await super.reply(forwardMsg, quote)
    }
    // 转发失败时加工成图片
    if (!result || !result.message_id) {
      let base64 = await puppeteer.screenshot('AtlasIndex', {
        tplFile: `${pluginResources}/massage/text.html`,
        pluResPath: `${pluginResources}/`,
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
    // 计数器自增
    if (num[this.e.user_id]) { num[this.e.user_id]++ } else { num[this.e.user_id] = 1 }

    // 过多计数次数取消计数
    if (num[this.e.user_id] >= 4) {
      delete context[this.e.user_id]
      delete num[this.e.user_id]
      return false
    }

    // 数字转口令
    let i = Number(this.e.msg.trim())
    if (isNaN(i)) { return false } else { e.msg = context[this.e.user_id][i - 1] }

    // 口令处理
    return this.atlas(e)
  }

  async getRule (sync) {
    // 获取某目录的匹配规则
    let syncPath = `${pluginResources}/rule/${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${pluginResources}/rule/config.yaml` }
    return YAML.parse(fs.readFileSync(syncPath, 'utf8'))
  }

  async PickRule (msg, Rule) {
    // 执行匹配规则
    let pickreg = /图鉴/g

    // 触发词处理
    if ('pick' in Rule) { pickreg = new RegExp(`(${Rule.pick.join('|')})`, 'g') }
    switch (Rule.condition) {
      case 0:// 去除可能的前缀#
        return msg.replace(/^#*/g, '').trim()
      case 1:// 匹配前缀#并去除
        if (/^#.*$/g.test(msg)) { return msg.replace(/^#*/g, '').trim() }
        return false
      case 2:// 匹配关键字并去除
        if (pickreg.test(msg)) { return msg.replace(pickreg, '').trim() }
        return false
      case 3:// 匹配关键字或前缀#并去除
        if (pickreg.test(msg) || /^#.*$/g.test(msg)) { return msg.replace(/^#*/g, '').replace(pickreg, '').trim() }
        return false
      case 4:// 匹配关键字和前缀#并去除
        if (pickreg.test(msg) && /^#.*$/g.test(msg)) { return msg.replace(/^#*/g, '').replace(pickreg, '').trim() }
    }
    return false
  }

  async getName (originName, sync, pickmode) {
    // 检查别名文件是否存在
    if (fs.existsSync(`${pluginResources}/othername/${sync}.yaml`)) {
      let YamlObject = YAML.parse(fs.readFileSync(`${pluginResources}/othername/${sync}.yaml`, 'utf8'))
      for (let element in YamlObject) { if (pickmode) { if (pickmode === 1) { for (let Elementword of YamlObject[element]) { if (Elementword.includes(originName)) { return element } } } else { for (let Elementword of YamlObject[element]) { if (originName.includes(Elementword)) { return element } } } } else { if (YamlObject[element].includes(originName)) { return element } } }
    }
    // 角色相关图鉴交由云崽本体功能进行处理
    if (sync.includes('role')) {
      let rolename = gsCfg.getRole(originName)
      if (rolename) return rolename.name
    }
    // 不存在任何别名直接返回
    return originName
  }
}
