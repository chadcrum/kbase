import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FileExplorerToolbar from './FileExplorerToolbar.vue'
import { useVaultStore } from '@/stores/vault'
import InputDialog from '@/components/common/InputDialog.vue'

// Mock the vault store
vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

describe('FileExplorerToolbar', () => {
  let mockVaultStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockVaultStore = {
      createDirectory: vi.fn().mockResolvedValue(true),
      createNote: vi.fn().mockResolvedValue(true)
    }
    
    vi.mocked(useVaultStore).mockReturnValue(mockVaultStore)
  })

  it('should render toolbar with New Folder, New File, and Refresh buttons', () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: {
        isLoading: false
      }
    })

    const buttons = wrapper.findAll('.toolbar-button')
    expect(buttons).toHaveLength(3)
    
    // All buttons are icon-only, verify by checking titles
    expect(buttons[0].attributes('title')).toBe('New Folder')
    expect(buttons[1].attributes('title')).toBe('New File')
    expect(buttons[2].attributes('title')).toBe('Refresh')
    
    // Third button is refresh button
    expect(buttons[2].classes()).toContain('refresh-button')
  })

  it('should open folder dialog when New Folder button is clicked', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    const newFolderButton = wrapper.findAll('.toolbar-button')[0]
    await newFolderButton.trigger('click')

    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    expect(folderDialog.props('isOpen')).toBe(true)
    expect(folderDialog.props('title')).toBe('Create New Folder')
  })

  it('should open file dialog when New File button is clicked', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    const newFileButton = wrapper.findAll('.toolbar-button')[1]
    await newFileButton.trigger('click')

    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    expect(fileDialog.props('isOpen')).toBe(true)
    expect(fileDialog.props('title')).toBe('Create New File')
  })

  it('should emit refresh event when refresh button is clicked', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    const refreshButton = wrapper.findAll('.toolbar-button')[2]
    await refreshButton.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('should disable refresh button when loading', () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: true }
    })

    const refreshButton = wrapper.findAll('.toolbar-button')[2]
    expect(refreshButton.attributes('disabled')).toBeDefined()
  })

  it('should create folder when folder dialog confirms', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open folder dialog
    const newFolderButton = wrapper.findAll('.toolbar-button')[0]
    await newFolderButton.trigger('click')

    // Emit confirm event with folder name
    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    await folderDialog.vm.$emit('confirm', 'new-folder')

    expect(mockVaultStore.createDirectory).toHaveBeenCalledWith('new-folder')
  })

  it('should create file when file dialog confirms', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open file dialog
    const newFileButton = wrapper.findAll('.toolbar-button')[1]
    await newFileButton.trigger('click')

    // Emit confirm event with file name
    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    await fileDialog.vm.$emit('confirm', 'new-file.md')

    expect(mockVaultStore.createNote).toHaveBeenCalledWith('new-file.md')
  })

  it('should close folder dialog on cancel', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open folder dialog
    const newFolderButton = wrapper.findAll('.toolbar-button')[0]
    await newFolderButton.trigger('click')

    // Emit cancel event
    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    await folderDialog.vm.$emit('cancel')

    await wrapper.vm.$nextTick()

    expect(folderDialog.props('isOpen')).toBe(false)
  })

  it('should close file dialog on cancel', async () => {
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open file dialog
    const newFileButton = wrapper.findAll('.toolbar-button')[1]
    await newFileButton.trigger('click')

    // Emit cancel event
    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    await fileDialog.vm.$emit('cancel')

    await wrapper.vm.$nextTick()

    expect(fileDialog.props('isOpen')).toBe(false)
  })

  describe('validateFolderName', () => {
    it('should reject empty folder name', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const folderDialog = wrapper.findAllComponents(InputDialog)[0]
      const validator = folderDialog.props('validator')

      expect(validator('')).toBe('Folder name cannot be empty')
      expect(validator('   ')).toBe('Folder name cannot be empty')
    })

    it('should reject folder name with path separators', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const folderDialog = wrapper.findAllComponents(InputDialog)[0]
      const validator = folderDialog.props('validator')

      expect(validator('folder/name')).toBe('Folder name cannot contain path separators or ..')
      expect(validator('folder\\name')).toBe('Folder name cannot contain path separators or ..')
      expect(validator('../folder')).toBe('Folder name cannot contain path separators or ..')
    })

    it('should reject folder name with invalid characters', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const folderDialog = wrapper.findAllComponents(InputDialog)[0]
      const validator = folderDialog.props('validator')

      expect(validator('folder<name')).toBe('Folder name contains invalid characters')
      expect(validator('folder>name')).toBe('Folder name contains invalid characters')
      expect(validator('folder:name')).toBe('Folder name contains invalid characters')
      expect(validator('folder|name')).toBe('Folder name contains invalid characters')
    })

    it('should reject reserved folder names', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const folderDialog = wrapper.findAllComponents(InputDialog)[0]
      const validator = folderDialog.props('validator')

      expect(validator('CON')).toBe('This is a reserved folder name')
      expect(validator('PRN')).toBe('This is a reserved folder name')
      expect(validator('AUX')).toBe('This is a reserved folder name')
    })

    it('should accept valid folder name', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const folderDialog = wrapper.findAllComponents(InputDialog)[0]
      const validator = folderDialog.props('validator')

      expect(validator('my-folder')).toBeNull()
      expect(validator('folder_name')).toBeNull()
      expect(validator('Folder123')).toBeNull()
    })
  })

  describe('validateFileName', () => {
    it('should reject empty file name', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('')).toBe('File name cannot be empty')
      expect(validator('   ')).toBe('File name cannot be empty')
    })

    it('should reject file name with path separators', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('file/name.md')).toBe('File name cannot contain path separators or ..')
      expect(validator('file\\name.md')).toBe('File name cannot contain path separators or ..')
      expect(validator('../file.md')).toBe('File name cannot contain path separators or ..')
    })

    it('should reject file name with invalid characters', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('file<name.md')).toBe('File name contains invalid characters')
      expect(validator('file>name.md')).toBe('File name contains invalid characters')
      expect(validator('file:name.md')).toBe('File name contains invalid characters')
    })

    it('should reject file name without .md extension', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('file.txt')).toBe('File name must end with .md extension')
      expect(validator('filename')).toBe('File name must end with .md extension')
    })

    it('should reject reserved file names', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('CON.md')).toBe('This is a reserved file name')
      expect(validator('PRN.md')).toBe('This is a reserved file name')
    })

    it('should accept valid file name', () => {
      const wrapper = mount(FileExplorerToolbar, {
        props: { isLoading: false }
      })
      const fileDialog = wrapper.findAllComponents(InputDialog)[1]
      const validator = fileDialog.props('validator')

      expect(validator('my-file.md')).toBeNull()
      expect(validator('file_name.md')).toBeNull()
      expect(validator('File123.md')).toBeNull()
    })
  })

  it('should close dialog on successful folder creation', async () => {
    mockVaultStore.createDirectory.mockResolvedValue(true)
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open and confirm folder dialog
    const newFolderButton = wrapper.findAll('.toolbar-button')[0]
    await newFolderButton.trigger('click')

    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    await folderDialog.vm.$emit('confirm', 'new-folder')

    await wrapper.vm.$nextTick()

    expect(folderDialog.props('isOpen')).toBe(false)
  })

  it('should not close dialog on failed folder creation', async () => {
    mockVaultStore.createDirectory.mockResolvedValue(false)
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open and confirm folder dialog
    const newFolderButton = wrapper.findAll('.toolbar-button')[0]
    await newFolderButton.trigger('click')

    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    await folderDialog.vm.$emit('confirm', 'new-folder')

    await wrapper.vm.$nextTick()

    expect(folderDialog.props('isOpen')).toBe(true)
  })

  it('should close dialog on successful file creation', async () => {
    mockVaultStore.createNote.mockResolvedValue(true)
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open and confirm file dialog
    const newFileButton = wrapper.findAll('.toolbar-button')[1]
    await newFileButton.trigger('click')

    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    await fileDialog.vm.$emit('confirm', 'new-file.md')

    await wrapper.vm.$nextTick()

    expect(fileDialog.props('isOpen')).toBe(false)
  })

  it('should not close dialog on failed file creation', async () => {
    mockVaultStore.createNote.mockResolvedValue(false)
    const wrapper = mount(FileExplorerToolbar, {
      props: { isLoading: false }
    })

    // Open and confirm file dialog
    const newFileButton = wrapper.findAll('.toolbar-button')[1]
    await newFileButton.trigger('click')

    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    await fileDialog.vm.$emit('confirm', 'new-file.md')

    await wrapper.vm.$nextTick()

    expect(fileDialog.props('isOpen')).toBe(true)
  })
})

