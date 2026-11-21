import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatNumber } from '../format'
import { Settings } from './Settings'

function renderSettings(props: Partial<Parameters<typeof Settings>[0]> = {}) {
  const handlers = {
    onSignOut: vi.fn(),
    onManageFolders: vi.fn(),
    onManageViews: vi.fn(),
  }
  render(
    <Settings connectedCount={1234} viewCount={2} {...handlers} {...props} />,
  )
  return handlers
}

describe('Settings', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows counts and wires up the navigation buttons', async () => {
    const handlers = renderSettings()
    expect(screen.getByText(`${formatNumber(1234)} connected`)).toBeVisible()
    expect(screen.getByText('2 custom')).toBeVisible()

    await userEvent.click(
      screen.getByRole('button', { name: 'Manage folders' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Manage views' }))
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(handlers.onManageFolders).toHaveBeenCalled()
    expect(handlers.onManageViews).toHaveBeenCalled()
    expect(handlers.onSignOut).toHaveBeenCalled()
  })

  it('never lets the last media type be switched off', async () => {
    renderSettings()
    const images = screen.getByRole('switch', { name: 'Images' })
    expect(images).toBeChecked()
    expect(images).toBeDisabled()

    await userEvent.click(screen.getByRole('switch', { name: 'Videos' }))
    expect(screen.getByRole('switch', { name: 'Videos' })).toBeChecked()
    expect(images).toBeEnabled()

    await userEvent.click(images)
    expect(images).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Videos' })).toBeDisabled()
  })

  it('toggles the timeline and local AI settings', async () => {
    renderSettings()
    const timeline = screen.getByRole('switch', { name: 'Show timeline' })
    const ai = screen.getByRole('switch', { name: 'Local AI scanning' })
    expect(timeline).toBeChecked()
    expect(ai).not.toBeChecked()

    await userEvent.click(timeline)
    await userEvent.click(ai)
    expect(timeline).not.toBeChecked()
    expect(ai).toBeChecked()
  })
})
