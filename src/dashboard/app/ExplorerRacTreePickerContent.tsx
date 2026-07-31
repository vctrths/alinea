import {Tree, TreeItem} from '#/components.js'
import styler from '@alinea/styler'
import {atom, useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import {useEffect, useMemo, useRef, useState} from 'react'
import {type Key, type Selection} from 'react-aria-components'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardExplorer,
  ExplorerOptions,
  ExplorerSortBy
} from '../store.js'
import {ExplorerModalContent} from './ExplorerModal.js'
import css from './ExplorerRacTreePickerContent.module.css'

const styles = styler(css)

export interface ExplorerRacTreePickerContentProps {
  explorer: DashboardExplorer
  navigationLabel: string
  options: ExplorerOptions
}

interface RowState {
  containsMatches: boolean
  deadEnd: boolean
  selectable: boolean
  unavailable: boolean
  visible: boolean
}

function useRowState(
  explorer: DashboardExplorer,
  entry: DashboardEntry
): RowState {
  const navigationState = useAtomValue(explorer.navigationTreeState)
  if (!navigationState.active) {
    return {
      containsMatches: false,
      deadEnd: false,
      selectable: true,
      unavailable: false,
      visible: true
    }
  }
  const selectable = navigationState.selectableKeys.has(entry.id)
  const containsMatches = navigationState.matchingDescendantKeys.has(entry.id)
  const deadEnd = navigationState.deadEndKeys.has(entry.id)
  const visible =
    explorer.unavailableItems === 'hidden'
      ? selectable || containsMatches
      : true
  return {
    containsMatches,
    deadEnd,
    selectable,
    unavailable: !selectable && !containsMatches,
    visible
  }
}

function useSelectedEntry(explorer: DashboardExplorer, entry: DashboardEntry) {
  const selection = useAtomValue(explorer.selection)
  return selection === 'all' || selection.has(entry.id)
}

function useSortedEntries(
  explorer: DashboardExplorer,
  entries: Array<DashboardEntry>,
  sortBy: ExplorerSortBy,
  groupByRoot: boolean
): Array<DashboardEntry> {
  const extrasAtom = useMemo(
    () =>
      atom(get =>
        entries.map(entry => {
          const {data} = get(entry.data)
          if (!data) return {depth: 0, rootKey: ''}
          return {
            depth: get(data.parentIds).length,
            rootKey: get(data.rootKey)
          }
        })
      ),
    [entries]
  )
  const extras = useAtomValue(extrasAtom)
  return useMemo(() => {
    let items = entries.map((entry, i) => ({entry, ...extras[i]}))

    if (groupByRoot) {
      items.sort((a, b) => {
        const byRoot = a.rootKey.localeCompare(b.rootKey)
        if (byRoot !== 0) return byRoot
        return a.depth - b.depth
      })
    } else if (sortBy === 'depth') {
      items.sort((a, b) => a.depth - b.depth)
    } else {
      return entries
    }

    return items.map(({entry}) => entry)
  }, [entries, extras, sortBy, groupByRoot])
}

function ExplorerRacTree({
  explorer,
  options
}: {
  explorer: DashboardExplorer
  options: ExplorerOptions
}) {
  const root = useAtomValue(explorer.root)
  const flatItems = useAtomValue(explorer.items)
  const search = useAtomValue(explorer.search)
  const selection = useAtomValue(explorer.selection)
  const navigationTreeState = useAtomValue(explorer.navigationTreeState)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const setSelection = useSetAtom(explorer.setSelection)
  const isSearching = Boolean(search.trim())
  const isFlat =
    options.conditionScope === 'flat' ||
    explorer.conditionScope === 'flat' ||
    isSearching
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set())
  const sortValue = useAtomValue(explorer.sort)
  const sortBy = sortValue?.sortBy ?? 'title'
  const searchAllRoots = useAtomValue(explorer.searchAllRoots)
  const setSort = useSetAtom(explorer.sort)
  const savedSortRef = useRef<ExplorerSortBy | null>(null)
  useEffect(() => {
    if (isFlat && sortBy !== 'depth') {
      savedSortRef.current = sortBy
      setSort('depth')
    } else if (!isFlat && savedSortRef.current) {
      setSort(savedSortRef.current)
      savedSortRef.current = null
    }
  }, [isFlat])
  const empty = useMemo(() => atom<Array<string>>([]), [])
  const rootChildrenAtom = useMemo(
    () => (root ? unwrap(root.children, previous => previous ?? []) : empty),
    [root, empty]
  )
  const rootIds: Array<string> = useAtomValue(rootChildrenAtom)
  const flatItemsSorted = useSortedEntries(
    explorer,
    flatItems,
    sortBy,
    searchAllRoots
  )
  const items = isFlat
    ? flatItemsSorted
    : rootIds.map(id => explorer.dashboard.entries(id))

  function toggleSelection(entry: DashboardEntry, selected: boolean) {
    if (explorer.selectionMode === 'single') {
      setSelection(selected ? new Set<Key>([entry.id]) : new Set<Key>())
      return
    }
    const next = selection === 'all' ? new Set<Key>() : new Set(selection)
    if (selected) next.add(entry.id)
    else next.delete(entry.id)
    setSelection(next)
  }

  function isSelectableKey(key: Key) {
    if (navigationTreeState.active)
      return navigationTreeState.selectableKeys.has(key)
    return !unselectableKeys.has(key)
  }

  function onSelectionChange(keys: Selection) {
    if (keys === 'all') {
      setSelection(keys)
      return
    }
    const next = new Set([...keys].filter(isSelectableKey))
    if (next.size === 0 && keys.size > 0) return
    setSelection(next)
  }

  function toggleExpandedKey(key: Key) {
    setExpandedKeys(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className={styles.RacPickerTree()}>
      <Tree
        aria-label="Entry tree"
        expandedKeys={expandedKeys}
        onExpandedChange={setExpandedKeys}
        selectedKeys={selection}
        selectionMode={
          explorer.selectionMode === 'multiple' ? 'multiple' : 'single'
        }
        selectionBehavior="toggle"
        disabledBehavior="selection"
        onSelectionChange={onSelectionChange}
        className={styles.RacPickerTree.tree()}
      >
        {items.map((entry: any) =>
          isFlat ? (
            <ExplorerRacTreeFlatItem
              key={entry.id}
              entry={entry}
              toggleSelection={toggleSelection}
              explorer={explorer}
            />
          ) : (
            <ExplorerRacTreeItem
              key={entry.id}
              entry={entry}
              expandedKeys={expandedKeys}
              onToggleExpanded={toggleExpandedKey}
              toggleSelection={toggleSelection}
              explorer={explorer}
            />
          )
        )}
      </Tree>
    </div>
  )
}

function ExplorerRacTreeItem({
  entry,
  expandedKeys,
  onToggleExpanded,
  toggleSelection,
  explorer
}: {
  entry: DashboardEntry
  expandedKeys: Set<Key>
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  explorer: DashboardExplorer
}) {
  const {data, pending} = useAtomValue(entry.data)
  if (pending || !data) {
    return (
      <TreeItem
        id={entry.id}
        title="Loading"
        className={styles.RacPickerTree.item()}
      />
    )
  }
  return (
    <ExplorerRacTreeLoadedItem
      entry={entry}
      data={data}
      expandedKeys={expandedKeys}
      onToggleExpanded={onToggleExpanded}
      toggleSelection={toggleSelection}
      explorer={explorer}
    />
  )
}

function ExplorerRacTreeLoadedItem({
  entry,
  data,
  expandedKeys,
  onToggleExpanded,
  toggleSelection,
  explorer
}: {
  entry: DashboardEntry
  data: DashboardEntryData
  expandedKeys: Set<Key>
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  explorer: DashboardExplorer
}) {
  const label = useAtomValue(data.label)
  const icon = useAtomValue(data.icon)
  const childrenAmount = useAtomValue(data.childrenAmount)
  const state = useRowState(explorer, entry)
  const canExpand = childrenAmount > 0 && !state.deadEnd
  const expanded = expandedKeys.has(entry.id)

  if (!state.visible) return null

  return (
    <TreeItem
      id={entry.id}
      title={label}
      icon={icon}
      hasChildItems={canExpand}
      isDisabled={!state.selectable}
      data-selectable={state.selectable || undefined}
      className={styles.RacPickerTree.item()}
      data-unavailable={state.unavailable || undefined}
      onAction={canExpand ? () => onToggleExpanded(entry.id) : undefined}
      label={
        <div className={styles.RacPickerTree.treeItemLabel()}>
          <span className={styles.RacPickerTree.treeItemTitle()}>{label}</span>
        </div>
      }
    >
      {expanded && canExpand && (
        <ItemChildren
          entry={entry}
          expandedKeys={expandedKeys}
          onToggleExpanded={onToggleExpanded}
          toggleSelection={toggleSelection}
          explorer={explorer}
        />
      )}
    </TreeItem>
  )
}

function ItemChildren({
  entry,
  expandedKeys,
  onToggleExpanded,
  toggleSelection,
  explorer
}: {
  entry: DashboardEntry
  expandedKeys: Set<Key>
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  explorer: DashboardExplorer
}) {
  const {data} = useAtomValue(entry.data)
  if (!data) return null
  const childrenIdsAtom = useMemo(
    () => unwrap(data.children, previous => previous ?? []),
    [data.children]
  )
  const childrenIds = useAtomValue(childrenIdsAtom)
  if (childrenIds.length === 0) return null
  return (
    <>
      {childrenIds.map(id => (
        <ExplorerRacTreeItem
          key={id}
          entry={explorer.dashboard.entries(id)}
          expandedKeys={expandedKeys}
          onToggleExpanded={onToggleExpanded}
          toggleSelection={toggleSelection}
          explorer={explorer}
        />
      ))}
    </>
  )
}

function ExplorerRacTreePath({
  parents,
  rootLabel
}: {
  parents: Array<DashboardEntry>
  rootLabel: string | undefined
}) {
  if (!rootLabel && parents.length === 0) return null
  return (
    <div className={styles.RacPickerTree.path()}>
      {rootLabel && (
        <span className={styles.RacPickerTree.path.label()}>{rootLabel}</span>
      )}
      {parents.map(parent => (
        <ExplorerRacTreePathParent key={parent.id} parent={parent} />
      ))}
    </div>
  )
}

function ExplorerRacTreePathParent({parent}: {parent: DashboardEntry}) {
  const {data} = useAtomValue(parent.data)
  if (!data) return null
  return <ExplorerRacTreeLoadedPathParent data={data} />
}

function ExplorerRacTreeLoadedPathParent({data}: {data: DashboardEntryData}) {
  const label = useAtomValue(data.label)
  return (
    <>
      <span className={styles.RacPickerTree.path.separator()}>/</span>
      <span className={styles.RacPickerTree.path.label()}>{label}</span>
    </>
  )
}

function ExplorerRacTreeFlatItem({
  entry,
  toggleSelection,
  explorer
}: {
  entry: DashboardEntry
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  explorer: DashboardExplorer
}) {
  const {data, pending} = useAtomValue(entry.data)
  if (pending || !data) {
    return (
      <TreeItem
        id={entry.id}
        title="Loading"
        className={styles.RacPickerTree.item()}
      />
    )
  }
  return (
    <ExplorerRacTreeFlatLoadedItem
      entry={entry}
      data={data}
      toggleSelection={toggleSelection}
      explorer={explorer}
    />
  )
}

function ExplorerRacTreeFlatLoadedItem({
  entry,
  data,
  toggleSelection,
  explorer
}: {
  entry: DashboardEntry
  data: DashboardEntryData
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  explorer: DashboardExplorer
}) {
  const label = useAtomValue(data.label)
  const icon = useAtomValue(data.icon)
  const root = useAtomValue(data.root)
  const rootLabel = useAtomValue(root.label)
  const parents = useAtomValue(data.parents)
  const selected = useSelectedEntry(explorer, entry)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const selectable = !unselectableKeys.has(entry.id)
  return (
    <TreeItem
      id={entry.id}
      title={label}
      icon={icon}
      isDisabled={!selectable}
      data-selectable={selectable || undefined}
      className={styles.RacPickerTree.item()}
      label={
        <div className={styles.RacPickerTree.treeItemLabel()}>
          <span className={styles.RacPickerTree.treeItemTitle()}>{label}</span>
          <ExplorerRacTreePath parents={parents} rootLabel={rootLabel} />
        </div>
      }
    />
  )
}

export function ExplorerRacTreePickerContent({
  explorer,
  options
}: ExplorerRacTreePickerContentProps) {
  return (
    <ExplorerModalContent className={styles.RacPicker()}>
      <main className={styles.RacPicker.main()}>
        <ExplorerRacTree explorer={explorer} options={options} />
      </main>
    </ExplorerModalContent>
  )
}
