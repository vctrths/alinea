import {Button, Checkbox, FoldIcon, Icon} from '#/components.js'
import styler from '@alinea/styler'
import {atom, useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import {useMemo, useState, type ComponentType, type ReactNode} from 'react'
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  type Key,
  type Selection
} from 'react-aria-components'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardExplorer,
  DashboardRoot,
  ExplorerOptions
} from '../store.js'
import {ExplorerModalContent} from './ExplorerModal.js'
import css from './ExplorerRacStandardPickerContent.module.css'

const styles = styler(css)

export interface ExplorerRacStandardPickerContentProps {
  explorer: DashboardExplorer
  navigationLabel: string
  options: ExplorerOptions
}

interface ExplorerRacStandardTableRowState {
  containsMatches: boolean
  deadEnd: boolean
  selectable: boolean
  unavailable: boolean
  visible: boolean
}

interface ExplorerRacStandardTreeRowsProps {
  expandedKeys: Set<Key>
  explorer: DashboardExplorer
  ids: Array<string>
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
}

interface ExplorerRacStandardTreeRowProps extends Omit<
  ExplorerRacStandardTreeRowsProps,
  'ids'
> {
  entry: DashboardEntry
}

interface ExplorerRacStandardLoadedTreeRowProps extends ExplorerRacStandardTreeRowProps {
  data: DashboardEntryData
}

interface ExplorerRacStandardDisplayRowProps {
  children?: ReactNode
  childrenAmount: number
  containsMatches: boolean
  entry: DashboardEntry
  expanded: boolean
  icon: ComponentType
  label: string
  onToggleExpanded: (key: Key) => void
  parents: Array<DashboardEntry>
  partialSelection?: boolean
  path?: string
  rootLabel: string | undefined
  selectable: boolean
  selected: boolean
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  typeLabel: string
  unavailable: boolean
}

interface ExplorerRacStandardFlatRowProps {
  entry: DashboardEntry
  explorer: DashboardExplorer
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
}

interface ExplorerRacStandardFlatLoadedRowProps extends ExplorerRacStandardFlatRowProps {
  data: DashboardEntryData
}

function useRowState(
  explorer: DashboardExplorer,
  entry: DashboardEntry
): ExplorerRacStandardTableRowState {
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

function useChildIds(data: DashboardEntryData, expanded: boolean) {
  const childrenAtom = useMemo(
    () =>
      expanded
        ? unwrap(data.children, previous => previous ?? [])
        : emptyRootChildren,
    [data.children, expanded]
  )
  return useAtomValue(childrenAtom)
}

function useEntryPath(data: DashboardEntryData) {
  const currentEntryAtom = useMemo(
    () => unwrap(data.currentEntry, previous => previous),
    [data.currentEntry]
  )
  const currentEntry = useAtomValue(currentEntryAtom)
  return currentEntry?.path
}

function ExplorerRacStandardPath({
  parents,
  rootLabel
}: {
  parents: Array<DashboardEntry>
  rootLabel: string | undefined
}) {
  if (!rootLabel && parents.length === 0) return null
  return (
    <div className={styles.RacPickerTable.path()}>
      {rootLabel && (
        <span className={styles.RacPickerTable.path.label()}>{rootLabel}</span>
      )}
      {parents.map(parent => (
        <ExplorerRacStandardPathParent key={parent.id} parent={parent} />
      ))}
    </div>
  )
}

function ExplorerRacStandardPathParent({parent}: {parent: DashboardEntry}) {
  const {data} = useAtomValue(parent.data)
  if (!data) return null
  return <ExplorerRacStandardLoadedPathParent data={data} />
}

function ExplorerRacStandardLoadedPathParent({
  data
}: {
  data: DashboardEntryData
}) {
  const label = useAtomValue(data.label)
  return (
    <>
      <span className={styles.RacPickerTable.path.separator()}>/</span>
      <span className={styles.RacPickerTable.path.label()}>{label}</span>
    </>
  )
}

function ExplorerRacStandardDisplayRow({
  children,
  childrenAmount,
  containsMatches,
  entry,
  expanded,
  icon,
  label,
  onToggleExpanded,
  parents,
  partialSelection,
  path,
  rootLabel,
  selectable,
  selected,
  toggleSelection,
  typeLabel,
  unavailable
}: ExplorerRacStandardDisplayRowProps) {
  const canExpand = childrenAmount > 0
  const unselectable = !selectable
  function onAction() {
    if (canExpand) {
      onToggleExpanded(entry.id)
      return
    }
    if (selectable) toggleSelection(entry, true)
  }
  return (
    <AriaRow
      id={entry.id}
      textValue={label}
      className={styles.RacPickerTable.row()}
      data-contains-matches={containsMatches || undefined}
      data-expandable={canExpand || undefined}
      data-selectable={selectable || undefined}
      data-unavailable={unavailable || undefined}
      data-unselectable={unselectable || undefined}
      hasChildItems={canExpand}
      isDisabled={canExpand}
      onAction={canExpand || selectable ? onAction : undefined}
    >
      <AriaCell className={styles.RacPickerTable.selectionCell()}>
        {partialSelection ? (
          <span className={styles.RacPickerTable.dot()} />
        ) : selectable ? (
          <Checkbox
            aria-label={`Select ${label}`}
            isSelected={selected}
            onChange={next => toggleSelection(entry, next)}
          />
        ) : null}
      </AriaCell>
      <AriaCell className={styles.RacPickerTable.titleCell()} textValue={label}>
        {({isExpanded}) => (
          <div className={styles.RacPickerTable.entryName()}>
            <div className={styles.RacPickerTable.titleLine()}>
              {canExpand ? (
                <Button
                  slot="chevron"
                  size="icon-nav"
                  appearance="plain"
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                  className={styles.RacPickerTable.chevron()}
                >
                  <FoldIcon expanded={isExpanded} />
                </Button>
              ) : (
                <span className={styles.RacPickerTable.chevronSpacer()} />
              )}
              <Icon icon={icon} className={styles.RacPickerTable.icon()} />
              <span className={styles.RacPickerTable.titleCopy()}>
                <ExplorerRacStandardPath
                  parents={parents}
                  rootLabel={rootLabel}
                />
                <span className={styles.RacPickerTable.label()}>{label}</span>
              </span>
            </div>
          </div>
        )}
      </AriaCell>
      <AriaCell className={styles.RacPickerTable.pathCell()}>{path}</AriaCell>
      <AriaCell className={styles.RacPickerTable.typeCell()}>
        {typeLabel}
      </AriaCell>
      {children}
    </AriaRow>
  )
}

function ExplorerRacStandardLoadedTreeRow({
  data,
  entry,
  expandedKeys,
  explorer,
  onToggleExpanded,
  toggleSelection
}: ExplorerRacStandardLoadedTreeRowProps) {
  const state = useRowState(explorer, entry)
  const root = useAtomValue(data.root)
  const rootLabel = useAtomValue(root.label)
  const label = useAtomValue(data.label)
  const type = useAtomValue(data.type)
  const icon = useAtomValue(data.icon)
  const childrenAmount = useAtomValue(data.childrenAmount)
  const canExpand = childrenAmount > 0 && !state.deadEnd
  const selected = useSelectedEntry(explorer, entry)
  const expanded = expandedKeys.has(entry.id)
  const childIds = useChildIds(data, canExpand && expanded)
  const path = useEntryPath(data)
  const parents = useAtomValue(data.parents)
  const partialSelectionKeys = useAtomValue(explorer.partialSelectionKeys)
  if (!state.visible) return null
  return (
    <ExplorerRacStandardDisplayRow
      childrenAmount={canExpand ? childrenAmount : 0}
      containsMatches={state.containsMatches}
      entry={entry}
      expanded={canExpand && expanded}
      icon={icon}
      label={label}
      partialSelection={partialSelectionKeys.has(entry.id)}
      path={path}
      parents={parents}
      rootLabel={rootLabel}
      selectable={state.selectable}
      selected={selected}
      onToggleExpanded={onToggleExpanded}
      toggleSelection={toggleSelection}
      typeLabel={type.label}
      unavailable={state.unavailable}
    >
      {canExpand && expanded && childIds.length > 0 && (
        <ExplorerRacStandardTreeRows
          expandedKeys={expandedKeys}
          explorer={explorer}
          ids={childIds}
          onToggleExpanded={onToggleExpanded}
          toggleSelection={toggleSelection}
        />
      )}
    </ExplorerRacStandardDisplayRow>
  )
}

function ExplorerRacStandardTreeRow(props: ExplorerRacStandardTreeRowProps) {
  const {data, pending} = useAtomValue(props.entry.data)
  if (pending || !data) {
    return (
      <AriaRow id={props.entry.id} textValue="Loading entry">
        <AriaCell />
        <AriaCell>Loading entry</AriaCell>
        <AriaCell />
        <AriaCell />
      </AriaRow>
    )
  }
  return <ExplorerRacStandardLoadedTreeRow {...props} data={data} />
}

function ExplorerRacStandardTreeRows({
  expandedKeys,
  explorer,
  ids,
  onToggleExpanded,
  toggleSelection
}: ExplorerRacStandardTreeRowsProps) {
  const entries = ids.map(id => explorer.dashboard.entries(id))
  return (
    <>
      {entries.map(entry => (
        <ExplorerRacStandardTreeRow
          key={entry.id}
          entry={entry}
          expandedKeys={expandedKeys}
          explorer={explorer}
          onToggleExpanded={onToggleExpanded}
          toggleSelection={toggleSelection}
        />
      ))}
    </>
  )
}

function ExplorerRacStandardFlatLoadedRow({
  data,
  entry,
  explorer,
  toggleSelection
}: ExplorerRacStandardFlatLoadedRowProps) {
  const unavailableKeys = useAtomValue(explorer.unavailableKeys)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const root = useAtomValue(data.root)
  const rootLabel = useAtomValue(root.label)
  const label = useAtomValue(data.label)
  const type = useAtomValue(data.type)
  const icon = useAtomValue(data.icon)
  const childrenAmount = useAtomValue(data.childrenAmount)
  const selected = useSelectedEntry(explorer, entry)
  const path = useEntryPath(data)
  const parents = useAtomValue(data.parents)
  const selectable = !unselectableKeys.has(entry.id)
  const partialSelectionKeys = useAtomValue(explorer.partialSelectionKeys)
  return (
    <ExplorerRacStandardDisplayRow
      childrenAmount={childrenAmount}
      containsMatches={false}
      entry={entry}
      expanded={false}
      icon={icon}
      label={label}
      partialSelection={partialSelectionKeys.has(entry.id)}
      path={path}
      parents={parents}
      rootLabel={rootLabel}
      selectable={selectable}
      selected={selected}
      onToggleExpanded={() => undefined}
      toggleSelection={toggleSelection}
      typeLabel={type.label}
      unavailable={unavailableKeys.has(entry.id)}
    />
  )
}

function ExplorerRacStandardFlatRow(props: ExplorerRacStandardFlatRowProps) {
  const {data, pending} = useAtomValue(props.entry.data)
  if (pending || !data) {
    return (
      <AriaRow id={props.entry.id} textValue="Loading entry">
        <AriaCell />
        <AriaCell>Loading entry</AriaCell>
        <AriaCell />
        <AriaCell />
      </AriaRow>
    )
  }
  return <ExplorerRacStandardFlatLoadedRow {...props} data={data} />
}

function useRootChildIds(root: DashboardRoot | undefined) {
  const childrenAtom = useMemo(
    () =>
      root
        ? unwrap(root.children, previous => previous ?? [])
        : emptyRootChildren,
    [root]
  )
  return useAtomValue(childrenAtom)
}

const emptyRootChildren = atom<Array<string>>([])

function ExplorerRacStandardTable({
  explorer,
  options
}: {
  explorer: DashboardExplorer
  options: ExplorerOptions
}) {
  const root = useAtomValue(explorer.root)
  const rootIds = useRootChildIds(root)
  const flatItems = useAtomValue(explorer.items)
  const selection = useAtomValue(explorer.selection)
  const navigationTreeState = useAtomValue(explorer.navigationTreeState)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const setSelection = useSetAtom(explorer.setSelection)
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set())
  const isFlat =
    options.conditionScope === 'flat' || explorer.conditionScope === 'flat'
  const hasRows = isFlat ? flatItems.length > 0 : rootIds.length > 0

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

  function onExpandedChange(keys: Set<Key>) {
    setExpandedKeys(keys)
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
    <div className={styles.RacPickerTable()}>
      <AriaTable
        aria-label="Expandable entry picker table"
        className={styles.RacPickerTable.table()}
        expandedKeys={expandedKeys}
        onExpandedChange={onExpandedChange}
        selectedKeys={selection}
        disabledBehavior="selection"
        selectionBehavior="toggle"
        selectionMode="single"
        onSelectionChange={onSelectionChange}
        treeColumn="title"
      >
        <AriaTableHeader>
          <AriaColumn
            id="selection"
            className={styles.RacPickerTable.column.selection()}
            aria-label="Select"
          />
          <AriaColumn
            id="title"
            className={styles.RacPickerTable.column()}
            isRowHeader
          >
            Title
          </AriaColumn>
          <AriaColumn id="path" className={styles.RacPickerTable.column.path()}>
            Path
          </AriaColumn>
          <AriaColumn id="type" className={styles.RacPickerTable.column.type()}>
            Type
          </AriaColumn>
        </AriaTableHeader>
        <AriaTableBody
          renderEmptyState={() => (
            <div className={styles.RacPickerTable.empty()}>
              No matching entries
            </div>
          )}
        >
          {isFlat
            ? flatItems.map(item => (
                <ExplorerRacStandardFlatRow
                  key={item.id}
                  entry={item}
                  explorer={explorer}
                  toggleSelection={toggleSelection}
                />
              ))
            : root && (
                <ExplorerRacStandardTreeRows
                  expandedKeys={expandedKeys}
                  explorer={explorer}
                  ids={rootIds}
                  onToggleExpanded={toggleExpandedKey}
                  toggleSelection={toggleSelection}
                />
              )}
          {!hasRows && null}
        </AriaTableBody>
      </AriaTable>
    </div>
  )
}

export function ExplorerRacStandardPickerContent({
  explorer,
  options
}: ExplorerRacStandardPickerContentProps) {
  return (
    <ExplorerModalContent className={styles.RacPicker()}>
      <main className={styles.RacPicker.main()}>
        <ExplorerRacStandardTable explorer={explorer} options={options} />
      </main>
    </ExplorerModalContent>
  )
}
