import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SidebarAlbum } from '../../interfaces'
import { Sidebar } from './Sidebar'

vi.mock('../../drive/hooks', () => ({
  useLibraryStatus: () => ({ isLoading: false, error: null }),
  useUserEmail: () => ({ data: 'me@example.com' }),
}))

const folder = (id: string, name: string, photoCount = 3) => ({
  id,
  name,
  path: name,
  ownedByMe: true,
  photoCount,
  totalCount: photoCount,
})

const ALBUMS: SidebarAlbum[] = [
  { folder: folder('trips', 'Trips'), depth: 0 },
  { folder: folder('italy', 'Italy'), depth: 1 },
  { folder: folder('pets', 'Pets'), depth: 0 },
]

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onSelectView: vi.fn(),
    onModeChange: vi.fn(),
    onOpenSettings: vi.fn(),
  }
  render(
    <Sidebar
      token="token"
      albums={ALBUMS}
      allPhotosCount={9}
      tags={[
        { name: 'cat', count: 2 },
        { name: 'dog', count: 1 },
      ]}
      views={[{ id: 'v1', name: 'Favourites', count: 4 }]}
      isBrowseActive
      isSettingsOpen={false}
      selectedId={null}
      selectedViewId={null}
      mode="photos"
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('Sidebar', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))
  afterEach(() => vi.unstubAllGlobals())

  it('hides the subfolders of a collapsed folder until it is expanded', async () => {
    renderSidebar()
    expect(screen.queryByRole('button', { name: /Italy/ })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Expand Trips' }))
    expect(screen.getByRole('button', { name: /Italy/ })).toBeVisible()

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Trips' }),
    )
    expect(screen.queryByRole('button', { name: /Italy/ })).toBeNull()
  })

  it('opens the parents of the selected folder', () => {
    renderSidebar({ selectedId: 'italy' })
    expect(screen.getByRole('button', { name: /Italy/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('selects folders and views', async () => {
    const handlers = renderSidebar()
    await userEvent.click(screen.getByRole('button', { name: /Pets/ }))
    await userEvent.click(screen.getByRole('button', { name: /All folders/ }))
    await userEvent.click(screen.getByRole('button', { name: /Favourites/ }))
    expect(handlers.onSelect).toHaveBeenNthCalledWith(1, 'pets')
    expect(handlers.onSelect).toHaveBeenNthCalledWith(2, null)
    expect(handlers.onSelectView).toHaveBeenCalledWith('v1')
  })

  it('keeps the tag filter in the URL', async () => {
    renderSidebar()
    await userEvent.click(screen.getByRole('button', { name: /cat/ }))
    expect(window.location.search).toBe('?tag=cat')

    await userEvent.click(screen.getByRole('button', { name: /dog/ }))
    expect(screen.getByRole('group', { name: 'Match' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(window.location.search).toBe('')
  })

  it('hides the tags on the settings pages', () => {
    renderSidebar({ isSettingsOpen: true })
    expect(screen.queryByRole('region', { name: 'Filter by tag' })).toBeNull()
  })

  describe('on a narrow screen', () => {
    beforeEach(() =>
      vi.stubGlobal('matchMedia', () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    )

    it('opens the folders in a drawer that closes after picking one', async () => {
      const handlers = renderSidebar()
      expect(screen.queryByRole('dialog')).toBeNull()

      await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
      const drawer = screen.getByRole('dialog', { name: 'Folders' })
      await userEvent.click(
        within(drawer).getByRole('button', { name: /Pets/ }),
      )

      expect(handlers.onSelect).toHaveBeenCalledWith('pets')
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('closes the drawer with Escape', async () => {
      renderSidebar()
      await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
