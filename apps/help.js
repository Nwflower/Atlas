import plugin from '../../../lib/plugins/plugin.js'
import { pluginResources } from "../model/path.js";

export class atlasHelp extends plugin {
  constructor () {
    super({
      name: 'Atlas图鉴_帮助',
      dsc: 'Atlas图鉴的帮助',
      event: 'message',
      priority: 45,
      rule: [{
        reg: '（#|\*)?(图鉴|wiki|百科|Atlas)(帮助|菜单|功能)',
        fnc: 'help'
      }]
    })
  }
  async help (e) {
    await this.reply(segment.image('file://'+pluginResources+'/img/help.png'))
    return false
  }

}
