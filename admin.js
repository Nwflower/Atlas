import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { exec } from 'child_process'
// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
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
    this.version = '3.3.1'
  }

  get pluginName () { if (!fs.existsSync(`${this._path}/plugins/Atlas`)) { return 'atlas' } else { return 'Atlas' } }

  get pluginPath () { return `${this._path}/plugins/${this.pluginName}/Genshin-Atlas/` }

  async init () {
    logger.info('---------QAQ---------')
    logger.info(`Atlas图鉴${this.version}很高兴为您服务~`)
  }

  async updata (e) {
    if (!e.isMaster) { return true }
    let command
    if (fs.existsSync(this.pluginPath)) {
      command = 'git pull'
      if (e.msg.includes('强制')) {
        command = 'git  checkout . && git  pull'
        this.reply('开始执行强制更新操作，请稍等')
      } else { this.reply('开始执行更新操作，请稍等') }
      exec(command, { cwd: this.pluginPath }, function (error, stdout, stderr) {
        if (/Already up to date/.test(stdout) || stdout.includes('最新')) { return this.reply('目前所有图片都已经是最新了~') }
        let numRet = /(\d*) files changed,/.exec(stdout)
        if (numRet && numRet[1]) { return this.reply(`报告主人，更新成功，此次更新了${numRet[1]}个图片~`) }
        if (error) { this.reply('更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { this.reply('图鉴升级完毕') }
      })
    } else {
      command = `git clone --depth=1 https://gitee.com/Nwflower/genshin-atlas "${this.pluginPath}"`
      this.reply('开始尝试安装图鉴升级包，可能会需要一段时间，请耐心等待~')
      exec(command, function (error, stdout, stderr) { if (error) { this.reply('Atlas图鉴拓展包安装失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { this.reply('Atlas图鉴拓展包安装成功！您后续也可以通过 #图鉴升级 命令来更新图像') } })
    }
    return true
  }
}
