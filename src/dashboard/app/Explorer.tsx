import {Badge} from '#/dashboard/app/Badge.js'
import {
  Button,
  Icon,
  Popover,
  SearchField,
  Checkbox,
  Link
} from '#/components.js'
import {ViewToggle} from '#/dashboard/app/ViewToggle.js'
import styler from '@alinea/styler'
import {useAtom, useAtomValue, useSetAtom} from 'jotai'
import {unwrap} from 'jotai/utils'
import {
  useEffect,
  useMemo,
  useState,
  startTransition,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode
} from 'react'
import {DialogTrigger, FileTrigger, type Key} from 'react-aria-components'
import {
  IcRoundArrowDownward,
  IcRoundArrowUpward,
  IcRoundClose,
  IcRoundFilterList,
  IcRoundUploadFile,
  IcRoundCheckBox,
  IcRoundCheckBoxOutlineBlank
} from '../icons.js'
import type {
  DashboardEntry,
  DashboardEntryData,
  DashboardRoot
} from '../store.js'
import {
  DashboardExplorer,
  ExplorerSort,
  ExplorerSortBy,
  ExplorerTypeFilterOption
} from '../store.js'
import {EditorBackButton} from './EditorBackButton.js'
import css from './Explorer.module.css'
import {ExplorerList} from './ExplorerList.js'
import {MutationQueueStatus} from './MutationQueueStatus.js'
import {RailBody, RailHeader} from './ui/Rail.js'

const styles = styler(css)

export interface ExplorerProps {
  controls?: ReactNode
  explorer: DashboardExplorer
  titleControls?: ReactNode
}

export interface ExplorerHeaderProps {
  autoFocusSearch?: boolean
  controls?: ReactNode
  explorer: DashboardExplorer
  titleControls?: ReactNode
}

export interface ExplorerBodyProps {
  explorer: DashboardExplorer
}

interface ExplorerSearchProps {
  autoFocus?: boolean
  explorer: DashboardExplorer
}

interface ExplorerHeaderMainProps {
  explorer: DashboardExplorer
  titleControls?: ReactNode
}

interface ExplorerHeaderLoadedParentMainProps {
  data: DashboardEntryData
  explorer: DashboardExplorer
  titleControls?: ReactNode
}

interface ExplorerHeaderParentMainProps {
  explorer: DashboardExplorer
  parent: DashboardEntry
  titleControls?: ReactNode
}

function ExplorerSearch({autoFocus, explorer}: ExplorerSearchProps) {
  const items = useAtomValue(
    useMemo(
      () => unwrap(explorer.items, previous => previous ?? []),
      [explorer]
    )
  )
  const [selection, setSelection] = useAtom(explorer.selection)
  const search = useAtomValue(explorer.search)
  const setSearch = useSetAtom(explorer.search)
  const performAction = useSetAtom(explorer.onAction)
  const [inputValue, setInputValue] = useState(search)
  const [isPending, startTransition] = useTransition()

  function selectEntry(entry: DashboardEntry | undefined) {
    if (!entry) return
    setSelection(new Set<Key>([entry.id]))
  }

  function selectedEntry() {
    if (selection === 'all') return undefined
    const [selected] = selection
    if (selected === undefined) return undefined
    return items.find(item => item.id === String(selected))
  }

  useEffect(() => {
    if (!explorer.autoSelectFirstItem || !explorer.hasSelection) return
    if (items.length === 0) {
      if (selection !== 'all' && selection.size > 0)
        setSelection(new Set<Key>())
      return
    }
    if (!selectedEntry()) selectEntry(items[0])
  }, [explorer, items, selection, setSelection])

  function onSearchChange(value: string) {
    setInputValue(value)
    startTransition(() => {
      if (explorer.hasSelection) setSelection(new Set<Key>())
      setSearch(value)
    })
  }

  function selectedIndex() {
    const entry = selectedEntry()
    if (!entry) return -1
    return items.findIndex(item => item.id === entry.id)
  }

  function moveSelection(direction: 1 | -1) {
    if (!explorer.hasSelection || items.length === 0) return
    const current = selectedIndex()
    const next =
      current === -1
        ? direction === 1
          ? 0
          : items.length - 1
        : Math.max(0, Math.min(items.length - 1, current + direction))
    selectEntry(items[next])
  }

  function onSearchKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveSelection(-1)
    } else if (event.key === 'Enter') {
      const entry =
        selectedEntry() ?? (explorer.autoSelectFirstItem ? items[0] : undefined)
      if (!entry) return
      event.preventDefault()
      performAction(entry)
    }
  }

  return (
    <SearchField
      aria-label="Search"
      autoFocus={autoFocus}
      className={styles.Explorer.search()}
      hasIcon
      isPending={isPending}
      placeholder="Search..."
      value={inputValue}
      onChange={onSearchChange}
      onKeyDown={onSearchKeyDown}
    />
  )
}

function ExplorerHeaderLoadedParentMain({
  data,
  explorer,
  titleControls
}: ExplorerHeaderLoadedParentMainProps) {
  const label = useAtomValue(data.label)
  const parents = useAtomValue(data.parents)
  const setLocation = useSetAtom(explorer.location)
  const parent = parents.at(-1)
  const interaction = explorer.interaction
  const showBreadcrumbs = explorer.showsBreadcrumbNavigation
  return (
    <div className={styles.ExplorerHeader.main()}>
      {interaction.showBackButton && (
        <EditorBackButton
          label={parent ? 'Back to parent entry' : 'Back to root'}
          onPress={() => {
            setLocation(location => ({
              ...location,
              parentId: parent?.id
            }))
          }}
        />
      )}
      {showBreadcrumbs ? (
        <ExplorerBreadcrumbNavigation explorer={explorer} />
      ) : (
        <h1 className={styles.ExplorerHeader.title()}>{label}</h1>
      )}
      {titleControls}
    </div>
  )
}

interface ExplorerBreadcrumbNavigationProps {
  explorer: DashboardExplorer
}

interface ExplorerBreadcrumbButtonProps {
  action: 'click' | 'doubleClick'
  children: ReactNode
  current?: boolean
  onNavigate: () => void
}

function ExplorerBreadcrumbButton({
  action,
  children,
  current,
  onNavigate
}: ExplorerBreadcrumbButtonProps) {
  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (action !== 'click') return
    event.preventDefault()
    event.stopPropagation()
    onNavigate()
  }
  function onDoubleClick(event: MouseEvent<HTMLButtonElement>) {
    if (action !== 'doubleClick') return
    event.preventDefault()
    event.stopPropagation()
    onNavigate()
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    onNavigate()
  }
  return (
    <button
      type="button"
      className={styles.ExplorerHeader.breadcrumb.button({current})}
      aria-current={current ? 'page' : undefined}
      title={action === 'doubleClick' ? 'Double click to open' : undefined}
      onClick={action === 'click' ? onClick : undefined}
      onDoubleClick={action === 'doubleClick' ? onDoubleClick : undefined}
      onKeyDown={action === 'doubleClick' ? onKeyDown : undefined}
    >
      {children}
    </button>
  )
}

function ExplorerBreadcrumbNavigation({
  explorer
}: ExplorerBreadcrumbNavigationProps) {
  const root = useAtomValue(explorer.root)
  if (!root) return null
  return <ExplorerLoadedBreadcrumbNavigation explorer={explorer} root={root} />
}

function ExplorerLoadedBreadcrumbNavigation({
  explorer,
  root
}: ExplorerBreadcrumbNavigationProps & {root: DashboardRoot}) {
  const workspace = useAtomValue(explorer.workspace)
  const parents = useAtomValue(explorer.parentsMenu)
  const rootMenu = useAtomValue(workspace.rootMenu)
  const rootLabel = useAtomValue(root.label)
  const setLocation = useSetAtom(explorer.location)
  const interaction = explorer.interaction
  const action = interaction.breadcrumbAction
  function navigate(parentId?: string) {
    startTransition(() => {
      setLocation(location => ({...location, parentId}))
    })
  }
  function navigateRoot(rootId: string) {
    startTransition(() => {
      setLocation(location => ({
        ...location,
        root: rootId,
        parentId: undefined
      }))
    })
  }
  return (
    <nav
      className={styles.ExplorerHeader.breadcrumbs()}
      aria-label="Explorer location"
    >
      {interaction.showRootDropdown && rootMenu.length > 1 ? (
        <DialogTrigger>
          <Button
            appearance="plain"
            className={styles.ExplorerHeader.breadcrumb.button({
              current: parents.length === 0
            })}
          >
            {rootLabel}
          </Button>
          <Popover placement="bottom left">
            <div className={styles.ExplorerHeader.rootMenu()}>
              {rootMenu.map(item => (
                <Button
                  key={item.id}
                  appearance={item.id === root.key ? 'active' : 'plain'}
                  className={styles.ExplorerHeader.rootMenu.item()}
                  icon={item.icon}
                  onPress={() => navigateRoot(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Popover>
        </DialogTrigger>
      ) : (
        <ExplorerBreadcrumbButton
          action="click"
          current={parents.length === 0}
          onNavigate={() => navigate()}
        >
          {rootLabel}
        </ExplorerBreadcrumbButton>
      )}
      {parents.map((item, index) => (
        <ExplorerBreadcrumbButton
          key={item.id}
          action={action}
          current={index === parents.length - 1}
          onNavigate={() => navigate(item.id)}
        >
          {item.label}
        </ExplorerBreadcrumbButton>
      ))}
    </nav>
  )
}

function ExplorerHeaderMain({
  explorer,
  titleControls
}: ExplorerHeaderMainProps) {
  const root = useAtomValue(explorer.root)
  const parent = useAtomValue(explorer.parent)
  if (parent) {
    return (
      <ExplorerHeaderParentMain
        parent={parent}
        explorer={explorer}
        titleControls={titleControls}
      />
    )
  }
  if (root && (titleControls || explorer.showsBreadcrumbNavigation)) {
    return (
      <div className={styles.ExplorerHeader.main()}>
        {explorer.showsBreadcrumbNavigation && (
          <ExplorerBreadcrumbNavigation explorer={explorer} />
        )}
        {titleControls}
      </div>
    )
  }
  return null
}

function ExplorerHeaderParentMain({
  explorer,
  parent,
  titleControls
}: ExplorerHeaderParentMainProps) {
  const {data} = useAtomValue(parent.data)
  if (!data) return null
  return (
    <ExplorerHeaderLoadedParentMain
      data={data}
      explorer={explorer}
      titleControls={titleControls}
    />
  )
}

interface ExplorerToolbarProps {
  explorer: DashboardExplorer
}

const sortingOptions: Array<{id: ExplorerSortBy; label: string}> = [
  {id: 'index', label: 'Index'},
  {id: 'title', label: 'Title'},
  {id: 'id', label: 'Creation date'},
  {id: 'size', label: 'Size'}
]

interface ExplorerControlsProps {
  isMedia: boolean | undefined
  selectedFilters: Array<string> | undefined
  sort: ExplorerSort
  typeFilterOptions: Array<ExplorerTypeFilterOption>
  setSort: (sortBy: ExplorerSortBy) => void
  toggleFilter: (filterBy: string) => void
  clearFilters: () => void
}

interface ExplorerExperimentalControlsProps {
  isMedia: boolean | undefined
  excludedTypes: Array<string> | undefined
  includedTypes: Array<string> | undefined
  sort: ExplorerSort
  typeFilterOptions: Array<ExplorerTypeFilterOption>
  setSort: (sortBy: ExplorerSortBy) => void
  toggleExclude: (filterBy: string) => void
  includeOnly: (filterBy: string) => void
  clearFilters: () => void
}

function ExplorerControlsButton({
  isMedia,
  selectedFilters,
  sort,
  typeFilterOptions,
  setSort,
  toggleFilter,
  clearFilters
}: ExplorerControlsProps) {
  return (
    <DialogTrigger>
      <Button size="icon-nav" appearance="outline" icon={IcRoundFilterList} />
      <Popover placement="bottom left">
        <ExplorerControlsPopover
          isMedia={isMedia}
          selectedFilters={selectedFilters}
          sort={sort}
          typeFilterOptions={typeFilterOptions}
          setSort={setSort}
          toggleFilter={toggleFilter}
          clearFilters={clearFilters}
        />
      </Popover>
    </DialogTrigger>
  )
}

function ExplorerExperimentalControlsButton({
  isMedia,
  excludedTypes,
  includedTypes,
  sort,
  typeFilterOptions,
  setSort,
  toggleExclude,
  includeOnly,
  clearFilters
}: ExplorerExperimentalControlsProps) {
  const includedCount = typeFilterOptions.length - (excludedTypes?.length ?? 0)
  const showBadge = (excludedTypes?.length ?? 0) > 0
  return (
    <DialogTrigger>
      <Button size="small" appearance="outline" style={{height: 32}}>
        {showBadge && (
          <Badge size="small" style={{padding: '0 8px'}}>
            {includedCount}
          </Badge>
        )}
        <Icon icon={IcRoundFilterList} />
      </Button>
      <Popover placement="bottom left">
        <ExplorerExperimentalControlsPopover
          isMedia={isMedia}
          excludedTypes={excludedTypes}
          includedTypes={includedTypes}
          sort={sort}
          typeFilterOptions={typeFilterOptions}
          setSort={setSort}
          toggleExclude={toggleExclude}
          includeOnly={includeOnly}
          clearFilters={clearFilters}
        />
      </Popover>
    </DialogTrigger>
  )
}

function ExplorerControlsPopover({
  isMedia,
  selectedFilters,
  sort,
  typeFilterOptions,
  setSort,
  toggleFilter,
  clearFilters
}: ExplorerControlsProps) {
  const hasTypeFilters = typeFilterOptions.length > 0
  const hasSelection = Boolean(selectedFilters?.length)

  return (
    <>
      {hasTypeFilters && (
        <>
          <p className={styles.Popover.Label()}>Filter by</p>
          {hasSelection && (
            <Button
              appearance="plain"
              onPress={clearFilters}
              className={styles.Sorting.button()}
            >
              All types
            </Button>
          )}
          {typeFilterOptions.map(filter => {
            const selected = selectedFilters?.includes(filter.type) ?? false
            return (
              <Button
                key={filter.type}
                appearance={selected ? 'active' : 'plain'}
                onPress={() => toggleFilter(filter.type)}
                className={styles.Sorting.button()}
              >
                {filter.label}
                {selected && <IcRoundClose />}
              </Button>
            )
          })}
        </>
      )}
      <p className={styles.Popover.Label()}>Sort by</p>
      {sortingOptions.map(option =>
        !isMedia && option.id === 'size' ? null : (
          <Button
            key={option.id}
            appearance={sort.sortBy === option.id ? 'solid' : 'plain'}
            onPress={() => setSort(option.id)}
            className={styles.Sorting.button()}
          >
            {option.label}
            {sort.sortBy === option.id &&
              (sort.direction === 'asc' ? (
                <IcRoundArrowUpward />
              ) : (
                <IcRoundArrowDownward />
              ))}
          </Button>
        )
      )}
    </>
  )
}

// Experimental: Exclusion-model type filter UI (for stories/testing only)
interface ExplorerExperimentalControlsProps {
  isMedia: boolean | undefined
  excludedTypes: Array<string> | undefined
  includedTypes: Array<string> | undefined
  sort: ExplorerSort
  typeFilterOptions: Array<ExplorerTypeFilterOption>
  setSort: (sortBy: ExplorerSortBy) => void
  toggleExclude: (filterBy: string) => void
  includeOnly: (filterBy: string) => void
  clearFilters: () => void
}

function ExplorerExperimentalControlsPopover({
  isMedia,
  excludedTypes,
  includedTypes,
  sort,
  typeFilterOptions,
  setSort,
  toggleExclude,
  includeOnly,
  clearFilters
}: ExplorerExperimentalControlsProps) {
  const hasTypeFilters = typeFilterOptions.length > 0
  const excludedSet = new Set(excludedTypes ?? [])

  return (
    <>
      {hasTypeFilters && (
        <>
          <p className={styles.Popover.Label()}>Filter by</p>
          {typeFilterOptions.map(filter => {
            const excluded = excludedSet.has(filter.type)
            const canCheckAll = !excluded && excludedSet.size > 0
            return (
              <div key={filter.type} className={styles.Popover.filterRow()}>
                <span onClick={e => e.stopPropagation()}>
                  <Checkbox
                    isSelected={!excluded}
                    onChange={() => toggleExclude(filter.type)}
                    style={{flexShrink: 0}}
                  />
                </span>
                <div
                  className={styles.Popover.filterRowContent()}
                  onClick={
                    canCheckAll ? clearFilters : () => includeOnly(filter.type)
                  }
                  role="option"
                  aria-selected={!excluded}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (canCheckAll) clearFilters()
                      else includeOnly(filter.type)
                    }
                  }}
                >
                  <span style={{flex: 1, textAlign: 'left'}}>
                    {filter.label}
                  </span>
                  <span onClick={e => e.stopPropagation()}>
                    <Link
                      onPress={
                        canCheckAll
                          ? clearFilters
                          : () => includeOnly(filter.type)
                      }
                      className={styles.Popover.onlyText()}
                      style={{textDecoration: 'none'}}
                      aria-label={
                        canCheckAll
                          ? 'Show all types'
                          : `Only show ${filter.label}`
                      }
                    >
                      {canCheckAll ? 'Check all' : 'Only'}
                    </Link>
                  </span>
                </div>
              </div>
            )
          })}
        </>
      )}
      <p className={styles.Popover.Label()}>Sort by</p>
      {sortingOptions.map(option =>
        !isMedia && option.id === 'size' ? null : (
          <Button
            key={option.id}
            appearance={sort.sortBy === option.id ? 'solid' : 'plain'}
            onPress={() => setSort(option.id)}
            className={styles.Sorting.button()}
          >
            {option.label}
            {sort.sortBy === option.id &&
              (sort.direction === 'asc' ? (
                <IcRoundArrowUpward />
              ) : (
                <IcRoundArrowDownward />
              ))}
          </Button>
        )
      )}
    </>
  )
}

export function ExplorerExperimentalToolbar({explorer}: ExplorerToolbarProps) {
  const [view, setView] = useAtom(explorer.view)
  const [sort, setSort] = useAtom(explorer.sort)
  const excludedTypes = useAtomValue(explorer.experimentalExcludedTypes)
  const includedTypes = useAtomValue(explorer.experimentalIncludedTypes)
  const toggleExclude = useSetAtom(explorer.experimentalExcludedTypes)
  const includeOnly = useSetAtom(explorer.experimentalIncludeOnlyType)
  const clearFilters = useSetAtom(explorer.experimentalClearTypeFilters)
  const typeFilterOptions = useAtomValue(explorer.typeFilterOptions)
  const isMedia = useAtomValue(explorer.isMedia)
  const canUpload = useAtomValue(explorer.canUpload)
  const uploads = useAtomValue(explorer.uploadsInCurrentFolder)
  const upload = useSetAtom(explorer.upload)
  const uploadLabel =
    uploads.length === 1
      ? '1 file uploading'
      : `${uploads.length} files uploading`

  return (
    <div className={styles.Explorer.toolbar.tools()}>
      {isMedia && uploads.length > 0 && (
        <MutationQueueStatus
          ariaLabel={uploadLabel}
          dashboard={explorer.dashboard}
          placement="bottom"
        >
          {uploads.length}
        </MutationQueueStatus>
      )}
      <ExplorerExperimentalControlsButton
        isMedia={isMedia}
        excludedTypes={excludedTypes}
        includedTypes={includedTypes}
        sort={sort}
        typeFilterOptions={typeFilterOptions}
        setSort={setSort}
        toggleExclude={toggleExclude}
        includeOnly={includeOnly}
        clearFilters={clearFilters}
      />
      <div className={styles.Explorer.toolbar.mediaActions()}>
        <ViewToggle size="small" view={view} setView={setView} />
        {isMedia && canUpload && (
          <FileTrigger
            allowsMultiple
            onSelect={files => {
              if (files) upload(files)
            }}
          >
            <Button icon={IcRoundUploadFile} intent="primary">
              Upload media
            </Button>
          </FileTrigger>
        )}
      </div>
    </div>
  )
}

function ExplorerToolbar({explorer}: ExplorerToolbarProps) {
  const [view, setView] = useAtom(explorer.view)
  const [sort, setSort] = useAtom(explorer.sort)
  const selectedFilters = useAtomValue(explorer.typeFilters)
  const toggleFilter = useSetAtom(explorer.typeFilters)
  const clearFilters = useSetAtom(explorer.clearTypeFilters)
  const typeFilterOptions = useAtomValue(explorer.typeFilterOptions)
  const isMedia = useAtomValue(explorer.isMedia)
  const canUpload = useAtomValue(explorer.canUpload)
  const uploads = useAtomValue(explorer.uploadsInCurrentFolder)
  const upload = useSetAtom(explorer.upload)
  const uploadLabel =
    uploads.length === 1
      ? '1 file uploading'
      : `${uploads.length} files uploading`

  return (
    <div className={styles.Explorer.toolbar.tools()}>
      {isMedia && uploads.length > 0 && (
        <MutationQueueStatus
          ariaLabel={uploadLabel}
          dashboard={explorer.dashboard}
          placement="bottom"
        >
          {uploads.length}
        </MutationQueueStatus>
      )}
      <ExplorerControlsButton
        isMedia={isMedia}
        selectedFilters={selectedFilters}
        sort={sort}
        typeFilterOptions={typeFilterOptions}
        setSort={setSort}
        toggleFilter={toggleFilter}
        clearFilters={clearFilters}
      />
      <div className={styles.Explorer.toolbar.mediaActions()}>
        <ViewToggle size="small" view={view} setView={setView} />
        {isMedia && canUpload && (
          <FileTrigger
            allowsMultiple
            onSelect={files => {
              if (files) upload(files)
            }}
          >
            <Button icon={IcRoundUploadFile} intent="primary">
              Upload media
            </Button>
          </FileTrigger>
        )}
      </div>
    </div>
  )
}

export function ExplorerHeader({
  autoFocusSearch,
  controls,
  explorer,
  titleControls
}: ExplorerHeaderProps) {
  return (
    <RailHeader className={styles.ExplorerHeader()}>
      <div className={styles.ExplorerHeader.content()}>
        <ExplorerHeaderMain explorer={explorer} titleControls={titleControls} />
        <div className={styles.Explorer.searchSlot()}>
          <ExplorerSearch autoFocus={autoFocusSearch} explorer={explorer} />
        </div>
        <div className={styles.Explorer.toolbar()}>
          {controls || <ExplorerToolbar explorer={explorer} />}
        </div>
      </div>
    </RailHeader>
  )
}

export function ExplorerBody({explorer}: ExplorerBodyProps) {
  return (
    <RailBody>
      <div className={styles.Explorer.viewport()}>
        <ExplorerList explorer={explorer} />
      </div>
    </RailBody>
  )
}

export function Explorer({controls, explorer, titleControls}: ExplorerProps) {
  return (
    <>
      <ExplorerHeader
        controls={controls}
        explorer={explorer}
        titleControls={titleControls}
      />
      <ExplorerBody explorer={explorer} />
    </>
  )
}
