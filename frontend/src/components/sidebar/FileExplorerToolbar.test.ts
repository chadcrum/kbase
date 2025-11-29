import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FileExplorerToolbar from './FileExplorerToolbar.vue'
import { useVaultStore } from '@/stores/vault'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import InputDialog from '@/components/common/InputDialog.vue'

vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn()
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: vi.fn()
}))

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}))

describe('FileExplorerToolbar', () => {
  const openMenu = async (wrapper: ReturnType<typeof mountToolbar>) => {
    const trigger = wrapper.find('.toolbar-menu-trigger')
    expect(trigger.exists()).toBe(true)
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
  }

  const mountToolbar = (isLoading = false) =>
    mount(FileExplorerToolbar, {
      props: { isLoading }
    })

  type VaultStoreType = ReturnType<typeof useVaultStore>
  type AuthStoreType = ReturnType<typeof useAuthStore>
  type ThemeStoreType = ReturnType<typeof useThemeStore>

  type VaultStoreMock = {
    createDirectory: ReturnType<typeof vi.fn>
    createNote: ReturnType<typeof vi.fn>
    setSortBy: ReturnType<typeof vi.fn>
    toggleSortOrder: ReturnType<typeof vi.fn>
    toggleSortDirectoriesWithFiles: ReturnType<typeof vi.fn>
    collapseAll: ReturnType<typeof vi.fn>
    clearError: ReturnType<typeof vi.fn>
    sortBy: string
    sortOrder: string
    sortDirectoriesWithFiles: boolean
    hasExpandedPaths: boolean
    error: string | null
  }

  type AuthStoreMock = {
    logout: ReturnType<typeof vi.fn>
  }

  type ThemeStoreMock = {
    isDarkMode: boolean
    toggleTheme: ReturnType<typeof vi.fn>
  }

  let mockVaultStore: VaultStoreMock
  let mockAuthStore: AuthStoreMock
  let mockThemeStore: ThemeStoreMock

  beforeEach(() => {
    setActivePinia(createPinia())

    mockVaultStore = {
      createDirectory: vi.fn().mockResolvedValue(true),
      createNote: vi.fn().mockResolvedValue(true),
      setSortBy: vi.fn(),
      toggleSortOrder: vi.fn(),
      toggleSortDirectoriesWithFiles: vi.fn(),
      collapseAll: vi.fn(),
      clearError: vi.fn(),
      sortBy: 'name',
      sortOrder: 'asc',
      sortDirectoriesWithFiles: false,
      hasExpandedPaths: false,
      error: null
    }

    mockAuthStore = {
      logout: vi.fn()
    }

    mockThemeStore = {
      isDarkMode: false,
      toggleTheme: vi.fn()
    }

    vi.mocked(useVaultStore).mockReturnValue(mockVaultStore as unknown as VaultStoreType)
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore as unknown as AuthStoreType)
    vi.mocked(useThemeStore).mockReturnValue(mockThemeStore as unknown as ThemeStoreType)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a single toolbar menu trigger by default', () => {
    const wrapper = mountToolbar()

    expect(wrapper.find('.toolbar-menu-trigger').exists()).toBe(true)
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)
  })

  it('opens dialogs from dropdown actions and closes the menu', async () => {
    const wrapper = mountToolbar()

    await openMenu(wrapper)
    const dropdownItems = wrapper.findAll('.toolbar-dropdown-item')
    await dropdownItems[0].trigger('click') // New Folder

    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    expect(folderDialog.props('isOpen')).toBe(true)
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)

    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[1].trigger('click') // New File

    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    expect(fileDialog.props('isOpen')).toBe(true)
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)
  })

  it('emits refresh and disables action while loading', async () => {
    const wrapper = mountToolbar()

    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[3].trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()

    const loadingWrapper = mountToolbar(true)
    await openMenu(loadingWrapper)
    const refreshItem = loadingWrapper.findAll('.toolbar-dropdown-item')[3]
    expect(refreshItem.attributes('disabled')).toBeDefined()
  })

  it('invokes sort and collapse actions', async () => {
    mockVaultStore.hasExpandedPaths = true
    const wrapper = mountToolbar()

    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[4].trigger('click')
    expect(mockVaultStore.toggleSortOrder).toHaveBeenCalled()

    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[6].trigger('click') // Created Date option
    expect(mockVaultStore.setSortBy).toHaveBeenCalledWith('created')

    await openMenu(wrapper)
    const checkboxItem = wrapper.find('.toolbar-dropdown-checkbox')
    await checkboxItem.trigger('click')
    expect(mockVaultStore.toggleSortDirectoriesWithFiles).toHaveBeenCalled()
  })

  it('renders sort directories with files checkbox', async () => {
    const wrapper = mountToolbar()
    await openMenu(wrapper)
    
    const checkboxItem = wrapper.find('.toolbar-dropdown-checkbox')
    expect(checkboxItem.exists()).toBe(true)
    expect(checkboxItem.text()).toContain('Sort directories with files')
    expect(checkboxItem.attributes('aria-checked')).toBe('false')
  })

  it('toggles sort directories with files when checkbox is clicked', async () => {
    const wrapper = mountToolbar()
    await openMenu(wrapper)
    
    const checkboxItem = wrapper.find('.toolbar-dropdown-checkbox')
    await checkboxItem.trigger('click')
    
    expect(mockVaultStore.toggleSortDirectoriesWithFiles).toHaveBeenCalled()
    // Menu should stay open for checkbox
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(true)
  })

  it('closes the menu when clicking outside', async () => {
    const wrapper = mountToolbar()
    await openMenu(wrapper)

    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(true)
    const body = document.body
    expect(body).not.toBeNull()
    body!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)
  })

  it('handles theme toggle and logout actions', async () => {
    const wrapper = mountToolbar()

    await openMenu(wrapper)
    const themeButton = wrapper.find('.theme-toggle-btn')
    await themeButton.trigger('click')

    expect(mockThemeStore.toggleTheme).toHaveBeenCalled()
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)

    await openMenu(wrapper)
    const logoutButton = wrapper.find('.logout-btn')
    await logoutButton.trigger('click')

    expect(mockAuthStore.logout).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith('/login')
    expect(wrapper.find('.toolbar-dropdown').exists()).toBe(false)
  })

  describe('dialog validators', () => {
    it('validates folder names', () => {
      const wrapper = mountToolbar()
      const validator = wrapper.findAllComponents(InputDialog)[0].props('validator') as (value: string) => string | null

      expect(validator('')).toBe('Folder name cannot be empty')
      expect(validator('folder/name')).toBe('Folder name cannot contain path separators or ..')
      expect(validator('folder<name')).toBe('Folder name contains invalid characters')
      expect(validator('CON')).toBe('This is a reserved folder name')
      expect(validator('my-folder')).toBeNull()
    })

    it('validates file names', () => {
      const wrapper = mountToolbar()
      const validator = wrapper.findAllComponents(InputDialog)[1].props('validator') as (value: string) => string | null

      expect(validator('')).toBe('File name cannot be empty')
      expect(validator('file/name.md')).toBe('File name cannot contain path separators or ..')
      expect(validator('file<name.md')).toBe('File name contains invalid characters')
      expect(validator('file.txt')).toBeNull() // File extension validation removed
      expect(validator('CON.md')).toBeNull() // Reserved name validation removed
      expect(validator('note.md')).toBeNull()
    })
  })

  it('closes dialogs based on creation result', async () => {
    const wrapper = mountToolbar()

    mockVaultStore.createDirectory.mockResolvedValue(true)
    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[0].trigger('click')
    const folderDialog = wrapper.findAllComponents(InputDialog)[0]
    await folderDialog.vm.$emit('confirm', 'folder-a')
    await wrapper.vm.$nextTick()
    expect(folderDialog.props('isOpen')).toBe(false)

    mockVaultStore.createDirectory.mockResolvedValue(false)
    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[0].trigger('click')
    await folderDialog.vm.$emit('confirm', 'folder-b')
    await wrapper.vm.$nextTick()
    expect(folderDialog.props('isOpen')).toBe(true)

    const fileDialog = wrapper.findAllComponents(InputDialog)[1]
    mockVaultStore.createNote.mockResolvedValue(true)
    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[1].trigger('click')
    await fileDialog.vm.$emit('confirm', 'note.md')
    await wrapper.vm.$nextTick()
    expect(fileDialog.props('isOpen')).toBe(false)

    mockVaultStore.createNote.mockResolvedValue(false)
    await openMenu(wrapper)
    await wrapper.findAll('.toolbar-dropdown-item')[1].trigger('click')
    await fileDialog.vm.$emit('confirm', 'note2.md')
    await wrapper.vm.$nextTick()
    expect(fileDialog.props('isOpen')).toBe(true)
  })
})

