import {Checkbox, Icon, Surface} from '#/components.js'
import styler from '@alinea/styler'
import {useAtomValue, useSetAtom} from 'jotai'
import type {ComponentType, MouseEvent, ReactNode} from 'react'
import {useMemo} from 'react'
import {
  Button as AriaButton,
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
  TableLayout,
  Virtualizer,
  type DragAndDropHooks,
  type Key
} from 'react-aria-components'
import type {TableLayoutProps} from 'react-stately/useVirtualizerState'
import {
  IcOutlineInsertDriveFile,
  IcRoundKeyboardArrowRight,
  LucideFile,
  LucideFolder
} from '../icons.js'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardEntryOverviewCell,
  DashboardExplorer
} from '../store.js'
import {dashboardEntryOverviewColumnCount} from '../store.js'
import {CompactField, compactFieldText} from './CompactField.js'
import css from './ExplorerTable.module.css'

const styles = styler(css)

interface ExplorerTableColumn {
  id: string
  index?: number
  kind: 'selection' | 'title' | 'overview' | 'children' | 'filler'
  minWidth?: number
  width: number | '1fr'
}

interface ExplorerTableRowProps {
  columnById: Map<Key, ExplorerTableColumn>
  columns: Array<ExplorerTableColumn>
  entry: DashboardEntry
  breadcrumbs: boolean
  containsMatches?: boolean
  matchingDescendantCount?: number
  unavailable?: boolean
  unselectable?: boolean
  partialSelection?: boolean
  onDoubleClick?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
  onOpenChildren?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
}

interface ExplorerTableDisplayRowProps {
  columnById: Map<Key, ExplorerTableColumn>
  columns: Array<ExplorerTableColumn>
  entry: DashboardEntry
  label: string
  icon: ComponentType
  cells: Array<DashboardEntryOverviewCell>
  breadcrumbs?: boolean | undefined
  parents: Array<DashboardEntry>
  rootLabel?: string
  childrenAmount?: number
  containsMatches?: boolean
  matchingDescendantCount?: number
  unavailable?: boolean
  unselectable?: boolean
  partialSelection?: boolean
  onDoubleClick?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
  onOpenChildren?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
}

interface ExplorerTableBreadcrumbsProps {
  entries: Array<DashboardEntry>
  rootLabel?: string
}

function ExplorerTableBreadcrumbs({
  entries,
  rootLabel
}: ExplorerTableBreadcrumbsProps) {
  return (
    <span className={styles.ExplorerTable.breadcrumbs()}>
      {entries.length === 0 && rootLabel && (
        <span className={styles.ExplorerTable.breadcrumb.root()}>
          {rootLabel}
        </span>
      )}
      {entries.map((entry, index) => (
        <span key={entry.id} className={styles.ExplorerTable.breadcrumb()}>
          <ExplorerTableBreadcrumb entry={entry} index={index} />
        </span>
      ))}
    </span>
  )
}

interface ExplorerTableBreadcrumbProps {
  entry: DashboardEntry
  index: number
}

function ExplorerTableBreadcrumb({entry, index}: ExplorerTableBreadcrumbProps) {
  const {data} = useAtomValue(entry.data)
  if (!data) return null
  return <ExplorerTableLoadedBreadcrumb data={data} index={index} />
}

interface ExplorerTableLoadedBreadcrumbProps {
  data: DashboardEntryData
  index: number
}

function ExplorerTableLoadedBreadcrumb({
  data,
  index
}: ExplorerTableLoadedBreadcrumbProps) {
  const label = useAtomValue(data.label)
  const root = useAtomValue(data.root)
  const rootLabel = useAtomValue(root.label)
  return (
    <>
      {index === 0 && (
        <span className={styles.ExplorerTable.breadcrumb.root()}>
          {rootLabel}
        </span>
      )}
      <span
        className={styles.ExplorerTable.breadcrumb.label()}
      >{`/ ${label}`}</span>
    </>
  )
}

function ExplorerTableDisplayRow({
  columnById,
  columns,
  entry,
  label,
  icon,
  cells,
  breadcrumbs,
  parents,
  rootLabel,
  childrenAmount,
  containsMatches,
  matchingDescendantCount,
  unavailable,
  unselectable,
  partialSelection,
  onDoubleClick,
  onOpenChildren
}: ExplorerTableDisplayRowProps) {
  function renderCell(columnOrId: ExplorerTableColumn | Key) {
    const column =
      typeof columnOrId === 'object' ? columnOrId : columnById.get(columnOrId)
    if (!column) return <Cell />
    if (column.kind === 'selection') {
      return (
        <Cell className={styles.ExplorerTable.cell.selection()}>
          {partialSelection ? (
            <span className={styles.ExplorerTable.dot()} />
          ) : !unselectable ? (
            <Checkbox
              slot="selection"
              className={styles.ExplorerTable.checkbox()}
              aria-label={`Select ${label}`}
            />
          ) : null}
        </Cell>
      )
    }
    if (column.kind === 'title') {
      return (
        <Cell className={styles.ExplorerTable.cell.title()} textValue={label}>
          <AriaButton
            slot="drag"
            className={styles.ExplorerTable.iconDrag()}
            aria-label={`Drag ${label}`}
          >
            <Icon icon={icon} className={styles.ExplorerTable.icon()} />
          </AriaButton>
          <span className={styles.ExplorerTable.field()}>
            {breadcrumbs && (
              <span className={styles.ExplorerTable.field.label()}>
                <ExplorerTableBreadcrumbs
                  entries={parents}
                  rootLabel={rootLabel}
                />
              </span>
            )}
            <span className={styles.ExplorerTable.field.value()}>{label}</span>
          </span>
        </Cell>
      )
    }
    if (column.kind === 'filler') {
      return <Cell className={styles.ExplorerTable.cell.filler()} />
    }
    if (column.kind === 'children') {
      const childrenActionAmount = matchingDescendantCount ?? childrenAmount
      const canOpenChildren = Boolean(
        onOpenChildren && childrenActionAmount && !unavailable
      )
      const childLabel = matchingDescendantCount
        ? 'matching entry'
        : 'child entry'
      return (
        <Cell className={styles.ExplorerTable.cell.children()}>
          {canOpenChildren && (
            <button
              type="button"
              className={styles.ExplorerTable.childrenAction()}
              aria-label={`Open ${childrenActionAmount} ${childLabel}${
                childrenActionAmount === 1 ? '' : 's'
              } of ${label}`}
              title={`Open ${childrenActionAmount} ${childLabel}${
                childrenActionAmount === 1 ? '' : 's'
              }`}
              onClick={event => onOpenChildren?.(entry, event)}
            >
              <Icon
                icon={IcOutlineInsertDriveFile}
                className={styles.ExplorerTable.childrenAction.icon()}
              />
              <span className={styles.ExplorerTable.childrenAction.badge()}>
                {childrenActionAmount}
              </span>
              <Icon
                icon={IcRoundKeyboardArrowRight}
                className={styles.ExplorerTable.childrenAction.icon()}
              />
            </button>
          )}
        </Cell>
      )
    }
    const cell =
      typeof column.index === 'number' ? cells[column.index] : undefined
    return (
      <Cell
        className={styles.ExplorerTable.cell()}
        textValue={
          cell
            ? `${cell.label} ${compactFieldText(cell.field, cell.value)}`
            : undefined
        }
      >
        {cell && (
          <span className={styles.ExplorerTable.field()}>
            <span className={styles.ExplorerTable.field.label()}>
              {cell.label}
            </span>
            <span className={styles.ExplorerTable.field.value()}>
              <CompactField field={cell.field} value={cell.value} />
            </span>
          </span>
        )}
      </Cell>
    )
  }
  return (
    <Row
      id={entry.id}
      textValue={label}
      className={styles.ExplorerTable.row()}
      columns={columns}
      data-navigable={childrenAmount && !unavailable ? true : undefined}
      data-contains-matches={containsMatches || undefined}
      data-unavailable={unavailable || undefined}
      data-unselectable={unselectable || undefined}
      dependencies={[
        columns,
        label,
        icon,
        cells,
        breadcrumbs,
        parents,
        childrenAmount,
        containsMatches,
        matchingDescendantCount,
        unavailable,
        unselectable,
        onDoubleClick,
        onOpenChildren
      ]}
      onDoubleClick={
        onDoubleClick ? event => onDoubleClick(entry, event) : undefined
      }
      style={{width: '100%', minWidth: '100%', height: 'inherit'}}
    >
      {renderCell}
    </Row>
  )
}

function ExplorerTableLoadingRow({
  columnById,
  columns,
  entry,
  breadcrumbs,
  containsMatches,
  matchingDescendantCount,
  unavailable,
  unselectable,
  partialSelection,
  onDoubleClick,
  onOpenChildren
}: ExplorerTableRowProps) {
  return (
    <ExplorerTableDisplayRow
      columnById={columnById}
      columns={columns}
      entry={entry}
      label="Loading entry"
      icon={LucideFile}
      cells={[]}
      breadcrumbs={breadcrumbs}
      childrenAmount={0}
      containsMatches={containsMatches}
      matchingDescendantCount={matchingDescendantCount}
      unavailable={unavailable}
      unselectable={unselectable}
      partialSelection={partialSelection}
      onDoubleClick={onDoubleClick}
      onOpenChildren={onOpenChildren}
      parents={[]}
    />
  )
}

interface ExplorerTableLoadedRowProps extends ExplorerTableRowProps {
  data: DashboardEntryData
}

function ExplorerTableLoadedRow({
  columnById,
  columns,
  data,
  entry,
  breadcrumbs,
  containsMatches,
  matchingDescendantCount,
  unavailable,
  unselectable,
  partialSelection,
  onDoubleClick,
  onOpenChildren
}: ExplorerTableLoadedRowProps) {
  const root = useAtomValue(data.root)
  const rootLabel = useAtomValue(root.label)
  const label = useAtomValue(data.label)
  const configuredIcon = useAtomValue(data.icon)
  const hasChildren = useAtomValue(data.hasChildren)
  const childrenAmount = useAtomValue(data.childrenAmount)
  const cells = useAtomValue(data.overviewCells)
  const parents = useAtomValue(data.parents)
  const icon = configuredIcon ?? (hasChildren ? LucideFolder : LucideFile)
  return (
    <ExplorerTableDisplayRow
      columnById={columnById}
      columns={columns}
      entry={entry}
      label={label}
      icon={icon}
      cells={cells}
      breadcrumbs={breadcrumbs}
      parents={parents}
      rootLabel={rootLabel}
      childrenAmount={childrenAmount}
      containsMatches={containsMatches}
      matchingDescendantCount={matchingDescendantCount}
      unavailable={unavailable}
      unselectable={unselectable}
      partialSelection={partialSelection}
      onDoubleClick={onDoubleClick}
      onOpenChildren={onOpenChildren}
    />
  )
}

function ExplorerTableRow(props: ExplorerTableRowProps) {
  const {data, pending} = useAtomValue(props.entry.data)
  if (pending || !data) return <ExplorerTableLoadingRow {...props} />
  return <ExplorerTableLoadedRow {...props} data={data} />
}

export interface ExplorerTableProps {
  dragAndDropHooks: DragAndDropHooks<DashboardEntry>
  explorer: DashboardExplorer
  items: Array<DashboardEntry>
  renderEmptyState: () => ReactNode
}

export function ExplorerTable({
  dragAndDropHooks,
  explorer,
  items,
  renderEmptyState
}: ExplorerTableProps) {
  const selected = useAtomValue(explorer.selection)
  const unavailableKeys = useAtomValue(explorer.unavailableKeys)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const matchingDescendantKeys = useAtomValue(explorer.matchingDescendantKeys)
  const matchingDescendantCounts = useAtomValue(
    explorer.matchingDescendantCounts
  )
  const partialSelectionKeys = useAtomValue(explorer.partialSelectionKeys)
  const setSelected = useSetAtom(explorer.setSelection)
  const onAction = useSetAtom(explorer.onAction)
  const onOpen = useSetAtom(explorer.onOpen)
  const selectionMode = explorer.selectionMode
  const breadcrumbs = explorer.breadcrumbs
  const hasSelection = selectionMode !== 'none'
  const showSelectionControls = hasSelection && explorer.showSelectionControls
  function onItemAction(key: Key) {
    const entry = items.find(item => item.id === String(key))
    if (entry) onAction(entry)
  }
  function onItemDoubleClick(
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) {
    event.preventDefault()
    event.stopPropagation()
    onOpen(entry)
  }
  function onOpenChildren(
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) {
    event.preventDefault()
    event.stopPropagation()
    onOpen(entry)
  }
  const onRowAction = explorer.hasRowAction ? onItemAction : undefined
  const onDoubleClick = explorer.hasDoubleClickAction
    ? onItemDoubleClick
    : undefined
  const openChildren = explorer.hasChildButtonAction
    ? onOpenChildren
    : undefined
  const columns = useMemo<Array<ExplorerTableColumn>>(
    () => [
      ...(showSelectionControls
        ? [{id: 'selection', kind: 'selection' as const, width: 30}]
        : []),
      {id: 'title', kind: 'title', width: 220},
      ...Array.from(
        {length: dashboardEntryOverviewColumnCount},
        (_, index) => ({
          id: `overview-${index}`,
          index,
          kind: 'overview' as const,
          minWidth: 120,
          width: '1fr' as const
        })
      ),
      ...(openChildren
        ? [{id: 'children', kind: 'children' as const, width: 112}]
        : [])
    ],
    [openChildren, showSelectionControls]
  )
  const columnById = useMemo(
    () => new Map(columns.map(column => [column.id, column] as const)),
    [columns]
  )
  const layoutOptions = useMemo<TableLayoutProps>(
    () => ({
      rowHeight: 44,
      headingHeight: 0,
      padding: 0,
      gap: 0
    }),
    []
  )
  return (
    <div className={styles.ExplorerTable.viewport()}>
      <Surface className={styles.ExplorerTable.surface()}>
        <Virtualizer layout={TableLayout} layoutOptions={layoutOptions}>
          <Table
            aria-label="Explorer entries"
            className={styles.ExplorerTable({
              noSelectionControls: !showSelectionControls
            })}
            dragAndDropHooks={dragAndDropHooks}
            selectedKeys={hasSelection ? selected : undefined}
            selectionBehavior={explorer.selectionBehavior}
            selectionMode={hasSelection ? selectionMode : undefined}
            onSelectionChange={hasSelection ? setSelected : undefined}
            onRowAction={onRowAction}
            style={{display: 'block', width: '100%', height: '100%'}}
          >
            <TableHeader
              className={styles.ExplorerTable.header()}
              columns={columns}
            >
              {column => (
                <Column
                  id={column.id}
                  isRowHeader={column.kind === 'title'}
                  maxWidth={column.kind === 'selection' ? 30 : undefined}
                  minWidth={column.kind === 'selection' ? 30 : column.minWidth}
                  width={column.width}
                  className={
                    column.kind === 'selection'
                      ? styles.ExplorerTable.column.selection()
                      : column.kind === 'filler'
                        ? styles.ExplorerTable.column.filler()
                        : styles.ExplorerTable.column()
                  }
                />
              )}
            </TableHeader>
            <TableBody
              className={styles.ExplorerTable.body()}
              dependencies={[
                columns,
                onDoubleClick,
                openChildren,
                matchingDescendantCounts,
                matchingDescendantKeys,
                partialSelectionKeys,
                unavailableKeys,
                unselectableKeys
              ]}
              items={items}
              renderEmptyState={() => null}
            >
              {item => (
                <ExplorerTableRow
                  breadcrumbs={breadcrumbs}
                  columnById={columnById}
                  columns={columns}
                  entry={item}
                  containsMatches={matchingDescendantKeys.has(item.id)}
                  matchingDescendantCount={matchingDescendantCounts.get(
                    item.id
                  )}
                  partialSelection={partialSelectionKeys.has(item.id)}
                  unavailable={unavailableKeys.has(item.id)}
                  unselectable={unselectableKeys.has(item.id)}
                  onDoubleClick={onDoubleClick}
                  onOpenChildren={openChildren}
                />
              )}
            </TableBody>
          </Table>
        </Virtualizer>
        {items.length === 0 && (
          <div className={styles.ExplorerTable.empty()}>
            {renderEmptyState()}
          </div>
        )}
      </Surface>
    </div>
  )
}
