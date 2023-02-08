import { pluginResources } from "./model/path.js";
import path from 'path'


// 支持锅巴
export function supportGuoba () {
  return {
    pluginInfo: {
      name: 'atlas',
      title: '图鉴(Atlas)',
      author: '@听语惊花',
      authorLink: 'https://github.com/Nwflower',
      link: 'https://github.com/Nwflower/atlas',
      isV3: true,
      isV2: false,
      description: '一个Yunzai-Bot的原神图鉴拓展插件',
      icon: 'iconoir:3d-three-pts-box',
      iconColor: '#f4c436',
      iconPath: path.join(pluginResources, 'img/logo_atlas.png'),
    }}}
