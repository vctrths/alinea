import {useAtomValue, useSetAtom} from 'jotai'
import {startTransition} from 'react'
import type {Key, Selection} from 'react-aria-components'
import type {DashboardExplorer, ExplorerOptions} from '../store.js'
import {ExplorerBody} from './Explorer.js'
import {ExplorerModalContent, ExplorerModalNavigation} from './ExplorerModal.js'
import {SidebarTreeExplorer} from './SidebarTree.js'

export interface ExplorerPickerContentProps {
  explorer: DashboardExplorer
  navigationLabel: string
  options: ExplorerOptions
}

export function ExplorerPickerContent({
  explorer,
  navigationLabel,
  options
}: ExplorerPickerContentProps) {
  const workspace = useAtomValue(explorer.workspace)
  const root = useAtomValue(explorer.root)
  const location = useAtomValue(explorer.location)
  const parentMenu = useAtomValue(explorer.parentsMenu)
  const navigationTreeState = useAtomValue(explorer.navigationTreeState)
  const navigateTreeEntry = useSetAtom(explorer.onNavigateTreeEntry)
  const enableNavigation = options.enableNavigation ?? true
  const showSidebarNavigation =
    enableNavigation && explorer.showsSidebarNavigation
  const selectedKeys = location.parentId
    ? new Set<Key>([location.parentId])
    : new Set<Key>()
  const expandedKeys = new Set<Key>(parentMenu.map(item => item.id))

  function onRootPress() {
    startTransition(() => {
      navigateTreeEntry(undefined)
    })
  }

  function onSelectionChange(keys: Selection) {
    if (keys === 'all') return
    const [selected] = keys
    startTransition(() => {
      navigateTreeEntry(selected ? String(selected) : undefined)
    })
  }

  return (
    <ExplorerModalContent>
      {showSidebarNavigation && root && (
        <ExplorerModalNavigation>
          <SidebarTreeExplorer
            ariaLabel={navigationLabel}
            root={root}
            deadEndKeys={navigationTreeState.deadEndKeys}
            expandedKeys={expandedKeys}
            matchingDescendantKeys={navigationTreeState.matchingDescendantKeys}
            navigationStateActive={navigationTreeState.active}
            rootSelected={!location.parentId}
            selectableKeys={navigationTreeState.selectableKeys}
            selectedKeys={selectedKeys}
            selectedLocale={explorer.selectedLocale}
            workspace={workspace}
            onRootPress={onRootPress}
            onSelectionChange={onSelectionChange}
          />
        </ExplorerModalNavigation>
      )}
      <ExplorerBody explorer={explorer} />
    </ExplorerModalContent>
  )
}
