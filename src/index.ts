import { filesize } from 'filesize'
import { turboDownload } from './download.js'

function openDialog(data: Record<string, string>, a: HTMLAnchorElement) {
  const dialog = document.getElementById('file-dialog') as HTMLDialogElement
  const fills = dialog?.querySelectorAll('[data-fill]')

  fills?.forEach((fill) => {
    const value = fill.getAttribute('data-fill')
    if (value && data[value] != null) {
      fill.textContent = data[value]
    }
  })

  dialog.querySelectorAll('[data-file-url]').forEach((a_) => {
    if (a_.tagName === 'A') {
      ;(a_ as HTMLAnchorElement).href = a.href
    } else {
      a_.setAttribute('data-file-url', a.href)
      a_.setAttribute('data-file-name', data['file-name'])
      a_.setAttribute('data-file-size-bytes', data['file-size-bytes'])
    }
  })

  const url = new URL(location.href)
  const newSearch = new URLSearchParams(url.search)
  newSearch.set('file', data['file-name'])
  url.search = newSearch.toString()
  history.replaceState({}, '', url.toString())

  const downloadButton = dialog?.querySelector('[data-download-accelerated]') as HTMLButtonElement
  downloadButton?.style.removeProperty('display')
  const progress = dialog?.querySelector('[data-download-progress]') as HTMLProgressElement
  progress?.classList.add('hidden')
  const success = dialog?.querySelector('[data-success]') as HTMLButtonElement
  success?.classList.add('hidden')

  dialog?.showModal()
}

document.querySelector('#file-dialog [data-close]')?.addEventListener('click', () => {
  const url = new URL(location.href)
  url.searchParams.delete('file')
  history.replaceState({}, '', url.toString())

  const dialog = document.getElementById('file-dialog') as HTMLDialogElement
  dialog?.close()
})

function openFile(a: HTMLAnchorElement) {
  openDialog(
    {
      'file-name': a.dataset.fileName!,
      'file-size': filesize(Number(a.dataset.fileSize), { standard: 'iec' }),
      'file-size-bytes': a.dataset.fileSize!,
      'file-modified': new Date(a.dataset.fileModTime!).toLocaleString(),
    },
    a,
  )
}

async function getOpfsFileHandle(fileName: string) {
  const directory = await navigator.storage.getDirectory()
  const file = await directory.getFileHandle(fileName, { create: true })
  return file
}

async function getFileHandle(fileName: string) {
  if (!('showSaveFilePicker' in window)) {
    return { opfs: true, handle: await getOpfsFileHandle(fileName) }
  }
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: fileName })
    return { opfs: false, handle }
  } catch (e: any) {
    if ('name' in e && e.name === 'AbortError') {
      throw new Error('user aborted')
    }
    return { opfs: true, handle: await getOpfsFileHandle(fileName) }
  }
}

function downloadFile(url: string, fileName: string) {
  const progress = document.querySelector('[data-download-progress]') as HTMLProgressElement
  return (async () => {
    const { opfs, handle } = await getFileHandle(fileName)
    const start = Date.now()
    let fileSize = 0
    await turboDownload(url, fileName, 8, 1024 * 1024, handle, (rate, _, total) => {
      progress.value = rate * 100
      fileSize = total
    })
    const duration = Date.now() - start
    const speed = fileSize ? (fileSize / duration) * 1000 : 0
    console.log(`downloaded ${fileName} in ${duration}ms, ${speed.toFixed(2)} bytes/s`)
    if (opfs) {
      const blob = await handle.getFile()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      const dialog = document.querySelector('#delete-dialog') as HTMLDialogElement
      dialog.setAttribute('data-object-url', url.toString())
      dialog.setAttribute('data-opfs-file-name', fileName)
      dialog.showModal()
    }
    return { speed, duration }
  })()
}

document.querySelector('#delete-dialog button')?.addEventListener('click', () => {
  const url = document.querySelector('#delete-dialog')?.getAttribute('data-object-url')
  const fileName = document.querySelector('#delete-dialog')?.getAttribute('data-opfs-file-name')
  void (async () => {
    if (url && fileName) {
      URL.revokeObjectURL(url)
      const directory = await navigator.storage.getDirectory()
      await directory.removeEntry(fileName)
      const dialog = document.querySelector('#delete-dialog') as HTMLDialogElement
      dialog.close()
    }
  })()
})

document.querySelector('[data-download-accelerated]')?.addEventListener('click', (e) => {
  e.preventDefault()
  const closest = (e.target as HTMLElement).closest('[data-download-accelerated]') as HTMLButtonElement
  const url = closest.getAttribute('data-file-url')
  const fileName = closest.getAttribute('data-file-name')
  if (url && fileName) {
    const progress = document.querySelector('[data-download-progress]') as HTMLProgressElement
    progress.classList.remove('hidden')
    closest.style.display = 'none'
    void downloadFile(url, fileName)
      .then(({ speed, duration }) => {
        progress.classList.add('hidden')
        progress.value = 0
        const success = document.querySelector('[data-success]') as HTMLButtonElement
        success?.classList.remove('hidden')

        success.querySelector('span')!.textContent = `${filesize(speed)}/s, ${(duration / 1000).toFixed(1)} seconds`
      })
      .catch((e) => {
        console.error(e)
        progress.classList.add('hidden')
        progress.value = 0
        closest.style.removeProperty('display')
      })
  }
})

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const closest = target.closest('a[data-file-name]:not([data-is-directory])') as HTMLAnchorElement
  if (closest) {
    e.preventDefault()
    openFile(closest)
  }
})

const url = new URL(location.href)
const file = url.searchParams.get('file')
if (file) {
  const a = document.querySelector(`[data-file-name="${file}"]`) as HTMLAnchorElement
  if (a) {
    openFile(a)
  }
}

if ('storage' in navigator || 'showSaveFilePicker' in window) {
  document.querySelector('html')?.classList.add('storage-enabled')
}
