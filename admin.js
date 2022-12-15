import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { exec } from 'child_process'
import { pluginRoot } from "./model/path.js";

export class admin extends plugin {
  constructor () {
    super({
      name: 'Atlas图鉴管理',
      dsc: '更新、升级图鉴拓展包',
      event: 'message',
      priority: 99,
      rule: [{
        reg: '^#*图鉴(强制)?升级$',
        fnc: 'updata'
      }]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.version = '3.3.3'
    this.task = {
      cron: '0 0 3 * * ?',
      name: '自动更新最新图鉴图片-凌晨3-4点之间某一刻自动执行',
      fnc: () => this.updataTask()
    }
  }

  get pluginPath () { return `${pluginRoot}/` }

  get pluginResourcePath () { return `${this.pluginPath}Genshin-Atlas/` }

  async init () {
    logger.info('---------QAQ---------')
    logger.info(`Atlas图鉴${this.version}很高兴为您服务~`)
  }

  async updataTask () {
    let pluginResourcePath = this.pluginResourcePath
    setTimeout(async function () {
      if (fs.existsSync(pluginResourcePath)) {
        exec('git pull', { cwd: pluginResourcePath }, function (error, stdout, stderr) {
          let numRet = /(\d*) files changed,/.exec(stdout)
          if (numRet && numRet[1]) { logger.info(`图鉴资源自动更新成功，此次更新了${numRet[1]}个图片~`) } else if (error) { logger.info('图片资源更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 将于明日重试') }
        })
      }
    }, Math.floor(Math.random() * 3600000 + 1))
  }

  async updata (e) {
    if (!e.isMaster) { return true }
    let command
    if (fs.existsSync(this.pluginResourcePath)) {
      command = 'git pull'
      if (e.msg.includes('强制')) {
        command = 'git  checkout . && git  pull'
        e.reply('开始执行强制更新操作，请稍等')
      } else { e.reply('开始执行更新操作，请稍等') }
      exec(command, { cwd: this.pluginPath }, function (error, stdout, stderr) { if (error) { e.reply('图鉴代码片段更新失败，部分图片可能无法使用。\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { e.reply('图鉴代码片段升级完毕') } })
      exec(command, { cwd: this.pluginResourcePath }, function (error, stdout, stderr) {
        if (/Already up to date/.test(stdout) || stdout.includes('最新')) { e.reply('目前所有图片都已经是最新了~') }
        let numRet = /(\d*) files changed,/.exec(stdout)
        if (numRet && numRet[1]) { e.reply(`报告主人，更新成功，此次更新了${numRet[1]}个图片~`) }
        if (error) { e.reply('图片资源更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { e.reply('图鉴图片资源升级完毕') }
      })
    } else {
      command = `git clone --depth=1 https://gitee.com/Nwflower/genshin-atlas "${this.pluginResourcePath}"`
      e.reply('开始尝试安装图鉴升级包，可能会需要一段时间，请耐心等待~')
      exec(command, function (error, stdout, stderr) { if (error) { e.reply('Atlas图鉴拓展包安装失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { e.reply('Atlas图鉴拓展包安装成功！您后续也可以通过 #图鉴升级 命令来更新图像') } })
    }
    return true
  }
}
