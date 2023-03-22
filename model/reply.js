// 消息回复处理模块 提供一些消息、转发消息加工以及消息分割等方法
import Common from "../../../lib/common/common.js";

export default class Reply {

  constructor (e) {
    this.e = e
  }

  // 处理长消息组并进行转发消息智能断句
  async replyMessageArray(MessageArray, quote = false, data = {}){
    let MsgArray = []
    let MsgArrayElement = ''
    let i = 1
    let result
    for (let messageArrayElement of MessageArray) {
      if (MsgArray.length >= 95){
        // 栈内消息大于95重置栈
        MsgArray.push(`第${i.toString()}页...未完待续`)
        result = await this.replyByForwardMsg(MsgArray)
        i++
        MsgArray = []
      }
      if (typeof messageArrayElement !== 'string'){
        if (MsgArrayElement){
          // 消息移入栈
          MsgArray.push(MsgArrayElement)
          MsgArrayElement = ''
        }
        MsgArray.push(messageArrayElement)
      } else {
        if (MsgArrayElement && MsgArrayElement.length < 100){
          // 消息元素合并
          MsgArrayElement = MsgArrayElement +'\n'+ messageArrayElement
        }else if(!MsgArrayElement){
          // 消息元素取代
          MsgArrayElement = messageArrayElement
        }else {
          // 消息压栈
          MsgArray.push(MsgArrayElement)
          MsgArrayElement = messageArrayElement
        }
      }
    }

    if (MsgArrayElement) {
      MsgArray.push(MsgArrayElement)
      MsgArray.push(`第${i.toString()}页，共${i.toString()}页`)
    }
    if (MsgArray.length){ result = await this.replyByForwardMsg(MsgArray)}
    return result
  }

  // 将组消息处理成转发消息
  async replyByForwardMsg(MsgArray){
    return await Common.makeForwardMsg(this.e, MsgArray, '请点击查看内容')
  }
}

