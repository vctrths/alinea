import {ToggleButton, ToggleButtonGroup} from '#/components.js'
import {IcOutlineGridView, IcOutlineList} from '#/dashboard/icons.js'
import type {Key} from 'react-aria-components'

export type ExplorerView = 'card' | 'row'

interface ViewToggleProps {
  setView: (view: ExplorerView) => void
  size?: 'default' | 'small'
  view: ExplorerView
}

export function ViewToggle({setView, size, view}: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      size={size}
      aria-label="Explorer view"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(keys: Set<Key>) => {
        setView(keys.has('card') ? 'card' : 'row')
      }}
    >
      <ToggleButton id="card" size={size}>
        <IcOutlineGridView data-slot="icon" />
      </ToggleButton>
      <ToggleButton id="row" size={size}>
        <IcOutlineList data-slot="icon" />
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
