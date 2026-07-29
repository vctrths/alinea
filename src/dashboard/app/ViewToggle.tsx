import {ToggleButton, ToggleButtonGroup} from '#/components.js'
import {
  IcAlignCenter,
  IcOutlineGridView,
  IcOutlineList
} from '#/dashboard/icons.js'
import type {Key} from 'react-aria-components'

export type ExplorerView = 'card' | 'row' | 'tree'

interface ViewToggleProps {
  setView: (view: ExplorerView) => void
  view: ExplorerView
}

export function ViewToggle({setView, view}: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      aria-label="Explorer view"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(keys: Set<Key>) => {
        const [selected] = keys
        setView(selected as ExplorerView)
      }}
    >
      <ToggleButton id="card">
        <IcOutlineGridView data-slot="icon" />
      </ToggleButton>
      <ToggleButton id="row">
        <IcOutlineList data-slot="icon" />
      </ToggleButton>
      <ToggleButton id="tree">
        <IcAlignCenter data-slot="icon" />
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
