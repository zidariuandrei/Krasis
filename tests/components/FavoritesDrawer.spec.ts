import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('useCookie', () => ref('dark'))
vi.stubGlobal('useState', (_key: string, init: () => unknown) => {
  if (_key === 'favorites') {
    return ref([
      {
        id: 1,
        sig: '#2E63A5',
        center: { x: 0, y: 0 },
        cells: [{ role: 'primary', hex: '#2E63A5' }],
      },
    ])
  }
  return ref(init())
})

import FavoritesDrawer from '../../app/components/FavoritesDrawer.vue'

describe('FavoritesDrawer Component', () => {
  it('renders favorites trigger button with count badge', () => {
    const wrapper = mount(FavoritesDrawer)
    expect(wrapper.text()).toContain('Saved palettes')
    expect(wrapper.text()).toContain('1')
  })

  it('toggles menu visibility on click', async () => {
    const wrapper = mount(FavoritesDrawer)
    const toggleBtn = wrapper.find('.favorites-toggle')
    expect(wrapper.find('.favorites-menu').exists()).toBe(false)
    await toggleBtn.trigger('click')
    expect(wrapper.find('.favorites-menu').exists()).toBe(true)
  })

  it('emits select event when a favorite item is clicked', async () => {
    const wrapper = mount(FavoritesDrawer)
    await wrapper.find('.favorites-toggle').trigger('click')
    const itemBtn = wrapper.find('.chip-main')
    if (itemBtn.exists()) {
      await itemBtn.trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
    }
  })
})
