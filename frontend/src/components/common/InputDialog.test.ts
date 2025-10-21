import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import InputDialog from './InputDialog.vue'

describe('InputDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Test Dialog',
    message: 'Enter a value',
    placeholder: 'test-input',
    confirmText: 'Create',
    cancelText: 'Cancel'
  }

  let mountTarget: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    // Create a target for Teleport
    mountTarget = document.createElement('div')
    mountTarget.id = 'modal-root'
    document.body.appendChild(mountTarget)
  })

  afterEach(() => {
    // Clean up after each test
    if (mountTarget && document.body.contains(mountTarget)) {
      document.body.removeChild(mountTarget)
    }
  })

  it('should render when isOpen is true', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.modal-overlay')).toBeTruthy()
    expect(document.body.querySelector('.modal-title')?.textContent).toBe('Test Dialog')
    expect(document.body.querySelector('.modal-message')?.textContent).toBe('Enter a value')
    
    wrapper.unmount()
  })

  it('should not render when isOpen is false', async () => {
    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        isOpen: false
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.modal-overlay')).toBeFalsy()
    wrapper.unmount()
  })

  it('should emit confirm event with input value when confirm button is clicked', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    // Set value using component's data
    const instance = wrapper.vm as any
    instance.inputValue = 'test-value'

    await wrapper.vm.$nextTick()

    // Trigger confirm
    instance.handleConfirm()

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['test-value'])
    wrapper.unmount()
  })

  it('should emit cancel event when cancel is triggered', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    // Trigger cancel
    const instance = wrapper.vm as any
    instance.handleCancel()

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('cancel')).toBeTruthy()
    wrapper.unmount()
  })

  it('should disable confirm button when input is empty', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const buttons = document.body.querySelectorAll('.btn')
    const confirmButton = Array.from(buttons).find(btn => btn.textContent?.includes('Create')) as HTMLButtonElement

    expect(confirmButton?.disabled).toBe(true)
    wrapper.unmount()
  })

  it('should enable confirm button when input has value', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    // Set value
    const instance = wrapper.vm as any
    instance.inputValue = 'test-value'

    await wrapper.vm.$nextTick()

    const buttons = document.body.querySelectorAll('.btn')
    const confirmButton = Array.from(buttons).find(btn => btn.textContent?.includes('Create')) as HTMLButtonElement

    expect(confirmButton?.disabled).toBe(false)
    wrapper.unmount()
  })

  it('should validate input when validator is provided', async () => {
    const validator = vi.fn((value: string) => {
      if (value.includes('invalid')) {
        return 'Invalid value'
      }
      return null
    })

    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        validator
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    // Set invalid value
    const instance = wrapper.vm as any
    instance.inputValue = 'invalid-value'

    await wrapper.vm.$nextTick()

    // Try to confirm
    instance.handleConfirm()

    await wrapper.vm.$nextTick()

    expect(validator).toHaveBeenCalledWith('invalid-value')
    expect(wrapper.emitted('confirm')).toBeFalsy()
    expect(instance.errorMessage).toBe('Invalid value')
    wrapper.unmount()
  })

  it('should emit confirm when validation passes', async () => {
    const validator = vi.fn(() => null)

    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        validator
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    // Set valid value
    const instance = wrapper.vm as any
    instance.inputValue = 'valid-value'

    await wrapper.vm.$nextTick()

    // Confirm
    instance.handleConfirm()

    await wrapper.vm.$nextTick()

    expect(validator).toHaveBeenCalledWith('valid-value')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['valid-value'])
    wrapper.unmount()
  })

  it('should use custom placeholder', async () => {
    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        placeholder: 'custom-placeholder'
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const input = document.body.querySelector('.modal-input') as HTMLInputElement
    expect(input?.placeholder).toBe('custom-placeholder')
    wrapper.unmount()
  })

  it('should use default value', async () => {
    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        defaultValue: 'initial-value'
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const instance = wrapper.vm as any
    expect(instance.inputValue).toBe('initial-value')
    wrapper.unmount()
  })

  it('should clear input value on cancel', async () => {
    const wrapper = mount(InputDialog, {
      props: {
        ...defaultProps,
        defaultValue: 'default'
      },
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const instance = wrapper.vm as any
    instance.inputValue = 'changed-value'

    await wrapper.vm.$nextTick()

    // Cancel
    instance.handleCancel()

    await wrapper.vm.$nextTick()

    expect(instance.inputValue).toBe('default')
    wrapper.unmount()
  })

  it('should not emit confirm when input is empty', async () => {
    const wrapper = mount(InputDialog, {
      props: defaultProps,
      attachTo: document.body
    })

    await wrapper.vm.$nextTick()

    const instance = wrapper.vm as any
    instance.inputValue = ''

    await wrapper.vm.$nextTick()

    instance.handleConfirm()

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('confirm')).toBeFalsy()
    wrapper.unmount()
  })
})
