/**
 * ADIF Parser - 支持 UTF-8 字节长度的 ADIF 解析器
 * 基于 ArrayBuffer 实现，正确处理中文字符
 */

export class AdifParser {
  constructor(buffer) {
    this.buffer = buffer
    this.bytes = new Uint8Array(buffer)
    this.cursor = 0
    this.decoder = new TextDecoder('utf-8')
  }

  /**
   * 解析 ADIF 数据
   * @param {ArrayBuffer|string} data - ADIF 数据
   * @returns {SimpleAdif} 解析结果
   */
  static parseAdi(data) {
    let buffer
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer
    } else if (data instanceof ArrayBuffer) {
      buffer = data
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer
    } else {
      throw new Error('Invalid input type, expected string or ArrayBuffer')
    }
    return new AdifParser(buffer).parseTopLevel()
  }

  /**
   * 解析顶层结构
   */
  parseTopLevel() {
    const parsed = {}

    if (this.bytes.length === 0) {
      return parsed
    }

    // 检查是否有头部（不以 < 开头表示有头部文本）
    if (this.bytes[0] !== 60) {
      // 60 是 '<' 的 ASCII 码
      const header = {}
      header.text = this.parseHeaderText()

      while (this.cursor < this.bytes.length) {
        const endOfHeader = this.parseTagValue(header)
        if (endOfHeader) {
          break
        }
      }
      parsed.header = header
    }

    // 解析 QSO 记录
    const records = []
    while (this.cursor < this.bytes.length) {
      const record = this.parseRecord()
      if (Object.keys(record).length > 0) {
        records.push(record)
      }
    }

    if (records.length > 0) {
      parsed.records = records
    }

    return parsed
  }

  /**
   * 解析头部文本（第一个 < 之前的所有内容）
   */
  parseHeaderText() {
    const startTag = this.findByte(60, this.cursor) // 60 = '<'
    const textBytes = this.bytes.slice(this.cursor, startTag)
    this.cursor = startTag
    return this.decoder.decode(textBytes).trim()
  }

  /**
   * 解析一条记录
   */
  parseRecord() {
    const record = {}
    while (this.cursor < this.bytes.length) {
      const endOfRecord = this.parseTagValue(record)
      if (endOfRecord) {
        break
      }
    }
    return record
  }

  /**
   * 解析标签和值
   * @returns {boolean} 是否到达记录/头部结束
   */
  parseTagValue(record) {
    // 查找标签开始
    const startTag = this.findByte(60, this.cursor) // 60 = '<'
    if (startTag === -1) {
      this.cursor = this.bytes.length
      return true
    }

    // 查找标签结束
    const endTag = this.findByte(62, startTag) // 62 = '>'
    if (endTag === -1) {
      this.cursor = this.bytes.length
      return true
    }

    // 解析标签内容
    const tagBytes = this.bytes.slice(startTag + 1, endTag)
    const tagContent = this.decoder.decode(tagBytes)
    const tagParts = tagContent.split(':')

    const tagName = tagParts[0].toLowerCase()

    // 处理结束标记
    if (tagName === 'eor' || tagName === 'eoh') {
      this.cursor = endTag + 1
      return true
    }

    // 处理特殊情况：APP_LoTW_EOF
    if (tagContent === 'APP_LoTW_EOF') {
      this.cursor = endTag + 1
      return true
    }

    // 检查标签格式
    if (tagParts.length < 2) {
      throw new Error(
        `Encountered field tag without enough parts near byte ${startTag}: ${tagContent.substring(0, 80)}`
      )
    }

    // 解析长度（字节长度）
    const width = parseInt(tagParts[1], 10)
    if (isNaN(width)) {
      throw new Error(`Invalid field width near byte ${startTag}: ${tagContent}`)
    }

    // 按字节长度提取值
    const valueStart = endTag + 1
    const valueBytes = this.bytes.slice(valueStart, valueStart + width)
    const value = this.decoder.decode(valueBytes)

    record[tagName] = value
    this.cursor = valueStart + width

    return false
  }

  /**
   * 在字节数组中查找指定字节
   * @param {number} byte - 要查找的字节值
   * @param {number} start - 开始位置
   * @returns {number} 找到的位置，-1 表示未找到
   */
  findByte(byte, start) {
    for (let i = start; i < this.bytes.length; i++) {
      if (this.bytes[i] === byte) {
        return i
      }
    }
    return -1
  }
}

/**
 * ADIF 格式化器 - 将对象格式化为 ADIF 字符串
 */
export class AdifFormatter {
  constructor(obj) {
    this.obj = obj
  }

  /**
   * 格式化对象为 ADIF 字符串
   * @param {Object} obj - 要格式化的对象
   * @returns {string} ADIF 字符串
   */
  static formatAdi(obj) {
    return new AdifFormatter(obj).format()
  }

  /**
   * 执行格式化
   */
  format() {
    let buffer = ''

    // 格式化头部（每个字段换行）
    if (this.obj.header !== undefined) {
      // header.text 如果是空字符串则不输出
      if (this.obj.header.text) {
        buffer += this.obj.header.text + '\n'
      }
      const restOfHeader = { ...this.obj.header }
      delete restOfHeader.text
      buffer += AdifFormatter.formatHeaderTags(restOfHeader)
      buffer += '<EOH>\n'
    }

    // 格式化记录（每条记录一行，不换行）
    if (!this.obj.records) {
      return AdifFormatter.prepReturn(buffer)
    }

    for (const rec of this.obj.records) {
      buffer += AdifFormatter.formatRecordTags(rec)
      buffer += '<EOR>\n'
    }

    return AdifFormatter.prepReturn(buffer)
  }

  /**
   * 格式化头部标签（每个字段换行）
   */
  static formatHeaderTags(obj) {
    const encoder = new TextEncoder()
    let buffer = ''

    for (const [key, value] of Object.entries(obj)) {
      const width = encoder.encode(String(value)).byteLength
      buffer += `<${key.toUpperCase()}:${width}>${value}\n`
    }

    return buffer
  }

  /**
   * 格式化记录标签（所有字段在一行）
   */
  static formatRecordTags(obj) {
    const encoder = new TextEncoder()
    let buffer = ''

    for (const [key, value] of Object.entries(obj)) {
      const width = encoder.encode(String(value)).byteLength
      buffer += `<${key.toUpperCase()}:${width}>${value} `
    }

    // 去掉最后一个空格
    return buffer.trimEnd() + ' '
  }

  /**
   * 准备返回结果
   */
  static prepReturn(buffer) {
    buffer = buffer.trim()
    if (buffer.length === 0) {
      return buffer
    }
    return buffer + '\n'
  }
}

/**
 * 简单的 ADIF 数据结构
 */
export class SimpleAdif {
  constructor() {
    this.header = undefined
    this.records = undefined
  }
}
