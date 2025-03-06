import plugin from "../../../lib/plugins/plugin.js";
import fs from "node:fs";
import { pluginResources } from "../model/path.js";
import YAML from "yaml";

const CommonData =  YAML.parse(fs.readFileSync(`${pluginResources}/enemy/Common.yaml`, "utf-8"));
const OtherName = YAML.parse(fs.readFileSync(`${pluginResources}/enemy/OtherName.yaml`, "utf-8"));
const EnemyData = await YAML.parse(fs.readFileSync(`${pluginResources}/enemy/Enemy.yaml`, "utf-8"));
const AttrData = JSON.parse(fs.readFileSync(`${pluginResources}/enemy/EnemyOtherAttributionData.json`, "utf-8"));

export class EnemyValue extends plugin {
  constructor() {
    super({
      name: "Atlas原魔属性计算",
      dsc: "查询原魔生命值和攻击力",
      event: "message",
      priority: 600,
      rule: [
        {
          reg: "^[#/](原魔).*(生命值|攻击力).*",
          fnc: "query"
        }
      ]
    });
  }

  async query() {
    if (this.e.user_id === Bot.uin) {
      return false
    }
    let text = this.e.msg.toString();

    // 取计算类型 返回HP或者ATK
    let type = await this.getType(text);
    let subtype

    // 取原魔名
    let enemy = await this.regEnemy(text);
    if (!enemy) { return false }

    // 取预设等级 修饰因子不提供时以这个为准
    let level = await this.getLevel(text);

    // 取修饰因子 返回修饰因子对象数组
    let feas = await this.regEnemyOtherData(text, type);
    if (!feas.length) {
      feas = [{
        "Factors": "普通",
        "ATKRatioValue": 1,
        "HPRatioValue": 1
      }]
    }

    // 修饰符置空
    let feature = ''

    let value = 1

    if (!level) {
      // 未获取等级 从修饰因子里面获取
      for (let fea of feas){
        if (typeof fea.Level === 'number') level = Number(fea.Level);
      }
      if (!level) { level = 90 }
    }

    let buffs = await this.getRatioValue(feas,type,enemy.Enemy)

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

    let beilv = 1
    let StrBuffs = ['修饰因子:']
    for (let buff of buffs) {
      beilv = beilv * buff.value
      StrBuffs.push(`\n·${buff.Factors}(${buff.value}倍${(type === 'HP')? '生命值':'攻击力'})`)
    }

    // 消息处理
    let massage = [
      `你查询的${level}级${enemy.Enemy}${(type === 'HP')? '生命值':'攻击力'}为`,
      `${Number(CurvesType).toFixed(1)}*${Number(value).toFixed(2)}*${Number(beilv).toFixed(2)}=`,
      `${(Number(CurvesType) * Number(value) * ((isNaN(beilv))? 1:beilv)).toFixed(1)}\n`,
      ...StrBuffs
    ]
    this.reply(massage)
    return true
  }

  async getRatioValue(feas, type, enemy){
    let buffs = []
    b:
    for (let fea of feas){
      let ValueObject = fea[`${type}RatioValue`]
      if (typeof ValueObject === "number") {
        buffs.push({
          Factors: Array.isArray(fea.Factors)? fea.Factors[0]:fea.Factors,
          value: Number(ValueObject)
        })
      } else {
        for (let valueObjectElement of ValueObject) {
          if (valueObjectElement.enemy.includes(enemy) || !valueObjectElement.enemy.length) {
            buffs.push({
              Factors: Array.isArray(fea.Factors)? fea.Factors[0]:fea.Factors,
              value: Number(valueObjectElement.value)
            })
            continue b
          }
        }
      }
    }
    return buffs
  }

  async getCurvesType(level, type) {
    level = Number(level)

    for (let Data in CommonData) {
      if (Number(CommonData[Data].Level) === level) {
        return CommonData[Data][type]
      }
    }
    return false
  }

  // 匹配原魔
  async regEnemy(text) {
    // 先匹配别名
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

  // 匹配修饰因子数组
  async regEnemyOtherData(text, type) {
    let feas = []
    a:
    for (let key of Object.keys(AttrData)) {
      if (key.includes(type)) {
        //ATK HP强制过滤
        for (let fea of AttrData[key]) {
          switch (typeof fea.Factors) {
            case "string":
              if (text.includes(fea.Factors)) {
                feas.push(fea)
                continue a
              }
              break
            default:
              for (let words of fea.Factors) {
                if (text.includes(words)) {
                  feas.push(fea)
                  continue a
                }
              }
          }
        }
      }
    }
    return feas;
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
