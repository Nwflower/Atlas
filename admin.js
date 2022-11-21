// 插件制作 西北一枝花(1679659) 首发群240979646，不准搬，一旦在其他群看到本插件立刻停止所有插件制作
import plugin from '../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { exec } from 'child_process'

export class admin extends plugin {
  constructor () {
    let rule = {
      /** 命令正则匹配 */
      reg: '#*图鉴升级',
      /** 执行方法 */
      fnc: 'updata'
    }
    super({
      /** 功能名称 */
      name: '图鉴',
      /** 功能描述 */
      dsc: '简单开发示例',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 30,
      rule: [rule]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.pluginPath = `${this._path}/plugins/Atlas/Genshin-Atlas/`
  }

  async updata (e) {
    let command = ''
    if (fs.existsSync(this.pluginPath)) {
      e.reply('开始尝试更新，请耐心等待~')
      command = 'git pull'
      let isForce = e.msg.includes('强制')
      if (isForce) {
        command = 'git  checkout . && git  pull'
        e.reply('正在执行强制更新操作，请稍等')
      } else {
        e.reply('正在执行更新操作，请稍等')
      }
      exec(command, {
        cwd: this.pluginPath
      }, function (error, stdout, stderr) {
        if (/Already up to date/.test(stdout) || stdout.includes('最新')) {
          e.reply('目前所有图片都已经是最新了~')
          return true
        }
        let numRet = /(\d*) files changed,/.exec(stdout)
        if (numRet && numRet[1]) {
          e.reply(`报告主人，更新成功，此次更新了${numRet[1]}个图片~`)
          return true
        }
        if (error) {
          e.reply('更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
        } else {
          e.reply('图片包升级成功~')
        }
      })
    } else {
      command = `git clone https://gitee.com/Nwflower/genshin-atlas "${this.pluginPath}"`
      e.reply('开始尝试安装图鉴升级包，可能会需要一段时间，请耐心等待~')
      exec(command, function (error, stdout, stderr) {
        if (error) {
          e.reply('角色图片升级包安装失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
        } else {
          e.reply('角色图片升级包安装成功！您后续也可以通过 #图鉴升级 命令来更新图像')
        }
      })
    }
    return true
  }
}
