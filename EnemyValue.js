import plugin from "../../lib/plugins/plugin.js";
import fs from "node:fs";
import { pluginResources } from "./model/path.js";
import YAML from "yaml";
import gsCfg from "../genshin/model/gsCfg.js";

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

    // 取计算类型 返回HP或者ATK
    let type = await this.getType(text);
    let subtype

    // 取原魔名
    let enemy = await this.regEnemy(text);
    if (!enemy) { return false }

    // 取预设等级 修饰因子不提供时以这个为准
    let level = await this.getLevel(text);

    // 取修饰因子 返回修饰因子对象
    let fea = await this.regEnemyOtherData(text, type);
    if (!fea) {
      fea = {
        "Factors": "普通",
        "ATKRatioValue": 1,
        "HPRatioValue": 1
      }
    }

    // 修饰符置空
    let feature = ''

    let value = 1

    if (!level) {
      // 未获取等级 从修饰因子里面获取
      if (typeof fea.Level === 'undefined') fea.Level = 90;
      level = Number(fea.Level)
    }

    let beilv = await this.getRatioValue(fea,type,enemy.Enemy)

    // 取副类型模型
    if (type === 'HP'){
      subtype = enemy.HPScale
      value = enemy.HPValue
    } else if (type === 'ATK'){
      subtype = enemy.ATKScale
      value = enemy.ATKValue
    } else {
      return false
    }

    // 调取线型对应的基础数据
    let CurvesType = await this.getCurvesType(level, subtype);

    // 填充修饰因子名字
    if (fea) { feature = fea.Factors }
    this.reply(`${feature}的${level}级${enemy.Enemy}${(type === 'HP')? '生命值':'攻击力'}为${Number(CurvesType).toFixed(1)}*${Number(value).toFixed(2)}*${((isNaN(beilv))? 1:beilv).toFixed(2)}=${(Number(CurvesType) * Number(value) * ((isNaN(beilv))? 1:beilv)).toFixed(1)}`)
  }

  async getRatioValue(fea, type, enemy){
    let ValueObject = fea[`${type}RatioValue`]
    if (typeof ValueObject === "number") return Number(ValueObject)
    else {
      for (let valueObjectElement of ValueObject) {
        if (valueObjectElement.enemy.includes(enemy) || !valueObjectElement.enemy.length) {
          return Number(valueObjectElement.value)
        }
      }
    }
    return 1
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
  async regEnemy(text) {
    // 先匹配别名
    let OtherName = await YAML.parse(fs.readFileSync(`${pluginResources}/othername/Enemy.yaml`, "utf-8"));

    let EnableName = []
    // 逐个筛选可疑名字
    for (let element in OtherName) {
      if (text.includes(element)) {
        EnableName.push(element)
        continue
      }
      for (let Elementword of OtherName[element]){
        if (text.includes(Elementword)) {
          EnableName.push(element)
          break
        }
      }
    }

    if (!EnableName.length) return false
    else {
      // 按照长度降序排序
      EnableName.sort(function(a, b) {
        return b.length - a.length
      })
    }

    let EnemyData = await YAML.parse(fs.readFileSync(`${pluginResources}/enemy/Enemy.yaml`, "utf-8"));

    for (let Datas in EnemyData) {
      for (let Data of EnemyData[Datas]){
        if (Data[Datas] === EnableName[0]) {
          if (typeof Data.Enemy === 'undefined') {
            // 强行统一键
            Data.Enemy = Data[Datas]
          }
          return Data;
        }
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
        //ATK HP强制过滤
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
