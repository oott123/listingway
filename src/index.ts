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

document.querySelector('[data-close]')?.addEventListener('click', () => {
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
      'file-modified': new Date(a.dataset.fileModTime!).toLocaleString(),
    },
    a,
  )
}

function downloadFile(url: string, fileName: string) {
  const progress = document.querySelector('[data-download-progress]') as HTMLProgressElement
  return (async () => {
    const handle = await window.showSaveFilePicker({ suggestedName: fileName })
    await turboDownload(url, fileName, 4, 8 * 1024 * 1024, handle, (rate) => {
      progress.value = rate * 100
    })
  })()
}

document.querySelector('[data-download-accelerated]')?.addEventListener('click', (e) => {
  e.preventDefault()
  const closest = (e.target as HTMLElement).closest('[data-download-accelerated]') as HTMLButtonElement
  const url = closest.getAttribute('data-file-url')
  const fileName = closest.getAttribute('data-file-name')
  if (url && fileName) {
    const progress = document.querySelector('[data-download-progress]') as HTMLProgressElement
    progress.classList.remove('hidden')
    closest.style.display = 'none'
    void downloadFile(url, fileName).then(() => {
      progress.classList.add('hidden')
      progress.value = 0
      const success = document.querySelector('[data-success]') as HTMLButtonElement
      success?.classList.remove('hidden')
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

if ('storage' in navigator && 'showSaveFilePicker' in window) {
  document.querySelector('html')?.classList.add('storage-enabled')
}
