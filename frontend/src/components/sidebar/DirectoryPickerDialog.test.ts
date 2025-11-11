import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DirectoryPickerDialog from './DirectoryPickerDialog.vue'

const mockSortedFileTree = {
  name: '',
  path: '/',
  type: 'directory' as const,
  children: [
    {
      name: 'folder-a',
      path: '/folder-a',
      type: 'directory' as const,
      children: [
        {
          name: 'nested',
          path: '/folder-a/nested',
          type: 'directory' as const,
          children: []
        }
      ]
    },
    {
      name: 'folder-b',
      path: '/folder-b',
      type: 'directory' as const,
      children: []
    }
  ]
}

const useVaultStoreMock = vi.fn(() => ({
  sortedFileTree: mockSortedFileTree
}))

vi.mock('@/stores/vault', () => ({
  useVaultStore: useVaultStoreMock
}))

describe('DirectoryPickerDialog', () => {
  const mountComponent = (props: Record<string, unknown> = {}) => {
    return mount(DirectoryPickerDialog, {
      props: {
        isOpen: true,
        currentPath: '/folder-a/nested/note.md',
        initialDirectory: '/folder-a',
        ...props
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false
        }
      }
    })
  }

  beforeEach(() => {
    useVaultStoreMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders directories and allows selection', async () => {
    const wrapper = mountComponent()

    expect(wrapper.findAll('.directory-row')).toHaveLength(3) // root + 2 children

    const folderBRow = wrapper.findAll('.directory-row').find(row => row.text().includes('folder-b'))
    expect(folderBRow).toBeDefined()

    await folderBRow?.trigger('click')
    expect(folderBRow?.classes()).toContain('is-selected')

    await wrapper.find('.btn-primary').trigger('click')

    const confirmEvents = wrapper.emitted('confirm')
    expect(confirmEvents).toBeTruthy()
    expect(confirmEvents?.[0]).toEqual(['/folder-b'])
  })

  it('disables disallowed destinations and prevents confirmation', async () => {
    const wrapper = mountComponent({
      disallowedPaths: ['/folder-a', '/folder-a/nested']
    })

    const folderARow = wrapper.findAll('.directory-row').find(row => row.text().includes('folder-a'))
    expect(folderARow).toBeDefined()
    expect(folderARow?.classes()).toContain('is-disabled')

    await folderARow?.trigger('click')
    expect(folderARow?.classes()).not.toContain('is-selected')

    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('emits cancel when cancel button clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.find('.btn-secondary').trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})


