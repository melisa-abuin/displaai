import { describe, expect, it } from 'vitest'
import type { DriveFolder } from '../interfaces'
import { buildFolderIndex, descendantIds, folderChain } from './folderTree'

const folder = (
  id: string,
  parentId?: string,
  totalCount = 1,
): DriveFolder => ({
  id,
  name: id,
  parentId,
  path: id,
  ownedByMe: true,
  photoCount: totalCount,
  totalCount,
})

const names = (folders: DriveFolder[] | undefined) => folders?.map((f) => f.id)

describe('buildFolderIndex', () => {
  it('leaves out folders without photos', () => {
    const index = buildFolderIndex([folder('a'), folder('empty', undefined, 0)])
    expect(index.byId.has('empty')).toBe(false)
    expect(names(index.children.get(null))).toEqual(['a'])
  })

  it('lifts folders whose parent is missing, hidden or themselves to the top', () => {
    const index = buildFolderIndex([
      folder('child', 'hidden'),
      folder('hidden', undefined, 0),
      folder('orphan', 'unknown'),
      folder('self', 'self'),
    ])
    expect(names(index.children.get(null))).toEqual(['child', 'orphan', 'self'])
  })
})

describe('folderChain / descendantIds', () => {
  const index = buildFolderIndex([
    folder('root'),
    folder('mid', 'root'),
    folder('leaf', 'mid'),
    folder('other', 'root'),
  ])

  it('lists the chain from the top level down', () => {
    expect(names(folderChain(index, 'leaf'))).toEqual(['root', 'mid', 'leaf'])
    expect(folderChain(index, 'nope')).toEqual([])
  })

  it('collects a folder and everything beneath it', () => {
    expect(descendantIds(index, 'root').sort()).toEqual([
      'leaf',
      'mid',
      'other',
      'root',
    ])
    expect(descendantIds(index, 'leaf')).toEqual(['leaf'])
  })

  it('terminates on cyclic parents', () => {
    const cyclic = buildFolderIndex([folder('a', 'b'), folder('b', 'a')])
    expect(folderChain(cyclic, 'a')).toHaveLength(2)
    expect(descendantIds(cyclic, 'a').sort()).toEqual(['a', 'b'])
  })
})
