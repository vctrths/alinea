import type {LocalConnection} from '#/core/Connection.js'
import {localUser} from '#/core/User.js'
import {cms, db} from '#/dashboard/fixture/cms.ts?alinea'
import {DashboardScopeInternal} from '#/dashboard/hooks.js'
import {
  Dashboard,
  type ExplorerInteractionPreset,
  type ExplorerOptions
} from '#/dashboard/store.js'
import {views} from '#/field/views.js'
import {useMemo, type CSSProperties} from 'react'
import {ExplorerHeader} from './Explorer.js'
import {ExplorerPickerContent} from './ExplorerPickerContent.js'
import {ExplorerRacPickerContent} from './ExplorerRacPickerContent.js'
import {ExplorerRacStandardPickerContent} from './ExplorerRacStandardPickerContent.js'
import {ExplorerRacTreePickerContent} from './ExplorerRacTreePickerContent.js'
import {ExplorerExperimentalToolbar} from './Explorer.js'
import '#/theme.css'

const fixtureConnection: LocalConnection = {
  mutate(mutations) {
    return db.mutate(mutations)
  },
  previewToken() {
    return Promise.resolve('dev-preview-token')
  },
  resolve(query) {
    return db.resolve(query)
  },
  user() {
    return Promise.resolve(localUser)
  },
  write(request) {
    return db.write(request)
  },
  getTreeIfDifferent(sha) {
    return db.getTreeIfDifferent(sha)
  },
  getBlobs(shas) {
    return db.getBlobs(shas)
  },
  revisions(file) {
    return db.revisions(file)
  },
  revisionData(file, revisionId) {
    return db.revisionData(file, revisionId)
  },
  getDraft() {
    return Promise.resolve(undefined)
  },
  storeDraft() {
    return Promise.resolve()
  },
  prepareUpload(file) {
    return db.prepareUpload(file)
  }
}

const dashboard = new Dashboard(
  db,
  cms.config,
  db.index,
  fixtureConnection,
  views
)

const storyStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  height: '100vh',
  padding: 16,
  background: 'var(--alinea-bg-muted)'
}

const variantStyle: CSSProperties = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  flexDirection: 'column',
  border: '1px solid var(--alinea-border)',
  borderRadius: 8,
  background: 'var(--alinea-bg)'
}

const variantHeaderStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--alinea-border)'
}

const variantTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 650
}

const variantCopyStyle: CSSProperties = {
  margin: '4px 0 0',
  color: 'var(--alinea-fg-muted)',
  fontSize: 12,
  lineHeight: 1.4
}

const defaultStoryLocation = {
  workspace: 'simple',
  root: 'pages'
} satisfies ExplorerOptions['location']

const resultStoryLocation = {
  workspace: 'picker',
  root: 'pages'
} satisfies ExplorerOptions['location']

interface VariantProps {
  description: string
  location?: ExplorerOptions['location']
  options?: Partial<ExplorerOptions>
  preset: ExplorerInteractionPreset
  title: string
}

function Variant({
  description,
  location = defaultStoryLocation,
  options: optionOverrides,
  preset,
  title
}: VariantProps) {
  const options = useMemo(
    (): ExplorerOptions => ({
      enableNavigation: true,
      interactionPreset: preset,
      selectionBehavior: 'replace',
      selectionMode: 'single',
      showSelectionControls: true,
      ...optionOverrides,
      onConfirm(selection) {
        console.log(`${title} selected`, selection)
      }
    }),
    [optionOverrides, preset, title]
  )
  const explorer = useMemo(
    () => dashboard.explore(location, options),
    [location, options]
  )
  return (
    <section style={variantStyle}>
      <div style={variantHeaderStyle}>
        <h2 style={variantTitleStyle}>{title}</h2>
        <p style={variantCopyStyle}>{description}</p>
      </div>
      <ExplorerHeader
        explorer={explorer}
        controls={<ExplorerExperimentalToolbar explorer={explorer} />}
      />
      <ExplorerPickerContent
        explorer={explorer}
        navigationLabel={`${title} folders`}
        options={options}
      />
    </section>
  )
}

function FullWidthVariant(props: VariantProps) {
  return (
    <DashboardScopeInternal dashboard={dashboard}>
      <main style={storyStyle}>
        <Variant {...props} />
      </main>
    </DashboardScopeInternal>
  )
}

function RacTableVariant({
  content = 'current',
  description,
  location = resultStoryLocation,
  options: optionOverrides,
  title
}: Omit<VariantProps, 'preset'> & {content?: 'current' | 'standard' | 'tree'}) {
  const options = useMemo(
    (): ExplorerOptions => ({
      enableNavigation: false,
      interactionPreset: 'current',
      interaction: {
        navigationUi: 'both',
        openFolderAction: 'none',
        breadcrumbAction: 'click',
        confirmAction: 'button',
        showBackButton: true,
        showRootDropdown: false
      },
      selectionBehavior: 'replace',
      selectionMode: 'single',
      showSelectionControls: true,
      condition: pageOnlyCondition,
      conditionScope: 'rooted',
      unavailableItems: 'disabled',
      ...optionOverrides,
      onConfirm(selection) {
        console.log(`${title} selected`, selection)
      }
    }),
    [optionOverrides, title]
  )
  const explorer = useMemo(
    () => dashboard.explore(location, options),
    [location, options]
  )
  const PickerContent =
    content === 'standard'
      ? ExplorerRacStandardPickerContent
      : content === 'tree'
        ? ExplorerRacTreePickerContent
        : ExplorerRacPickerContent
  return (
    <section style={variantStyle}>
      <div style={variantHeaderStyle}>
        <h2 style={variantTitleStyle}>{title}</h2>
        <p style={variantCopyStyle}>{description}</p>
      </div>
      <ExplorerHeader
        explorer={explorer}
        controls={<ExplorerExperimentalToolbar explorer={explorer} />}
      />
      <PickerContent
        explorer={explorer}
        navigationLabel={`${title} folders`}
        options={options}
      />
    </section>
  )
}

function FullWidthRacTableVariant(
  props: Omit<VariantProps, 'preset'> & {
    content?: 'current' | 'standard' | 'tree'
  }
) {
  return (
    <DashboardScopeInternal dashboard={dashboard}>
      <main style={storyStyle}>
        <RacTableVariant {...props} />
      </main>
    </DashboardScopeInternal>
  )
}

const pageOnlyCondition: ExplorerOptions['condition'] = {_type: 'Page'}

type ResultMode = 'flat' | 'rooted-hidden' | 'rooted-disabled'

const resultModeOptions = {
  flat: {
    label: 'Flat selectable results',
    description:
      'Flat result list over the picker-test tree: only selectable Page entries are shown, including pages buried inside folders. Search for atlas or changelog to compare result density.',
    options: {
      condition: pageOnlyCondition,
      conditionScope: 'flat',
      unavailableItems: 'hidden'
    } satisfies Partial<ExplorerOptions>
  },
  'rooted-hidden': {
    label: 'Rooted, hidden unavailable',
    description:
      'Rooted picker-test tree: keeps folder context but hides non-Page entries, so folders that fail the condition disappear from the current level.',
    options: {
      condition: pageOnlyCondition,
      conditionScope: 'rooted',
      unavailableItems: 'hidden',
      searchAllRoots: true
    } satisfies Partial<ExplorerOptions>
  },
  'rooted-disabled': {
    label: 'Rooted, disabled unavailable',
    description:
      'Rooted picker-test tree: non-Page folders are greyed out as unpickable, but folders with children can still be opened to reach selectable Page descendants.',
    options: {
      condition: pageOnlyCondition,
      conditionScope: 'rooted',
      unavailableItems: 'disabled'
    } satisfies Partial<ExplorerOptions>
  }
} satisfies Record<
  ResultMode,
  {
    description: string
    label: string
    options: Partial<ExplorerOptions>
  }
>

function resultStory(
  title: string,
  preset: ExplorerInteractionPreset,
  mode: ResultMode,
  options?: Partial<ExplorerOptions>
) {
  const resultMode = resultModeOptions[mode]
  return (
    <FullWidthVariant
      title={`${title}: ${resultMode.label}`}
      location={resultStoryLocation}
      preset={preset}
      description={resultMode.description}
      options={{...resultMode.options, ...options}}
    />
  )
}

function racResultStory(
  mode: ResultMode,
  options?: Partial<ExplorerOptions>,
  content: 'current' | 'standard' | 'tree' = 'current'
) {
  const resultMode = resultModeOptions[mode]
  const isStandard = content === 'standard'
  const isTree = content === 'tree'
  const label = isTree
    ? 'RAC tree'
    : isStandard
      ? 'RAC standard table'
      : 'RAC table'
  const descriptionSuffix = isTree
    ? 'This version uses the React Aria Tree component with proper nested tree items for an accessible, hierarchical entry picker without table columns.'
    : isStandard
      ? 'This version uses RAC-standard nested rows and slot chevrons so React Aria owns the tree table semantics.'
      : 'This version uses Alinea RAC table components as one expandable hierarchy: folders expand inline, children are indented underneath, and no sidebar navigation is used.'
  return (
    <FullWidthRacTableVariant
      title={`${label}: ${resultMode.label}`}
      location={resultStoryLocation}
      description={`${resultMode.description} ${descriptionSuffix}`}
      options={{...resultMode.options, ...options}}
      content={content}
    />
  )
}

const mediaImageCondition = {
  _type: 'MediaFile',
  extension: {in: ['.jpg', '.png', '.svg']}
} as ExplorerOptions['condition']

const mediaStoryLocation = {
  workspace: 'picker',
  root: 'media'
} satisfies ExplorerOptions['location']

function mediaResultStory(
  title: string,
  preset: ExplorerInteractionPreset,
  mode: ResultMode
) {
  const resultMode = resultModeOptions[mode]
  return (
    <FullWidthVariant
      title={`${title}: media ${resultMode.label}`}
      location={mediaStoryLocation}
      preset={preset}
      description={`${resultMode.description} This media-root variant only allows image files, while PDFs, documents, zips, PSDs, and text files stay visible as unselectable context in rooted modes.`}
      options={{
        ...resultMode.options,
        condition: mediaImageCondition
      }}
    />
  )
}

export function Current() {
  return (
    <FullWidthVariant
      title="Current"
      preset="current"
      description="Current v2 picker: sidebar navigation and explicit Select button flow."
    />
  )
}

export function CurrentPageTypeFilters() {
  return (
    <FullWidthVariant
      title="Current / page type filters"
      preset="current"
      description="This variant keeps the current explorer behavior, but the filter popover now lists the page types available in the current root so you can toggle them on and off."
    />
  )
}

export function Desktop() {
  return (
    <FullWidthVariant
      title="Desktop"
      preset="desktop"
      description="Desktop-like prototype: breadcrumbs plus sidebar, double-click folder and breadcrumb actions."
    />
  )
}

export function V1Children() {
  return (
    <FullWidthVariant
      title="V1 / children"
      preset="v1"
      description="v1-inspired prototype: breadcrumb-first navigation, root dropdown, row auto-confirm, and child-count navigation."
    />
  )
}

export function RacTable() {
  return (
    <FullWidthRacTableVariant
      title="RAC table"
      description="RAC/Alinea expandable table prototype: files and folders live in one hierarchy, folder chevrons expand children inline, and selection stays explicit per row."
    />
  )
}

export function RacStandardTable() {
  return (
    <FullWidthRacTableVariant
      title="RAC standard table"
      description="RAC-standard expandable table prototype: files and folders use nested React Aria rows, slot chevrons, and the same explicit selection flow as the current RAC table."
      content="standard"
    />
  )
}

export function CurrentFlat() {
  return resultStory('Current', 'current', 'flat')
}

export function CurrentRootedHidden() {
  return resultStory('Current', 'current', 'rooted-hidden')
}

export function CurrentRootedDisabled() {
  return resultStory('Current', 'current', 'rooted-disabled')
}

export function DesktopFlat() {
  return resultStory('Desktop', 'desktop', 'flat')
}

export function DesktopRootedHidden() {
  return resultStory('Desktop', 'desktop', 'rooted-hidden')
}

export function DesktopRootedDisabled() {
  return resultStory('Desktop', 'desktop', 'rooted-disabled')
}

export function V1ChildrenFlat() {
  return resultStory('V1 / children', 'v1', 'flat')
}

export function V1ChildrenRootedHidden() {
  return resultStory('V1 / children', 'v1', 'rooted-hidden')
}

export function V1ChildrenRootedDisabled() {
  return resultStory('V1 / children', 'v1', 'rooted-disabled')
}

export function RacTableFlat() {
  return racResultStory('flat')
}

export function RacTableRootedHidden() {
  return racResultStory('rooted-hidden')
}

export function RacTableRootedDisabled() {
  return racResultStory('rooted-disabled')
}

export function RacStandardTableFlat() {
  return racResultStory('flat', undefined, 'standard')
}

export function RacStandardTableRootedHidden() {
  return racResultStory('rooted-hidden', undefined, 'standard')
}

export function RacStandardTableRootedDisabled() {
  return racResultStory('rooted-disabled', undefined, 'standard')
}

export function RacTree() {
  return (
    <FullWidthRacTableVariant
      title="RAC tree"
      description="RAC tree component prototype: uses React Aria's Tree component with proper nested tree items."
      content="tree"
      options={{searchDepth: 'all'}}
    />
  )
}

export function RacTreeFlat() {
  return racResultStory('flat', undefined, 'tree')
}

export function RacTreeRootedHidden() {
  return racResultStory('rooted-hidden', {searchDepth: 'all'}, 'tree')
}

export function RacTreeRootedDisabled() {
  return racResultStory('rooted-disabled', undefined, 'tree')
}

export function RacTreeRootedHiddenCurrent() {
  return racResultStory('rooted-hidden', {conditionScope: 'current'}, 'tree')
}

export function MediaFilesFlat() {
  return mediaResultStory('Media files', 'desktop', 'flat')
}

export function MediaFilesDesktopRootedDisabled() {
  return mediaResultStory('Media files desktop', 'desktop', 'rooted-disabled')
}

export function MediaFilesCurrentRootedHidden() {
  return mediaResultStory('Media files current', 'current', 'rooted-hidden')
}

export function MediaFilesRacTableRootedDisabled() {
  return (
    <FullWidthRacTableVariant
      title="Media files RAC table: rooted disabled"
      location={mediaStoryLocation}
      description="RAC/Alinea expandable table prototype for media: only image files are selectable, unavailable files stay visible as context, and folders expand inline without sidebar navigation."
      options={{
        ...resultModeOptions['rooted-disabled'].options,
        condition: mediaImageCondition
      }}
    />
  )
}

export function MediaFilesRacStandardTableRootedDisabled() {
  return (
    <FullWidthRacTableVariant
      title="Media files RAC standard table: rooted disabled"
      location={mediaStoryLocation}
      description="RAC-standard expandable table prototype for media: only image files are selectable, unavailable files stay visible as context, and React Aria owns nested row expansion."
      content="standard"
      options={{
        ...resultModeOptions['rooted-disabled'].options,
        condition: mediaImageCondition
      }}
    />
  )
}

export default {
  title: 'Dashboard / EntryPicker variants'
}
