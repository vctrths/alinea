import {
  Button,
  Cell,
  Checkbox,
  FoldIcon,
  Column,
  Icon,
  Row,
  Table,
  TableBody,
  TableHeader
} from '#/components.js'
import styler from '@alinea/styler'
import {atom, useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import {useMemo, useState, type ComponentType, type PointerEvent} from 'react'
import type {Key, Selection} from 'react-aria-components'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardExplorer,
  DashboardRoot,
  ExplorerOptions
} from '../store.js'
import {ExplorerModalContent} from './ExplorerModal.js'
import css from './ExplorerRacPickerContent.module.css'

const styles = styler(css)

export interface ExplorerRacPickerContentProps {
  explorer: DashboardExplorer
  navigationLabel: string
  options: ExplorerOptions
}

interface ExplorerRacTableRowState {
  containsMatches: boolean
  deadEnd: boolean
  selectable: boolean
  unavailable: boolean
  visible: boolean
}

interface ExplorerRacTreeRowsProps {
  depth: number
  expandedKeys: Set<Key>
  explorer: DashboardExplorer
  ids: Array<string>
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
}

interface ExplorerRacTreeRowProps extends Omit<
  ExplorerRacTreeRowsProps,
  'ids'
> {
  entry: DashboardEntry
}

interface ExplorerRacLoadedTreeRowProps extends ExplorerRacTreeRowProps {
  data: DashboardEntryData
}

interface ExplorerRacDisplayRowProps {
  childrenAmount: number
  containsMatches: boolean
  depth: number
  expanded: boolean
  entry: DashboardEntry
  icon: ComponentType
  label: string
  path: string | undefined
  parents: Array<DashboardEntry>
  partialSelection?: boolean
  rootLabel: string | undefined
  selectable: boolean
  selected: boolean
  onToggleExpanded: (key: Key) => void
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
  typeLabel: string
  unavailable: boolean
}

interface ExplorerRacFlatRowProps {
  entry: DashboardEntry
  explorer: DashboardExplorer
  toggleSelection: (entry: DashboardEntry, selected: boolean) => void
}

interface ExplorerRacFlatLoadedRowProps extends ExplorerRacFlatRowProps {
  data: DashboardEntryData
}

function useRowState(
  explorer: DashboardExplorer,
  entry: DashboardEntry
): ExplorerRacTableRowState {
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

function ExplorerRacPath({
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
        <ExplorerRacPathParent key={parent.id} parent={parent} />
      ))}
    </div>
  )
}

function ExplorerRacPathParent({parent}: {parent: DashboardEntry}) {
  const {data} = useAtomValue(parent.data)
  if (!data) return null
  return <ExplorerRacLoadedPathParent data={data} />
}

function ExplorerRacLoadedPathParent({data}: {data: DashboardEntryData}) {
  const label = useAtomValue(data.label)
  return (
    <>
      <span className={styles.RacPickerTable.path.separator()}>/</span>
      <span className={styles.RacPickerTable.path.label()}>{label}</span>
    </>
  )
}

function ExplorerRacDisplayRow({
  childrenAmount,
  containsMatches,
  depth,
  expanded,
  entry,
  icon,
  label,
  partialSelection,
  path,
  parents,
  rootLabel,
  selectable,
  selected,
  onToggleExpanded,
  toggleSelection,
  typeLabel,
  unavailable
}: ExplorerRacDisplayRowProps) {
  const canExpand = childrenAmount > 0
  const unselectable = !selectable
  function isInteractiveTarget(event: PointerEvent) {
    const target = event.target as HTMLElement
    return Boolean(target.closest('button,input,label,[role="checkbox"]'))
  }
  function onRowPointerDown(event: PointerEvent) {
    if (selectable || !canExpand) return
    if (isInteractiveTarget(event)) return
    event.preventDefault()
    event.stopPropagation()
  }
  function onRowPointerUp(event: PointerEvent) {
    if (selectable || !canExpand) return
    if (isInteractiveTarget(event)) return
    event.preventDefault()
    event.stopPropagation()
    onToggleExpanded(entry.id)
  }
  return (
    <Row
      id={entry.id}
      textValue={label}
      className={styles.RacPickerTable.row()}
      data-contains-matches={containsMatches || undefined}
      data-depth={depth}
      data-expandable={canExpand || undefined}
      data-selectable={selectable || undefined}
      data-unavailable={unavailable || undefined}
      data-unselectable={unselectable || undefined}
      onPointerDownCapture={onRowPointerDown}
      onPointerUpCapture={onRowPointerUp}
    >
        <Cell className={styles.RacPickerTable.selectionCell()}>
        {partialSelection ? (
          <span className={styles.RacPickerTable.dot()} />
        ) : selectable ? (
          <Checkbox
            slot="selection"
            aria-label={`Select ${label}`}
            isSelected={selected}
            onChange={next => toggleSelection(entry, next)}
          />
        ) : null}
      </Cell>
      <Cell className={styles.RacPickerTable.titleCell()} nowrap>
        <div
          className={styles.RacPickerTable.entryName()}
          style={{paddingLeft: depth * 20}}
        >
          <div className={styles.RacPickerTable.titleLine()}>
            {canExpand ? (
              <Button
                size="icon-nav"
                appearance="plain"
                aria-label="Expand"
                className={styles.RacPickerTable.chevron()}
                onPress={() => onToggleExpanded(entry.id)}
              >
                <FoldIcon expanded={expanded} />
              </Button>
            ) : (
              <span className={styles.RacPickerTable.chevronSpacer()} />
            )}
            <Icon icon={icon} className={styles.RacPickerTable.icon()} />
            <span className={styles.RacPickerTable.titleCopy()}>
              <ExplorerRacPath parents={parents} rootLabel={rootLabel} />
              <span className={styles.RacPickerTable.label()}>{label}</span>
            </span>
          </div>
        </div>
      </Cell>
      <Cell className={styles.RacPickerTable.pathCell()} nowrap>
        {path}
      </Cell>
      <Cell className={styles.RacPickerTable.typeCell()} nowrap>
        {typeLabel}
      </Cell>
    </Row>
  )
}

function ExplorerRacLoadedTreeRow({
  data,
  depth,
  entry,
  expandedKeys,
  explorer,
  onToggleExpanded,
  toggleSelection
}: ExplorerRacLoadedTreeRowProps) {
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
    <>
      <ExplorerRacDisplayRow
        childrenAmount={canExpand ? childrenAmount : 0}
        containsMatches={state.containsMatches}
        depth={depth}
        expanded={canExpand && expanded}
        entry={entry}
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
      />
      {canExpand && expanded && childIds.length > 0 && (
        <ExplorerRacTreeRows
          depth={depth + 1}
          expandedKeys={expandedKeys}
          explorer={explorer}
          ids={childIds}
          onToggleExpanded={onToggleExpanded}
          toggleSelection={toggleSelection}
        />
      )}
    </>
  )
}

function ExplorerRacTreeRow(props: ExplorerRacTreeRowProps) {
  const {data, pending} = useAtomValue(props.entry.data)
  if (pending || !data) {
    return (
      <Row id={props.entry.id} textValue="Loading entry">
        <Cell />
        <Cell>Loading entry</Cell>
        <Cell />
        <Cell />
      </Row>
    )
  }
  return <ExplorerRacLoadedTreeRow {...props} data={data} />
}

function ExplorerRacTreeRows({
  depth,
  expandedKeys,
  explorer,
  ids,
  onToggleExpanded,
  toggleSelection
}: ExplorerRacTreeRowsProps) {
  const entries = ids.map(id => explorer.dashboard.entries(id))
  return (
    <>
      {entries.map(entry => (
        <ExplorerRacTreeRow
          key={entry.id}
          depth={depth}
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

function ExplorerRacFlatLoadedRow({
  data,
  entry,
  explorer,
  toggleSelection
}: ExplorerRacFlatLoadedRowProps) {
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
    <ExplorerRacDisplayRow
      childrenAmount={childrenAmount}
      containsMatches={false}
      depth={0}
      expanded={false}
      entry={entry}
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

function ExplorerRacFlatRow(props: ExplorerRacFlatRowProps) {
  const {data, pending} = useAtomValue(props.entry.data)
  if (pending || !data) {
    return (
      <Row id={props.entry.id} textValue="Loading entry">
        <Cell />
        <Cell>Loading entry</Cell>
        <Cell />
        <Cell />
      </Row>
    )
  }
  return <ExplorerRacFlatLoadedRow {...props} data={data} />
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

function ExplorerRacTable({
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
      <Table
        aria-label="Expandable entry picker table"
        className={styles.RacPickerTable.table()}
        expandedKeys={expandedKeys}
        onExpandedChange={onExpandedChange}
        selectedKeys={selection}
        selectionBehavior="replace"
        selectionMode="single"
        onSelectionChange={onSelectionChange}
        treeColumn="title"
      >
        <TableHeader>
          <Column
            className={styles.RacPickerTable.column.selection()}
            aria-label="Select"
          />
          <Column
            id="title"
            className={styles.RacPickerTable.column()}
            isRowHeader
          >
            Title
          </Column>
          <Column id="path" className={styles.RacPickerTable.column.path()}>
            Path
          </Column>
          <Column id="type" className={styles.RacPickerTable.column.type()}>
            Type
          </Column>
        </TableHeader>
        <TableBody
          renderEmptyState={() => (
            <div className={styles.RacPickerTable.empty()}>
              No matching entries
            </div>
          )}
        >
          {isFlat
            ? flatItems.map(item => (
                <ExplorerRacFlatRow
                  key={item.id}
                  entry={item}
                  explorer={explorer}
                  toggleSelection={toggleSelection}
                />
              ))
            : root && (
                <ExplorerRacTreeRows
                  depth={0}
                  expandedKeys={expandedKeys}
                  explorer={explorer}
                  ids={rootIds}
                  onToggleExpanded={toggleExpandedKey}
                  toggleSelection={toggleSelection}
                />
              )}
          {!hasRows && null}
        </TableBody>
      </Table>
    </div>
  )
}

export function ExplorerRacPickerContent({
  explorer,
  options
}: ExplorerRacPickerContentProps) {
  return (
    <ExplorerModalContent className={styles.RacPicker()}>
      <main className={styles.RacPicker.main()}>
        <ExplorerRacTable explorer={explorer} options={options} />
      </main>
    </ExplorerModalContent>
  )
}
