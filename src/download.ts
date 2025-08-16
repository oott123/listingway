/**
 * 多线程 + 流式 + 单线程保存 + 重试 的下载器
 *
 * @param {string} url 下载地址
 * @param {string} fileName OPFS 保存文件名
 * @param {number} workerCount 并发 worker 数
 * @param {number} chunkSize 每块大小（字节）
 * @param {(progress: number, downloaded: number, total: number)=>void} onProgress 进度回调
 * @param {object} opts 可选项：
 *    { saveIntervalMs = 1000,
 *      maxRetries = 4,
 *      retryBaseMs = 500,
 *      retryJitterMs = 200,
 *      acceptRangesCheck = true }
 *
 * @returns {Promise<{ success: boolean, errors: Array<{chunkIndex:number, error:any}> }>}
 */

// 定义选项接口
interface DownloadOptions {
  saveIntervalMs?: number
  maxRetries?: number
  retryBaseMs?: number
  retryJitterMs?: number
  acceptRangesCheck?: boolean
}

// 定义错误接口
interface DownloadError {
  chunkIndex: number
  error: string
}

// 定义返回结果接口
interface DownloadResult {
  success: boolean
  errors: DownloadError[]
}

// 定义进度回调函数类型
type ProgressCallback = (progress: number, downloaded: number, total: number) => void

async function turboDownload(
  url: string,
  fileName: string,
  workerCount: number = 4,
  chunkSize: number = 8 * 1024 * 1024,
  fileHandle: FileSystemFileHandle,
  onProgress: ProgressCallback = () => {},
  opts: DownloadOptions = {},
): Promise<DownloadResult> {
  const saveIntervalMs = opts.saveIntervalMs ?? 1000
  const maxRetries = opts.maxRetries ?? 4
  const retryBaseMs = opts.retryBaseMs ?? 500
  const retryJitterMs = opts.retryJitterMs ?? 200
  const acceptRangesCheck = opts.acceptRangesCheck ?? true

  // HEAD 获取 totalSize
  const head = await fetch(url, { method: 'HEAD' })
  if (!head.ok) throw new Error(`HEAD 请求失败: ${head.status}`)
  const contentLength = head.headers.get('Content-Length')
  if (!contentLength) throw new Error('无法获得 Content-Length')
  const totalSize = parseInt(contentLength, 10)
  if (!Number.isFinite(totalSize)) throw new Error('无法获得 Content-Length')

  if (acceptRangesCheck) {
    const ar = head.headers.get('Accept-Ranges')
    if (ar && ar.toLowerCase() !== 'bytes') {
      console.warn('服务器 Accept-Ranges 头不是 bytes（或未返回），稍后会检查 206 响应')
    }
  }

  const totalChunks = Math.ceil(totalSize / chunkSize)
  const writable = await fileHandle.createWritable({ keepExistingData: true })
  if (typeof writable.truncate === 'function') {
    // 预先确保文件长度，便于写入
    await writable.truncate(totalSize)
  }

  // 初始回调
  onProgress(0, 0, totalSize)

  // 构建任务队列（只包含未完成 chunk 的索引）
  const tasks: number[] = []
  for (let i = 0; i < totalChunks; i++) tasks.push(i)

  let bytesWritten = 0

  // 重试计数器
  const retryCount = new Map<number, number>() // chunkIndex => attemptsUsed

  // 错误收集
  const errors: DownloadError[] = []

  // 从任务队列拿下一个任务（同步操作，JS 单线程下安全）
  function getNextTask(): number | null {
    return tasks.shift() ?? null
  }

  // 指数退避 + 抖动
  function sleepWithBackoff(attempt: number): Promise<void> {
    const base = retryBaseMs * 2 ** (attempt - 1)
    const jitter = Math.floor(Math.random() * retryJitterMs)
    return new Promise((r) => setTimeout(r, base + jitter))
  }

  // worker 实现
  async function workerMain(id: number): Promise<void> {
    while (true) {
      const chunkIndex = getNextTask()
      if (chunkIndex === null) break

      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize - 1, totalSize - 1)
      let attempt = (retryCount.get(chunkIndex) || 0) + 1
      retryCount.set(chunkIndex, attempt)

      let success = false
      // 为避免重复计数，全局已完成字节只在 chunk 完成时增加。
      // 这里维护 attempt 下载的临时字节数，用于 onProgress 的临时显示（不会累加到 downloadedBytesPersist，除非成功）
      let attemptBytes = 0

      while (attempt <= maxRetries && !success) {
        try {
          const resp = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } })
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          if (resp.status !== 206 && totalSize > chunkSize) {
            throw new Error(`服务器未返回 206 Partial Content（返回 ${resp.status}），无法安全分块下载`)
          }

          const reader = resp.body?.getReader()
          if (!reader) throw new Error('无法获取响应体读取器')

          let offset = start
          attemptBytes = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            // value 可能是 Uint8Array
            await writable.write({ type: 'write', position: offset, data: value })
            offset += value.length
            attemptBytes += value.length
            bytesWritten += value.length

            onProgress(bytesWritten / totalSize, bytesWritten, totalSize)
          }

          success = true
        } catch (err) {
          // 下载或写入出错：重试或记录错误
          console.warn(`chunk ${chunkIndex} 第 ${attempt} 次尝试失败:`, err)
          attempt++
          bytesWritten -= attemptBytes
          retryCount.set(chunkIndex, attempt - 1)
          if (attempt <= maxRetries) {
            await sleepWithBackoff(attempt - 1)
            // 继续重试（同一 chunk），注意：之前写入的部分会在下次重下时被覆盖
          } else {
            // 超过次数：记录错误（不会再重试）
            errors.push({ chunkIndex, error: String(err) })
            // 不把这个 chunk 标记为 done；保留 meta 以便下次人工或自动再试
            success = false
          }
        }
      } // end while attempts

      // 无论成功还是失败，继续领取下一个任务
    } // end while
  } // end workerMain

  // 启动 saver 与 workers
  const workerPromises: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    workerPromises.push(
      workerMain(i).catch((e) => {
        throw e
      }),
    )
  }

  // 等待所有 worker 结束
  await Promise.all(workerPromises)

  // 关闭 writable（flush）
  await writable.close()

  // 检查是否全部完成
  let allDone = true
  for (let i = 0; i < totalChunks; i++) {
    allDone = false
    break
  }

  return { success: allDone && errors.length === 0, errors }
}

export { turboDownload }
export type { DownloadOptions, DownloadError, DownloadResult, ProgressCallback }
