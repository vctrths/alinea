// oxlint-disable jsx_a11y/no-autofocus
import {Button, SearchField} from '@alinea/components'
import styler from '@alinea/styler'
import {useAtom} from 'jotai'
import {IcOutlineGridView, IcOutlineList} from '../icons.js'
import {DashboardExplorer} from '../store.js'
import css from './Explorer.module.css'
import {ExplorerList} from './ExplorerList.js'
import {LocationBreadcrumbs} from './LocationBreadcrumbs.js'

const styles = styler(css)

export interface ExplorerProps {
  explorer: DashboardExplorer
  autoFocus?: boolean
}

interface ExplorerSearchProps {
  explorer: DashboardExplorer
  autoFocus?: boolean
}

function ExplorerSearch({explorer, autoFocus}: ExplorerSearchProps) {
  const [search, setSearch] = useAtom(explorer.search)
  return (
    <SearchField
      label="Search"
      placeholder="Search..."
      value={search}
      onChange={setSearch}
      autoFocus={autoFocus}
    />
  )
}

interface ExplorerToolbarProps {
  explorer: DashboardExplorer
}

function ExplorerToolbar({explorer}: ExplorerToolbarProps) {
  const [view, setView] = useAtom(explorer.view)
  return (
    <div>
      <Button
        appearance={view === 'card' ? 'active' : 'plain'}
        onPress={() => setView('card')}
      >
        <IcOutlineGridView /> Cards
      </Button>
      <Button
        appearance={view === 'row' ? 'active' : 'plain'}
        onPress={() => setView('row')}
      >
        <IcOutlineList /> Rows
      </Button>
    </div>
  )
}

export function Explorer({explorer, autoFocus}: ExplorerProps) {
  const [location, setLocation] = useAtom(explorer.location)
  return (
    <div className={styles.root()}>
      <LocationBreadcrumbs location={location} setLocation={setLocation} />
      <div className={styles.toolbar()}>
        <ExplorerSearch explorer={explorer} autoFocus={autoFocus} />
        <ExplorerToolbar explorer={explorer} />
      </div>

      <div className={styles.listViewport()}>
        <ExplorerList explorer={explorer} />
      </div>
    </div>
  )
}
