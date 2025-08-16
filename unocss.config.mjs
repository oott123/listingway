import { defineConfig } from 'unocss'
import presetWind4 from '@unocss/preset-wind4'
import { presetDaisy } from '@ameinhardt/unocss-preset-daisy'
import presetIcons from '@unocss/preset-icons'

export default defineConfig({
  content: {
    pipeline: {
      include: ['src/**/*.{js,ts}', 'index.html'],
    },
  },
  presets: [presetDaisy(), presetWind4(), presetIcons()],
})
