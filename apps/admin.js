import plugin from '../../../lib/plugins/plugin.js'
import fs from 'node:fs'
import { exec } from 'child_process'
import { pluginRoot } from '../model/path.js'
import { pull, pullForce, pullHard, pullClean } from '../model/update.js'
import { library, link, list } from '../model/moreLib.js'

export class admin extends plugin {
  constructor () {
    super({
      name: 'Atlas图鉴管理',
      dsc: '更新、升级图鉴拓展包及其插件',
      event: 'message',
      priority: 99,
      rule: [
        {
          reg: '^[#/]*(github)?(原神|星铁|绝区零)?图鉴(强行)?(强制)?升级$',
          fnc: 'update'
        }, 
        {
          reg: '^[#/]*图鉴插件(强行)?(强制)?升级$',
          fnc: 'updatePlugin'
        }
      ]
    })
    this._path = process.cwd().replace(/\\/g, '/')
    this.task = {
      cron: '0 0 3 * * ?',
      name: '自动更新最新Atlas图鉴图片-凌晨3-4点之间某一刻自动执行',
      fnc: () => this.updateTask()
    }
  }

  get pluginPath () { return `${pluginRoot}/` }

  getPluginResourcePath (libName) {
    return `${this.pluginPath}${library[libName]}/`
  }

  async updateTask () {
    for (let listElement of list) {
      let pluginResourcePath = this.getPluginResourcePath(listElement)
      setTimeout(async function () {
        if (fs.existsSync(pluginResourcePath)) {
          exec(pull, { cwd: pluginResourcePath }, function (error, stdout, stderr) {
            let numRet = /(\d*) files changed,/.exec(stdout)
            if (numRet && numRet[1]) { logger.info(`Atlas${listElement}图鉴资源自动更新成功，此次更新了${numRet[1]}个图片~`) } else if (error) { logger.info('图片资源更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 将于明日重试') }
          })
        }
      }, Math.floor(Math.random() * 3600000 + 1))
    }
  }

  async update (e) {
    if (!e.isMaster) { return false }
    let libName = '原神'

    // 获取要更新的仓库
    for (let listElement of list) {
      if (this.e.msg && this.e.msg.includes(listElement)) {
        libName = listElement
        break
      }
    }

    if (fs.existsSync(this.getPluginResourcePath(libName))) {
      let command = await this.getUpdateType()
      exec(command, { cwd: this.getPluginResourcePath(libName) }, function (error, stdout, stderr) {
        if (/Already up to date/.test(stdout) || stdout.includes('最新')) { e.reply('目前所有图片都已经是最新了~') }
        let numRet = /(\d*) files changed,/.exec(stdout)
        if (numRet && numRet[1]) { e.reply(`报告主人，更新成功，此次更新了${libName}图鉴的${numRet[1]}个图片~`) }
        if (error) { e.reply('图片资源更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { e.reply('Atlas图鉴图片资源升级完毕') }
      })
    } else {
      let command = `git clone --depth=1 ${link[libName]} "${this.getPluginResourcePath(libName)}"`
      e.reply(`开始尝试安装Atlas${libName}图鉴升级包，可能会需要一段时间，请耐心等待~`)
      exec(command, function (error, stdout, stderr) { if (error) { e.reply(`Atlas${libName}图鉴拓展包安装失败！\nError code: ` + error.code + '\n' + error.stack + '\n 请稍后重试。') } else { e.reply(`Atlas${libName}图鉴拓展包安装成功！您后续也可以通过 #${libName}图鉴升级 命令来更新图像`) } })
    }
    return true
  }

  async getUpdateType () {
    let command = pull
    if (this.e.msg.includes('强行强制')) {
      this.reply('开始强行执行强制更新操作，请稍等')
      command = pullClean
    } else if (this.e.msg.includes('强行')) {
      this.reply('开始强行执行更新操作，请稍等')
      command = pullHard
    } else if (this.e.msg.includes('强制')) {
      this.reply('开始执行强制更新操作，请稍等')
      command = pullForce
    } else {
      this.reply('开始执行更新操作，请稍等')
    }
    return command
  }

  async updatePlugin (e) {
    if (!e.isMaster) { return true }
    let command = await this.getUpdateType()
    let path = this.pluginPath
    let timer
    exec(command, { cwd: path }, function (error, stdout, stderr) {
      if (/Already up to date/.test(stdout) || stdout.includes('最新')) {
        e.reply('目前已经是最新版的Atlas插件了~')
        return true
      }
      if (error) {
        e.reply('Atlas插件更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
        return true
      } else {
        e.reply('Atlas插件更新成功，正在尝试重新启动Yunzai以应用更新...')
        timer && clearTimeout(timer)
        redis.set('atlas:restart-msg', JSON.stringify({
          msg: '重启成功，新版Atlas插件已经生效',
          qq: e.user_id
        }), { EX: 30 })
        timer = setTimeout(function () {
          let command = 'npm run start'
          if (process.argv[1].includes('pm2')) { command = 'npm run restart' }
          exec(command, function (error, stdout, stderr) {
            if (error) {
              e.reply('自动重启失败，请手动重启以应用新版Atlas插件。\nError code: ' + error.code + '\n' + error.stack + '\n')
              logger.error(`重启失败\n${error.stack}`)
              return true
            } else if (stdout) {
              logger.mark('重启成功，运行已转为后台，查看日志请用命令：npm run log')
              logger.mark('停止后台运行命令：npm stop')
              process.exit()
            }
          })
        }, 1000)
      }
    })
    return true
  }
}
