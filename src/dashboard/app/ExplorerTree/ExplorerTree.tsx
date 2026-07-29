import {Tree, TreeItem} from '#/components.js'
import {DashboardEntry, DashboardExplorer} from '#/dashboard/store.js'
import styler from '@alinea/styler'
import {useAtom, useAtomValue} from 'jotai'
import {useState} from 'react'
import {Key, ListLayout, Virtualizer} from 'react-aria-components'
import {LocationBreadcrumbs} from '../LocationBreadcrumbs.js'
import css from './ExplorerTree.module.css'

const styles = styler(css)

type ExplorerTreeProps = {
  explorer: DashboardExplorer
  items: DashboardEntry[]
}

export function ExplorerTree({explorer, items}: ExplorerTreeProps) {
  const [selected, setSelected] = useAtom(explorer.selection)
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set())
  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <ExplorerTreeNavigation explorer={explorer} />
      <Virtualizer
        layout={ListLayout}
        layoutOptions={{rowHeight: 44, padding: 0, gap: 0}}
      >
        <Tree
          aria-label="Explorer entries"
          items={items}
          selectionMode={explorer.selectionMode}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          disabledBehavior="selection"
        >
          {item => <ExplorerTreeRow entry={item} explorer={explorer} />}
        </Tree>
      </Virtualizer>
    </div>
  )
}

function ExplorerTreeNavigation({explorer}: {explorer: DashboardExplorer}) {
  const [location, setLocation] = useAtom(explorer.location)
  return (
    <LocationBreadcrumbs
      location={location}
      setLocation={setLocation}
      enableWorkspace
      enableRoot
    />
  )
}

type RowProps = {
  entry: DashboardEntry
  explorer: DashboardExplorer
}

function ExplorerTreeRow({entry, explorer}: RowProps) {
  const {data} = useAtomValue(entry.data)
  if (!data) return <TreeItem id={entry.id} title="Loading..." />
  return <ExplorerTreeLoadedRow entry={entry} data={data} explorer={explorer} />
}

type LoadedRowProps = {
  data: any
} & RowProps

function ExplorerTreeLoadedRow({entry, data, explorer}: LoadedRowProps) {
  const icon = useAtomValue(data.icon)
  const label = useAtomValue(data.label)
  const hasChildren = useAtomValue(data.hasChildren)

  return (
    <TreeItem
      id={entry.id}
      icon={icon}
      title={label}
      hasChildItems={hasChildren}
    />
  )
}
