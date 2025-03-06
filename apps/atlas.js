import plugin from '../../../lib/plugins/plugin.js'
import fs from 'node:fs'
import YAML from 'yaml'
import gsCfg from '../../genshin/model/gsCfg.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import { pluginRoot, pluginResources } from '../model/path.js'
import Reply from '../model/reply.js'
import { library, list } from '../model/moreLib.js'

let context = {} // 索引表
let num = {} // 计数器

// 检查配置文件
if (!fs.existsSync(`${pluginResources}/config.yaml`)) { fs.copyFileSync(`${pluginResources}/config_default.yaml`, `${pluginResources}/config.yaml`) }
let atlasConfig = YAML.parse(fs.readFileSync(`${pluginResources}/config.yaml`, 'utf8'))

export class atlas extends plugin {
  constructor () {
    let rule = {
      reg: '^[#/]?.+(图鉴)*',
      fnc: 'atlas'
    }
    super({
      name: 'Atlas图鉴',
      dsc: '原神各类图鉴与角色材料，支持热更新',
      event: 'message',
      priority: atlasConfig.priority,
      rule: [rule]
    })
    this.islog = false
    Object.defineProperty(rule, 'log', { get: () => this.islog })
  }

  getLibraryResourcePath (libName) {
    return `${pluginResources}/Forlibrary/${library[libName]}/`
  }

  init () {
    // 载入图鉴库
    let hasLibrary = false
    for (let listElement of list) {
      let libResPath = this.getLibraryResourcePath(listElement)
      if (fs.existsSync(libResPath)) {
        if (fs.existsSync(`${pluginRoot}/${library[listElement]}/`)) { hasLibrary = true }
        let path = `${libResPath}rule/`
        let pathDef = `${libResPath}rule_default/`
        const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
        for (let file of files) {
          if (!fs.existsSync(`${path}${file}`)) {
            fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
          } else {
            // 检查匹配规则文件版本
            let defaultConfigs = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
            let UserConfigs = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
            if (!defaultConfigs.version || (Number(defaultConfigs.version) === Number(UserConfigs.version))) { /* empty */ } else {
              fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
            }
          }
        }
        logger.info(`Atlas载入库文件：${listElement}成功！`)
      }
    }
    if (!hasLibrary) { logger.error('Atlas图鉴拓展包没有正确安装或者不是最新版本。请发送指令 #图鉴升级 以获取或升级Atlas图鉴拓展包') }
  }

  async atlas (e) {
    // 提取有效口令
    let msg
    try { msg = e.msg.trim() } catch (e) { return false }
    if ((typeof msg != 'string') || msg.constructor !== String) { return false }

    // 检查是否在响应索引
    if (context[this.e.user_id]) { if (await this.select(e)) { delete num[this.e.user_id] } }

    // 校验资源目录

    for (let listElement of list) {
      let libpath = `${pluginRoot}/${library[listElement]}`
      if (!fs.existsSync(`${libpath}/path.json`)) { continue }
      // 获取图鉴的所有模块
      const imagePath = JSON.parse(fs.readFileSync(`${libpath}/path.json`, 'utf-8'))
      const syncFiles = Object.keys(imagePath)
      // logger.debug(`【Atlas】 开始查验${msg}`)
      for (let sync of syncFiles) {
        // 口令转名称
        let rule = await this.getRule(sync, listElement)
        let Tmpmsg = await this.PickRule(msg, rule)
        if (!Tmpmsg) { continue }

        // 先遍历索引
        if (!await this.index(sync, Tmpmsg, rule, libpath)) {
          // 别名转正名
          let rightname = await this.getName(Tmpmsg, sync, rule.mode, listElement)

          // 检查资源是否存在
          if (rightname in imagePath[sync]) {
            let path = `${libpath}${imagePath[sync][rightname]}`
            if (fs.existsSync(path)) {
              // 回复图片
              this.reply(global.segment.image('file://' + path))
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
    }
    return this.islog
  }

  async index (sync, key, rule, libpath) {
    // 获取索引文件目录
    let respath = `${libpath}/index/${sync}.yaml`
    if (!fs.existsSync(respath)) { return false }
    let re = YAML.parse(fs.readFileSync(respath, 'utf8'))
    for (let element in re) {
      // 如果口令匹配到
      if (key === element) {
        // 对象转口令
        let divi = ''
        switch (rule.condition) {
          case 1:
          case 3:
            divi = rule.prefix || '#'
            break
          case 2:
            divi = `${rule.pick[0]}`
            break
          case 4:
            divi = `${rule.prefix || '#'}${rule.pick[0]}`
            break
        }
        // 发送消息
        let sendmsg = []
        let MsgArray = ['请直接发送数字序号或对应指令：']
        for (let i in re[element]) {
          re[element][i] = divi + re[element][i]
          sendmsg.push({
            name: re[element][i],
            Num: Number(i) + 1
          })
          MsgArray.push(`${Number(i) + 1}、${re[element][i]}`)
        }
        let reply = new Reply(this.e)
        let result = await reply.replyMessageArray(MsgArray)
        // 转发失败时加工成图片
        if (!result || !result.message_id) {
          let base64 = await puppeteer.screenshot('AtlasIndex', {
            tplFile: `${pluginResources}/massage/text.html`,
            pluResPath: `${pluginResources}/`,
            imgType: 'png',
            massage: sendmsg,
            name: this.e.nickname
          })
          result = await this.reply(base64)
        }
        if (!result || !result.message_id) { logger.error('Atlas处理图鉴索引列表时处理失败，请检查账号是否被风控') }
        context[this.e.user_id] = re[element]
        return true
      }
    }
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

  async getRule (sync, libname) {
    // 获取某目录的匹配规则
    let syncPath = `${this.getLibraryResourcePath(libname)}rule/${sync}.yaml`
    if (!fs.existsSync(syncPath)) { syncPath = `${this.getLibraryResourcePath(libname)}rule/config.yaml` }
    return YAML.parse(fs.readFileSync(syncPath, 'utf8'))
  }

  async PickRule (msg, Rule) {
    // 执行匹配规则
    let pickreg = /图鉴/g
    let prefix = '#'

    // 触发词处理
    if ('pick' in Rule) { pickreg = new RegExp(`(${Rule.pick.join('|')})`, 'g') }

    // 前缀处理
    if ('prefixForReg' in Rule) { prefix = Rule.prefixForReg }
    let testPrefixReg = new RegExp(`^${prefix}.*$`, 'g')
    switch (Rule.condition) {
      case 0:// 去除可能的前缀词
        return msg.replace(new RegExp(`^${prefix}*`, 'g'), '').trim()
      case 1:// 匹配前缀词并去除
        if (testPrefixReg.test(msg)) { return msg.replace(new RegExp(`^${prefix}*`, 'g'), '').trim() }
        return false
      case 2:// 匹配关键字并去除
        if (pickreg.test(msg)) { return msg.replace(pickreg, '').trim() }
        return false
      case 3:// 匹配关键字或前缀词并去除
        if (pickreg.test(msg) || testPrefixReg.test(msg)) { return msg.replace(new RegExp(`^${prefix}*`, 'g'), '').replace(pickreg, '').trim() }
        return false
      case 4:// 匹配关键字和前缀词并去除
        if (pickreg.test(msg) && testPrefixReg.test(msg)) { return msg.replace(new RegExp(`^${prefix}*`, 'g'), '').replace(pickreg, '').trim() }
        return false
      case 5:// 匹配关键字并去除关键字和前缀词
        if (pickreg.test(msg)) { return msg.replace(new RegExp(`^${prefix}*`, 'g'), '').replace(pickreg, '').trim() }
    }
    return false
  }

  // 传入需要处理的名字 返回原始名字
  async getName (originName, sync, pickmode, libName) {
    let OtherNamePath = `${pluginRoot}/${library[libName]}/othername/${sync}.yaml`
    if (!fs.existsSync(OtherNamePath)) OtherNamePath = `${this.getLibraryResourcePath(libName)}othername/${sync}.yaml`
    // 检查对应库的别名文件是否存在
    if (fs.existsSync(OtherNamePath)) {
      // 读取别名文件
      let YamlObject = YAML.parse(fs.readFileSync(OtherNamePath, 'utf8'))

      // 开始循环 遍历每一组别名
      for (let element in YamlObject) {
        if (pickmode) {
          if (pickmode === 1) {
            for (let Elementword of YamlObject[element]) {
              if (Elementword.includes(originName)) { return element }
            }
          } else {
            for (let Elementword of YamlObject[element]) {
              if (originName.includes(Elementword)) { return element }
            }
          }
        } else {
          if (YamlObject[element].includes(originName)) { return element }
        }
      }
    }
    // 原神角色相关图鉴交由云崽本体功能进行处理
    if (sync.includes('role') && libName === '原神') {
      let rolename = gsCfg.getRole(originName)
      if (rolename) return rolename.name
    }
    // 没有别名直接返回
    return originName
  }
}
