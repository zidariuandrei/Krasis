import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('useCookie', () => ref('dark'))
vi.stubGlobal('useState', (_key: string, init: () => unknown) => ref(init()))

import ThemeToggle from '../../app/components/ThemeToggle.vue'

describe('ThemeToggle Component', () => {
  it('renders theme toggle button with accessible aria-label', () => {
    const wrapper = mount(ThemeToggle)
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-label')).toContain('Switch to light theme')
  })

  it('handles click event on button', async () => {
    const wrapper = mount(ThemeToggle)
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(button.exists()).toBe(true)
  })
})
