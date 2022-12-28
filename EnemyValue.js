import plugin from "../../lib/plugins/plugin.js";
import fs from "node:fs";
import { pluginResources } from "./model/path.js";
import YAML from "yaml";

export class EnemyValue extends plugin {
  constructor() {
    super({
      name: "原魔属性计算",
      dsc: "查询原魔生命值和攻击力",
      event: "message",
      priority: 600,
      rule: [{
        reg: "^#(原魔)?.*(生命值|攻击力).*",
        fnc: "query"
      }]
    });
  }

  async query() {
    let text = this.e.msg.toString();
    let type = await this.getType(text);
    let subtype
    let level = await this.getLevel(text);
    let fea = await this.regEnemyOtherData(text, type);
    let feature = ''
    let enemy = await this.regEnemy(text, type);
    let value = 1
    if (!level) {
      // 未获取等级 从修饰因子里面获取
      fea = await this.regEnemyOtherData(text, type);
      if (fea)  level = Number(fea.Level);
      if (isNaN(level) || !level) level = 90;
    }
    if (!fea) {
      fea = { "Factors": "普通" }
    }
    let beilv = Number(fea[`${type}RatioValue`])
    if (type === 'HP'){
      subtype = enemy.HPScale
      value = enemy.HPValue
    } else if (type === 'ATK'){
      subtype = enemy.ATKScale
      value = enemy.ATKValue
    } else {
      return false
    }
    // 调取线型对应的数据
    let CurvesType = await this.getCurvesType(level, subtype);
    // value = Number(CurvesType) * Number(value) * ((isNaN(beilv))? 1:beilv)
    if (fea) {
      feature = fea.Factors
    }
    // this.reply(`${feature}的${level}级${enemy.Enemy}${(type === 'HP')? '生命值':'攻击力'}为${value.toFixed(1)}`)
    this.reply(`${feature}的${level}级${enemy.Enemy}${(type === 'HP')? '生命值':'攻击力'}为${Number(CurvesType).toFixed(1)}*${Number(value).toFixed(2)}*${((isNaN(beilv))? 1:beilv).toFixed(2)}=${(Number(CurvesType) * Number(value) * ((isNaN(beilv))? 1:beilv)).toFixed(1)}`)
  }

  async getCurvesType(level, type) {
    level = Number(level)
    let Datas = await YAML.parse(fs.readFileSync(`${pluginResources}/enemy/Common.yaml`, "utf-8"));

    for (let Data in Datas) {
      if (Number(Datas[Data].Level) === level) {
        return Datas[Data][type]
      }
    }
    return false
  }

  // 匹配原魔
  async regEnemy(text, type) {
    let EnemyData = await YAML.parse(fs.readFileSync(`${pluginResources}/enemy/Enemy.yaml`, "utf-8"));

    for (let Data in EnemyData) {
      if (text.includes(EnemyData[Data].Enemy)) {
        return EnemyData[Data];
      }
    }
    // 没有匹配到
    return false;
  }

  // 匹配修饰因子
  async regEnemyOtherData(text, type) {
    let AttrData = await this.getJson("EnemyOtherAttributionData");
    for (let key of Object.keys(AttrData)) {
      if (key.includes(type)) {
        for (let fea of AttrData[key]) {
          if (text.includes(fea.Factors)) {
            return fea;
          }
        }
      }
    }
    // 没有匹配到
    return false;
  }

  async getJson(file) {
    return JSON.parse(fs.readFileSync(`${pluginResources}/enemy/${file}.json`, "utf-8"));
  }

  async getType(text) {
    let tRet = /(生命值|攻击力)/.exec(text);
    if (tRet[1] === "生命值") return "HP";
    if (tRet[1] === "攻击力") return "ATK";
    return false;
  }

  async getLevel(text) {
    if (!/级/.test(text)) {
      return false;
    }
    let lRet = /([01]?\d?\d|200)级/.exec(text);
    return Number(lRet[1]);
  }

}
