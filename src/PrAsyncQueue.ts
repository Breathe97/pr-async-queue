interface PrAsyncQueueItem {
  key: string
  func: () => Promise<any>
  describe?: string
  timeout: number
  resolve: (value: unknown) => any
  reject: (reason?: any) => any
}

interface Options {
  key?: string
  timeout?: number
  describe?: string
}

export class PrAsyncQueue {
  queue: PrAsyncQueueItem[] = []

  timer = 0
  activeIndex = 0

  activePromise: PrAsyncQueueItem | undefined

  options = {
    timeout: 0
  }

  constructor(options: Options = {}) {
    this.options = { timeout: 0, ...options }
  }

  /**
   * 添加
   * @param func 待执行函数
   * @returns 待执行函数结果
   */
  add = (func: () => Promise<unknown>, options: Options = {}) => {
    return new Promise(async (resolve, reject) => {
      const timeout = options.timeout || this.options.timeout
      const key = options.key || this.#createKey()
      const describe = options.describe || ''
      // 判断是否已经存在该事件
      {
        const index = this.queue.findIndex((item) => item.key === key)
        if (index !== -1) return reject(`${key} is exist.`)
      }

      const item: PrAsyncQueueItem = { key, func, describe, timeout, resolve, reject }
      this.queue.unshift(item)

      // console.log('\x1b[38;2;0;151;255m%c%s\x1b[0m', 'color:#0097ff;', `------->Breathe: promiseQueue add:${key}`, item)
      // 如果当前没有等待事件
      if (!this.activePromise) {
        this.#emitNext()
      }
    })
  }

  /**
   * 清除全部事件
   */
  clear = () => {
    this.queue = []
    clearTimeout(this.timer)
  }

  #createKey = () => {
    this.activeIndex = this.activeIndex + 1
    return `${this.activeIndex}`
  }

  /**
   * 移除事件
   * @param key
   */
  #remove = (key: string) => {
    const index = this.queue.findIndex((item) => item.key === key)
    this.queue.splice(index, 1)
  }

  // 触发事件
  #emitNext = async () => {
    const length = this.queue.length
    if (length === 0) return
    const index = length - 1
    const info = this.queue[index]
    this.activePromise = info
    const { key, func, resolve, reject, timeout } = this.activePromise

    if (timeout) {
      // 设置超时
      this.timer = window.setTimeout(() => {
        reject(`pr-async-queue: ${key} is timeout.`)
        this.#emitNext() // 再次触发
      }, timeout)
    }

    await func()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        // console.log('\x1b[38;2;0;151;255m%c%s\x1b[0m', 'color:#0097ff;', `------->Breathe: promiseQueue finally:${key}`, this.activePromise)
        // 移除
        {
          clearTimeout(this.timer)
          this.activePromise = undefined
          this.#remove(key)
        }
        this.#emitNext() // 再次触发
      })
  }
}
