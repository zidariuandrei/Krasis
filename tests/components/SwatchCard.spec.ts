import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SwatchCard from '../../app/components/SwatchCard.vue'

describe('SwatchCard Component', () => {
  it('renders role name and upper-cased hex code', () => {
    const wrapper = mount(SwatchCard, {
      props: {
        role: 'primary',
        hex: '#2e63a5',
      },
    })
    expect(wrapper.text()).toContain('primary')
    expect(wrapper.text()).toContain('#2E63A5')
  })

  it('applies inline background color matching hex prop', () => {
    const wrapper = mount(SwatchCard, {
      props: {
        role: 'accent',
        hex: '#cf9092',
      },
    })
    const cardEl = wrapper.element as HTMLElement
    expect(cardEl.style.backgroundColor).toBe('rgb(207, 144, 146)')
  })
})
