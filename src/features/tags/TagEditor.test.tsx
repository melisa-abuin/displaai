import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DrivePhoto } from '../interfaces'
import { TagEditor } from './TagEditor'

const mutate = vi.fn()

vi.mock('../drive/hooks', () => ({
  useTags: () => ({
    data: [
      { name: 'beach', count: 10 },
      { name: 'city', count: 3 },
    ],
  }),
  useUpdateTagsBulk: () => ({ mutate, isPending: false, isError: false }),
}))

const photo = (id: string, ...tags: string[]): DrivePhoto => ({
  id,
  name: `${id}.jpg`,
  mimeType: 'image/jpeg',
  appProperties: Object.fromEntries(tags.map((t, i) => [`tag.${i}`, t])),
})

describe('TagEditor', () => {
  beforeEach(() => mutate.mockClear())

  it('adds a typed tag using the spelling of an existing one', async () => {
    render(<TagEditor token="t" photos={[photo('p1')]} />)
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Add a tag' }),
      'BEACH{Enter}',
    )
    expect(mutate).toHaveBeenCalledWith([
      { photoId: 'p1', add: ['beach'], remove: [] },
    ])
  })

  it('offers to create a tag that does not exist yet', async () => {
    render(<TagEditor token="t" photos={[photo('p1')]} />)
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Add a tag' }),
      'sunset',
    )
    await userEvent.click(screen.getByRole('option', { name: /sunset/ }))
    expect(mutate).toHaveBeenCalledWith([
      { photoId: 'p1', add: ['sunset'], remove: [] },
    ])
  })

  it('does not suggest tags every photo already has', async () => {
    render(<TagEditor token="t" photos={[photo('p1', 'beach')]} />)
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Add a tag' }),
      'b',
    )
    expect(screen.queryByRole('option', { name: 'beach' })).toBeNull()
  })

  describe('with several photos', () => {
    const photos = [
      photo('p1', 'beach'),
      photo('p2'),
      photo('p3', 'beach', 'city'),
    ]

    it('marks tags only some photos have', () => {
      render(<TagEditor token="t" photos={photos} />)
      expect(screen.getByTitle(/^On 2 of 3 photos/)).toHaveTextContent('beach')
      expect(screen.getByTitle(/^On 1 of 3 photos/)).toHaveTextContent('city')
    })

    it('adds a partial tag only to the photos missing it', async () => {
      render(<TagEditor token="t" photos={photos} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Add tag beach to all' }),
      )
      expect(mutate).toHaveBeenCalledWith([
        { photoId: 'p2', add: ['beach'], remove: [] },
      ])
    })

    it('removes a tag only from the photos that have it', async () => {
      render(<TagEditor token="t" photos={photos} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Remove tag city' }),
      )
      expect(mutate).toHaveBeenCalledWith([
        { photoId: 'p3', add: [], remove: ['city'] },
      ])
    })

    it('renames a tag only where it is present', async () => {
      render(<TagEditor token="t" photos={photos} />)
      await userEvent.click(screen.getByTitle(/^On 1 of 3 photos/))
      const input = screen.getByRole('textbox', { name: 'Rename tag city' })
      await userEvent.clear(input)
      await userEvent.type(input, 'town{Enter}')
      expect(mutate).toHaveBeenCalledWith([
        { photoId: 'p3', add: ['town'], remove: ['city'] },
      ])
    })
  })
})
