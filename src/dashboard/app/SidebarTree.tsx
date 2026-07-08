import {Button, Icon, Tree, TreeItem} from '#/components.js'
import {assert} from '#/core/util/Assert.js'
import styler from '@alinea/styler'
import {useAtom, useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import {type ComponentType, memo, useEffect, useMemo} from 'react'
import {
  Collection,
  type Key,
  ListLayout,
  type Selection,
  useDragAndDrop,
  Virtualizer
} from 'react-aria-components'
import {
  IcOutlineArchive,
  IcRoundEdit,
  IcRoundTranslate,
  LucideFile,
  LucideFolder,
  RiFlashlightFill
} from '../icons.js'
import {
  Dashboard,
  type DashboardLocaleSelection,
  DashboardEntry,
  DashboardEntryData,
  type DashboardEntryTreeStatus,
  DashboardRoot,
  DashboardTree,
  DashboardWorkspace,
  createDashboardTreeSelection
} from '../store/Dashboard.js'
import css from './SidebarTree.module.css'
import {LocaleMenu} from './LocaleMenu.js'
import {SidebarBody} from './ui/Sidebar.js'

const styles = styler(css)

interface SidebarTreeProps {
  dashboard: Dashboard
}

export interface SidebarTreeExplorerProps {
  ariaLabel?: string
  deadEndKeys?: Set<Key>
  disableDragAndDrop?: boolean
  expandedKeys?: Set<Key>
  matchingDescendantKeys?: Set<Key>
  navigationStateActive?: boolean
  onRootPress?: () => void
  onSelectionChange?: (keys: Selection) => void
  root: DashboardRoot
  rootSelected?: boolean
  selectableKeys?: Set<Key>
  selectedKeys?: Set<Key>
  selectedLocale?: DashboardLocaleSelection
  workspace: DashboardWorkspace
}

interface SidebarItemProps {
  deadEndKeys?: Set<Key>
  item: DashboardEntry
  matchingDescendantKeys?: Set<Key>
  navigationOnly?: boolean
  navigationStateActive?: boolean
  selectableKeys?: Set<Key>
  tree: DashboardTree
}

interface SidebarStatusDisplay {
  icon: ComponentType
  label: string
  status: 'draft' | 'unpublished' | 'archived' | 'untranslated'
}

function sidebarStatus(
  treeStatus: DashboardEntryTreeStatus
): SidebarStatusDisplay | undefined {
  if (treeStatus.status === 'untranslated') {
    return {
      icon: IcRoundTranslate,
      label: 'Untranslated',
      status: 'untranslated'
    }
  }
  if (treeStatus.status === 'archived') {
    return {
      icon: IcOutlineArchive,
      label: 'Archived',
      status: 'archived'
    }
  }
  if (treeStatus.status === 'unpublished') {
    return {
      icon: RiFlashlightFill,
      label: 'Unpublished',
      status: 'unpublished'
    }
  }
  if (treeStatus.status === 'draft') {
    return {
      icon: IcRoundEdit,
      label: 'Draft',
      status: 'draft'
    }
  }
  return undefined
}

function affectedStatus(
  ownStatus: DashboardEntryTreeStatus,
  ancestorStatus: DashboardEntryTreeStatus | undefined
) {
  if (ancestorStatus?.status === 'archived') return ancestorStatus
  if (ancestorStatus?.status === 'unpublished') return ancestorStatus
  return ownStatus
}

const SidebarItem = memo(function SidebarItem({
  deadEndKeys,
  item,
  matchingDescendantKeys,
  navigationOnly,
  navigationStateActive,
  selectableKeys,
  tree
}: SidebarItemProps) {
  const {pending, data} = useAtomValue(item.data)
  if (!data) return <SidebarLoadingItem item={item} pending={pending} />
  return (
    <SidebarLoadedItem
      deadEndKeys={deadEndKeys}
      item={item}
      data={data}
      matchingDescendantKeys={matchingDescendantKeys}
      navigationOnly={navigationOnly}
      navigationStateActive={navigationStateActive}
      pending={pending}
      selectableKeys={selectableKeys}
      tree={tree}
    />
  )
})

interface SidebarLoadingItemProps {
  item: DashboardEntry
  pending: boolean
}

function SidebarLoadingItem({item, pending}: SidebarLoadingItemProps) {
  return (
    <TreeItem
      id={item.id}
      textValue="Loading entry"
      title="Loading entry"
      icon={LucideFile}
      label={
        <span
          className={styles.SidebarTree.itemSkeleton.label()}
          aria-hidden="true"
        />
      }
      className={styles.SidebarTree.item({loading: true})}
      suffix={
        pending ? (
          <span
            className={styles.SidebarTree.itemLoading()}
            aria-hidden="true"
          />
        ) : undefined
      }
    />
  )
}

interface SidebarLoadedItemProps {
  deadEndKeys?: Set<Key>
  item: DashboardEntry
  data: DashboardEntryData
  matchingDescendantKeys?: Set<Key>
  navigationOnly?: boolean
  navigationStateActive?: boolean
  tree: DashboardTree
  pending: boolean
  selectableKeys?: Set<Key>
}

const SidebarLoadedItem = memo(function SidebarLoadedItem({
  deadEndKeys,
  item,
  data,
  matchingDescendantKeys,
  navigationOnly,
  navigationStateActive,
  tree,
  pending,
  selectableKeys
}: SidebarLoadedItemProps) {
  const label = useAtomValue(data.label)
  const isExpanded = useAtomValue(tree.isExpanded(item))
  const status = useAtomValue(data.treeStatus)
  const selectedAncestorStatus = useAtomValue(
    useMemo(() => unwrap(tree.selectedAncestorStatus(item)), [item, tree])
  )
  const childItemsAtom = useMemo(() => tree.children(item), [item, tree])
  const childItems = useAtomValue(childItemsAtom)
  const type = useAtomValue(data.type)
  let icon = useAtomValue(data.icon)
  const hasChildren = useAtomValue(data.hasChildren)
  const canNavigate = hasChildren || Boolean(type.contains?.length)
  const containsMatches = matchingDescendantKeys?.has(item.id) ?? false
  const selectable = selectableKeys?.has(item.id) ?? false
  const navigationLeaf = Boolean(navigationOnly && !canNavigate)
  const deadEnd = Boolean(
    navigationOnly &&
    navigationStateActive &&
    (deadEndKeys?.has(item.id) ?? (canNavigate && !containsMatches))
  )
  const disabledForNavigation = navigationLeaf || deadEnd
  if (!icon) icon = canNavigate ? LucideFolder : LucideFile
  const isLoadingChildren =
    hasChildren && isExpanded && childItems === undefined
  const displayStatus = sidebarStatus(status)
  const rowStatus = affectedStatus(status, selectedAncestorStatus)
  const isArchived = rowStatus.status === 'archived'
  const isUnpublished = rowStatus.status === 'unpublished'

  return (
    <TreeItem
      id={item.id}
      textValue={label}
      title={label}
      hasChildItems={hasChildren}
      icon={icon}
      isDisabled={disabledForNavigation}
      className={styles.SidebarTree.item({
        archived: isArchived,
        deadEnd,
        unpublished: isUnpublished,
        untranslated: status.status === 'untranslated',
        navigationLeaf,
        parentSelected: selectedAncestorStatus !== undefined,
        selectable
      })}
      suffix={
        isLoadingChildren || pending ? (
          <span
            className={styles.SidebarTree.itemLoading()}
            aria-hidden="true"
          />
        ) : displayStatus ? (
          <span
            className={styles.SidebarTree.status({
              [displayStatus.status]: true
            })}
            aria-label={displayStatus.label}
            role="img"
            title={displayStatus.label}
          >
            <Icon icon={displayStatus.icon} />
          </span>
        ) : undefined
      }
    >
      {isExpanded && childItems && (
        <Collection items={childItems}>
          {child => (
            <SidebarItem
              deadEndKeys={deadEndKeys}
              item={child}
              matchingDescendantKeys={matchingDescendantKeys}
              navigationOnly={navigationOnly}
              navigationStateActive={navigationStateActive}
              selectableKeys={selectableKeys}
              tree={tree}
            />
          )}
        </Collection>
      )}
    </TreeItem>
  )
})

const treeLayoutOptions = {
  rowHeight: 32,
  padding: 0,
  gap: 0
}

interface SidebarTreeBodyProps {
  ariaLabel?: string
  deadEndKeys?: Set<Key>
  disableDragAndDrop?: boolean
  matchingDescendantKeys?: Set<Key>
  navigationOnly?: boolean
  navigationStateActive?: boolean
  onSelectionChange?: (keys: Selection) => void
  root: DashboardRoot
  selectableKeys?: Set<Key>
  selectedKeys?: Set<Key>
  tree: DashboardTree
}

interface SidebarTreeContentProps extends SidebarTreeBodyProps {
  onRootPress?: () => void
  root: DashboardRoot
  rootSelected?: boolean
  selectedLocale?: DashboardLocaleSelection
}

const SidebarTreeBody = memo(function SidebarTreeBody({
  ariaLabel = 'Content tree',
  deadEndKeys,
  disableDragAndDrop = false,
  matchingDescendantKeys,
  navigationOnly,
  navigationStateActive,
  onSelectionChange,
  root,
  selectableKeys,
  selectedKeys,
  tree
}: SidebarTreeBodyProps) {
  const [treeSelectedKeys, setTreeSelectedKeys] = useAtom(tree.selectedKeys)
  const [expandedKeys, setExpandedKeys] = useAtom(tree.expandedKeys)
  const rootChildren = useAtomValue(root.children)
  const items = rootChildren.map(id => tree.entryItems(id))
  const dragDisabled = useAtomValue(tree.dragDisabled)
  const getItems = useSetAtom(tree.getItems)
  const getDropOperation = useSetAtom(tree.getDropOperation)
  const onInsert = useSetAtom(tree.onInsert)
  const onItemDrop = useSetAtom(tree.onItemDrop)
  const onMove = useSetAtom(tree.onMove)
  const {dragAndDropHooks} = useDragAndDrop<DashboardEntry>({
    acceptedDragTypes: tree.acceptedDragTypes,
    getItems,
    isDisabled: disableDragAndDrop || dragDisabled,
    getDropOperation,
    onInsert,
    onItemDrop,
    onMove
  })
  const controlledSelection =
    selectedKeys !== undefined && onSelectionChange !== undefined
  return (
    <div className={styles.SidebarTree.tree.viewport()}>
      <Virtualizer layout={ListLayout} layoutOptions={treeLayoutOptions}>
        <Tree
          aria-label={ariaLabel}
          items={items}
          dragAndDropHooks={dragAndDropHooks}
          selectionMode="single"
          selectionBehavior="replace"
          disallowEmptySelection={!controlledSelection}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          selectedKeys={controlledSelection ? selectedKeys : treeSelectedKeys}
          onSelectionChange={
            controlledSelection ? onSelectionChange : setTreeSelectedKeys
          }
        >
          {item => (
            <SidebarItem
              deadEndKeys={deadEndKeys}
              item={item}
              matchingDescendantKeys={matchingDescendantKeys}
              navigationOnly={navigationOnly}
              navigationStateActive={navigationStateActive}
              selectableKeys={selectableKeys}
              tree={tree}
            />
          )}
        </Tree>
      </Virtualizer>
    </div>
  )
})

function SidebarTreeRootButton({
  onPress,
  root,
  selected,
  selectedLocale
}: {
  onPress?: () => void
  root: DashboardRoot
  selected: boolean
  selectedLocale?: DashboardLocaleSelection
}) {
  const label = useAtomValue(root.label)
  const icon = useAtomValue(root.icon)
  const i18n = useAtomValue(root.i18n)
  return (
    <div className={styles.SidebarTree.rootButton({selected})}>
      <Button
        appearance="plain"
        className={styles.SidebarTree.rootButton.action()}
        icon={icon}
        onPress={onPress}
      >
        <span className={styles.SidebarTree.rootButton.label()}>{label}</span>
      </Button>
      {i18n && i18n.locales.length > 0 && (
        <span className={styles.SidebarTree.rootButton.locale()}>
          <LocaleMenu root={root} selectedLocale={selectedLocale} />
        </span>
      )}
    </div>
  )
}

function SidebarTreeContent({
  onRootPress,
  root,
  rootSelected = false,
  selectedLocale,
  ...bodyProps
}: SidebarTreeContentProps) {
  return (
    <SidebarBody>
      <div className={styles.SidebarTree.tree()}>
        <div className={styles.SidebarTree.root()}>
          <SidebarTreeRootButton
            root={root}
            selected={rootSelected}
            selectedLocale={selectedLocale}
            onPress={onRootPress}
          />
        </div>
        <SidebarTreeBody root={root} {...bodyProps} />
      </div>
    </SidebarBody>
  )
}

export const SidebarTree = memo(function SidebarTree({
  dashboard
}: SidebarTreeProps) {
  const workspace = useAtomValue(dashboard.currentWorkspace)
  assert(workspace, 'No workspace selected')
  const selectedWorkspace = workspace
  const currentRoot = useAtomValue(dashboard.currentRoot)
  const route = useAtomValue(dashboard.route)
  const setRoute = useSetAtom(dashboard.route)
  function onRootPress() {
    if (!currentRoot) return
    setRoute({
      workspace: selectedWorkspace.key,
      root: currentRoot.key,
      locale: route.locale
    })
  }
  return (
    <>
      {currentRoot && (
        <SidebarTreeContent
          root={currentRoot}
          rootSelected={!route.entry}
          tree={selectedWorkspace.tree}
          onRootPress={onRootPress}
        />
      )}
    </>
  )
})

export const SidebarTreeExplorer = memo(function SidebarTreeExplorer({
  ariaLabel = 'Explorer folders',
  deadEndKeys,
  disableDragAndDrop = true,
  expandedKeys,
  matchingDescendantKeys,
  navigationStateActive,
  onRootPress,
  onSelectionChange,
  root,
  rootSelected = false,
  selectableKeys,
  selectedKeys,
  selectedLocale,
  workspace
}: SidebarTreeExplorerProps) {
  const tree = useMemo(
    () =>
      new DashboardTree(workspace, createDashboardTreeSelection(), {
        syncRouteExpansion: false
      }),
    [workspace]
  )
  const [treeExpandedKeys, setTreeExpandedKeys] = useAtom(tree.expandedKeys)
  useEffect(() => {
    if (!expandedKeys || expandedKeys.size === 0) return
    const merged = new Set(treeExpandedKeys)
    let changed = false
    for (const key of expandedKeys) {
      if (merged.has(key)) continue
      merged.add(key)
      changed = true
    }
    if (changed) setTreeExpandedKeys(merged)
  }, [expandedKeys, setTreeExpandedKeys, treeExpandedKeys])
  return (
    <SidebarTreeContent
      ariaLabel={ariaLabel}
      deadEndKeys={deadEndKeys}
      disableDragAndDrop={disableDragAndDrop}
      matchingDescendantKeys={matchingDescendantKeys}
      navigationOnly
      navigationStateActive={navigationStateActive}
      onRootPress={onRootPress}
      onSelectionChange={onSelectionChange}
      root={root}
      selectableKeys={selectableKeys}
      rootSelected={rootSelected}
      selectedKeys={selectedKeys}
      selectedLocale={selectedLocale}
      tree={tree}
    />
  )
})
