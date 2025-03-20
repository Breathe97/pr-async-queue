interface PrAsyncQueueItem {
  key: string
  func: () => Promise<any>
  resolve: (value: unknown) => any
  reject: (reason?: any) => any
  timeout: number
}

interface Options {
  key?: string
  timeout?: number
}

export class PrAsyncQueue {
  queue: PrAsyncQueueItem[] = []

  timer = 0
  activeIndex = 0

  activePromise: PrAsyncQueueItem | undefined

  options = {
    timeout: 6 * 1000
  }

  constructor(options: Options = {}) {
    this.options = { ...options, timeout: 6 * 1000 }
  }

  #createKey = () => {
    this.activeIndex = this.activeIndex + 1
    return `${this.activeIndex}`
  }

  /**
   * 添加
   * @param func 待执行函数
   * @returns 待执行函数结果
   */
  add = (func: () => Promise<any>, options: Options = {}) => {
    return new Promise(async (resolve, reject) => {
      const timeout = options.timeout || this.options.timeout
      const key = options.key || this.#createKey()
      console.log('\x1b[38;2;0;151;255m%c%s\x1b[0m', 'color:#0097ff;', `------->Breathe: this.queue`, this.queue)
      // 判断是否已经存在该事件
      {
        const index = this.queue.findIndex((item) => item.key === key)
        if (index !== -1) return reject(`${key} is exist.`)
      }

      const item: PrAsyncQueueItem = { key, func, resolve, reject, timeout }
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

    // 设置超时
    this.timer = setTimeout(() => {
      reject(new Error(`func:${key} is timeout.`))
      this.#emitNext() // 再次触发
    }, timeout)

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
