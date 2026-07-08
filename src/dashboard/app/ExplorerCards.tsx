import {Checkbox, Icon, Surface} from '#/components.js'
import styler from '@alinea/styler'
import {Size} from '@react-stately/virtualizer'
import {useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import type {ComponentType, MouseEvent, ReactNode} from 'react'
import {Fragment, memo, useMemo} from 'react'
import {
  Button as AriaButton,
  type DragAndDropHooks,
  GridLayout,
  type GridLayoutOptions,
  GridList,
  GridListItem,
  type Key,
  Virtualizer
} from 'react-aria-components'
import {
  IcRoundKeyboardArrowRight,
  IcTwotoneDescription,
  IcTwotoneFolder
} from '../icons.js'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardExplorer
} from '../store.js'
import css from './ExplorerCards.module.css'
import {ExplorerFileCard} from './ExplorerFileCard.js'

const styles = styler(css)

const cardLayoutOptions: GridLayoutOptions = {
  minItemSize: new Size(240, 196),
  maxItemSize: new Size(320, 196),
  minSpace: new Size(16, 16),
  maxColumns: 5,
  preserveAspectRatio: true
}

interface ExplorerCardItemProps {
  entry: DashboardEntry
  containsMatches?: boolean
  matchingDescendantCount?: number
  partialSelection?: boolean
  unavailable?: boolean
  unselectable?: boolean
  onDoubleClick?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
  showSelectionControls: boolean
}

const ExplorerCardItem = memo(function ExplorerCardItem({
  entry,
  containsMatches,
  matchingDescendantCount,
  partialSelection,
  unavailable,
  unselectable,
  onDoubleClick,
  showSelectionControls
}: ExplorerCardItemProps) {
  const {data} = useAtomValue(entry.data)
  if (!data)
    return (
      <ExplorerCardLoadingItem
        entry={entry}
        containsMatches={containsMatches}
        matchingDescendantCount={matchingDescendantCount}
        partialSelection={partialSelection}
        unavailable={unavailable}
        unselectable={unselectable}
        onDoubleClick={onDoubleClick}
        showSelectionControls={showSelectionControls}
      />
    )
  return (
    <ExplorerCardLoadedItem
      entry={entry}
      data={data}
      showSelectionControls={showSelectionControls}
      containsMatches={containsMatches}
      matchingDescendantCount={matchingDescendantCount}
      partialSelection={partialSelection}
      unavailable={unavailable}
      unselectable={unselectable}
      onDoubleClick={onDoubleClick}
    />
  )
})

interface ExplorerCardLoadingItemProps {
  entry: DashboardEntry
  containsMatches?: boolean
  matchingDescendantCount?: number
  partialSelection?: boolean
  unavailable?: boolean
  unselectable?: boolean
  onDoubleClick?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
  showSelectionControls: boolean
}

function ExplorerCardLoadingItem({
  entry,
  containsMatches,
  matchingDescendantCount,
  partialSelection,
  unavailable,
  unselectable,
  onDoubleClick,
  showSelectionControls
}: ExplorerCardLoadingItemProps) {
  return (
    <GridListItem
      id={entry.id}
      textValue="Loading entry"
      className={styles.ExplorerCards.item({loading: true})}
      aria-label="Loading entry"
      data-contains-matches={containsMatches || undefined}
      data-unavailable={unavailable || undefined}
      data-unselectable={unselectable || undefined}
      onDoubleClick={
        onDoubleClick ? event => onDoubleClick(entry, event) : undefined
      }
    >
      {showSelectionControls && (
        <ExplorerCardSelectionControl
          containsMatches={containsMatches}
          label="Loading entry"
          matchingDescendantCount={matchingDescendantCount}
          partialSelection={partialSelection}
          unselectable={unselectable}
        />
      )}
      <Surface className={styles.ExplorerCards.item.card()}>
        <div className={styles.ExplorerCards.entry()}>
          <div className={styles.ExplorerCards.entry.top()}>
            <div
              className={styles.ExplorerCards.entry.iconSkeleton()}
              aria-hidden="true"
            />
          </div>
          <div className={styles.ExplorerCards.entry.body()}>
            <div className={styles.ExplorerCards.entry.body.inner()}>
              <div
                className={styles.ExplorerCards.entry.skeleton({wide: true})}
              />
              <div className={styles.ExplorerCards.entry.skeleton()} />
            </div>
          </div>
        </div>
      </Surface>
    </GridListItem>
  )
}

interface ExplorerCardLoadedItemProps {
  entry: DashboardEntry
  data: DashboardEntryData
  containsMatches?: boolean
  matchingDescendantCount?: number
  partialSelection?: boolean
  unavailable?: boolean
  unselectable?: boolean
  onDoubleClick?: (
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) => void
  showSelectionControls: boolean
}

const ExplorerCardLoadedItem = memo(function ExplorerCardLoadedItem({
  entry,
  data,
  containsMatches,
  matchingDescendantCount,
  partialSelection,
  unavailable,
  unselectable,
  onDoubleClick,
  showSelectionControls
}: ExplorerCardLoadedItemProps) {
  const label = useAtomValue(data.label)
  const icon = useAtomValue(data.icon)
  const type = useAtomValue(data.type)
  const hasChildren = useAtomValue(data.hasChildren)
  const info = useAtomValue(
    useMemo(() => unwrap(data.fileInfo, previous => previous ?? null), [data])
  )
  const fallbackIcon = hasChildren ? IcTwotoneFolder : IcTwotoneDescription
  return (
    <GridListItem
      id={entry.id}
      textValue={label}
      className={styles.ExplorerCards.item()}
      data-navigable={hasChildren && !unavailable ? true : undefined}
      data-contains-matches={containsMatches || undefined}
      data-unavailable={unavailable || undefined}
      data-unselectable={unselectable || undefined}
      onDoubleClick={
        onDoubleClick ? event => onDoubleClick(entry, event) : undefined
      }
    >
      {showSelectionControls && (
        <ExplorerCardSelectionControl
          containsMatches={containsMatches}
          label={label}
          matchingDescendantCount={matchingDescendantCount}
          partialSelection={partialSelection}
          unselectable={unselectable}
        />
      )}
      <AriaButton
        slot="drag"
        aria-label={`Drag ${label}`}
        className={styles.ExplorerCards.item.drag.handle()}
      />
      <Surface
        className={styles.ExplorerCards.item.card({file: Boolean(info)})}
      >
        {info ? (
          <ExplorerFileCard file={info} label={label} layout="card" />
        ) : (
          <ExplorerEntryCard
            icon={icon ?? fallbackIcon}
            label={label}
            typeLabel={type.label}
          />
        )}
      </Surface>
    </GridListItem>
  )
})

interface ExplorerCardSelectionControlProps {
  containsMatches?: boolean
  label: string
  matchingDescendantCount?: number
  partialSelection?: boolean
  unselectable?: boolean
}

function ExplorerCardSelectionControl({
  label,
  partialSelection,
  unselectable
}: ExplorerCardSelectionControlProps) {
  if (partialSelection)
    return <span className={styles.ExplorerCards.item.dot()} />
  if (unselectable) return null
  return (
    <Checkbox
      slot="selection"
      className={styles.ExplorerCards.item.checkbox()}
      aria-label={`Select ${label}`}
    />
  )
}

interface ExplorerEntryCardProps {
  icon?: ComponentType
  label: string
  parents?: ReactNode
  typeLabel: string
}

function ExplorerEntryCard({
  icon,
  label,
  parents,
  typeLabel
}: ExplorerEntryCardProps) {
  return (
    <div className={styles.ExplorerCards.entry()}>
      <div className={styles.ExplorerCards.entry.top()}>
        {icon && (
          <Icon icon={icon} className={styles.ExplorerCards.entry.icon()} />
        )}
      </div>
      <div className={styles.ExplorerCards.entry.body()}>
        <div className={styles.ExplorerCards.entry.body.inner()}>
          {parents}
          <div className={styles.ExplorerCards.entry.label()}>{label}</div>
          <div className={styles.ExplorerCards.entry.meta()}>{typeLabel}</div>
        </div>
      </div>
    </div>
  )
}

interface ExplorerCardParentsProps {
  loading: boolean
  parentIds: Array<string>
  parents: Array<DashboardEntry>
}

function ExplorerCardParents({
  loading,
  parentIds,
  parents
}: ExplorerCardParentsProps) {
  if (loading && parentIds.length > 0) return <ExplorerCardParentsLoading />
  if (parents.length === 0) return null
  return (
    <div className={styles.ExplorerCards.parents()}>
      {parents
        .map<ReactNode>(parent => (
          <ExplorerCardParent key={parent.id} parent={parent} />
        ))
        .reduce((prev, curr, index) => [
          prev,
          <IcRoundKeyboardArrowRight
            aria-hidden
            className={styles.ExplorerCards.parents.separator()}
            key={`separator-${index}`}
          />,
          curr
        ])}
    </div>
  )
}

function ExplorerCardParentsLoading() {
  return (
    <div className={styles.ExplorerCards.parents()}>
      <span
        className={styles.ExplorerCards.parents.skeleton({wide: true})}
        aria-hidden="true"
      />
      <IcRoundKeyboardArrowRight
        aria-hidden
        className={styles.ExplorerCards.parents.separator()}
      />
      <span
        className={styles.ExplorerCards.parents.skeleton()}
        aria-hidden="true"
      />
    </div>
  )
}

interface ExplorerCardParentProps {
  parent: DashboardEntry
}

function ExplorerCardParent({parent}: ExplorerCardParentProps) {
  const {data} = useAtomValue(parent.data)
  if (!data) return null
  return <ExplorerCardLoadedParent parent={data} />
}

interface ExplorerCardLoadedParentProps {
  parent: DashboardEntryData
}

function ExplorerCardLoadedParent({parent}: ExplorerCardLoadedParentProps) {
  const label = useAtomValue(parent.label)
  return <Fragment>{label}</Fragment>
}

export interface ExplorerCardsProps {
  dragAndDropHooks: DragAndDropHooks<DashboardEntry>
  explorer: DashboardExplorer
  items: Array<DashboardEntry>
  renderEmptyState: () => ReactNode
}

export function ExplorerCards({
  dragAndDropHooks,
  explorer,
  items,
  renderEmptyState
}: ExplorerCardsProps) {
  const selected = useAtomValue(explorer.selection)
  const unavailableKeys = useAtomValue(explorer.unavailableKeys)
  const unselectableKeys = useAtomValue(explorer.unselectableKeys)
  const matchingDescendantKeys = useAtomValue(explorer.matchingDescendantKeys)
  const matchingDescendantCounts = useAtomValue(
    explorer.matchingDescendantCounts
  )
  const partialSelectionKeys = useAtomValue(explorer.partialSelectionKeys)
  const setSelected = useSetAtom(explorer.setSelection)
  const performAction = useSetAtom(explorer.onAction)
  const openEntry = useSetAtom(explorer.onOpen)
  const selectionMode = explorer.selectionMode
  const hasSelection = selectionMode !== 'none'
  const showSelectionControls = hasSelection && explorer.showSelectionControls
  function onItemAction(key: Key) {
    const entry = items.find(item => item.id === String(key))
    if (entry) performAction(entry)
  }
  function onItemDoubleClick(
    entry: DashboardEntry,
    event: MouseEvent<HTMLElement>
  ) {
    event.preventDefault()
    event.stopPropagation()
    openEntry(entry)
  }
  const onAction = explorer.hasRowAction ? onItemAction : undefined
  const onDoubleClick = explorer.hasDoubleClickAction
    ? onItemDoubleClick
    : undefined
  return (
    <div className={styles.ExplorerCards.viewport()}>
      <Virtualizer layout={GridLayout} layoutOptions={cardLayoutOptions}>
        <GridList
          aria-label="Explorer entries"
          items={items}
          layout="grid"
          className={styles.ExplorerCards()}
          selectionMode={hasSelection ? selectionMode : undefined}
          selectionBehavior={explorer.selectionBehavior}
          dragAndDropHooks={dragAndDropHooks}
          selectedKeys={hasSelection ? selected : undefined}
          onSelectionChange={hasSelection ? setSelected : undefined}
          onAction={onAction}
          renderEmptyState={renderEmptyState}
          style={{display: 'block', width: '100%', height: '100%'}}
        >
          {item => (
            <ExplorerCardItem
              entry={item}
              containsMatches={matchingDescendantKeys.has(item.id)}
              matchingDescendantCount={matchingDescendantCounts.get(item.id)}
              partialSelection={partialSelectionKeys.has(item.id)}
              unavailable={unavailableKeys.has(item.id)}
              unselectable={unselectableKeys.has(item.id)}
              onDoubleClick={onDoubleClick}
              showSelectionControls={showSelectionControls}
            />
          )}
        </GridList>
      </Virtualizer>
    </div>
  )
}
