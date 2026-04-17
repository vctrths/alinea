// oxlint-disable jsx_a11y/no-autofocus
import {Button, Modal} from '@alinea/components'
import {useAtomValue, useSetAtom} from 'jotai'
import {startTransition, useState} from 'react'
import {ExplorerOptions, useDashboard} from '../store.js'
import {Explorer} from './Explorer.js'
import {SheetContent, SheetDialog, SheetFooter, useSheet} from './ui/Sheet.js'

export function LinkPicker(options: ExplorerOptions) {
  return (
    <Modal isDismissable>
      <ExplorerSheet options={options} />
    </Modal>
  )
}

interface ExplorerSheetProps {
  options: ExplorerOptions
}

function ExplorerSheet({options}: ExplorerSheetProps) {
  const sheet = useSheet()
  const dashboard = useDashboard()
  const workspace = useAtomValue(dashboard.selectedWorkspace)
  const root = useAtomValue(dashboard.selectedRoot)
  const [explorer] = useState(() =>
    dashboard.explore({workspace, root}, options)
  )
  const onConfirm = useSetAtom(explorer.onConfirm)
  const onSubmit = () => {
    startTransition(() => {
      onConfirm()
      sheet.close()
    })
  }
  return (
    <SheetDialog label="Pick a link">
      <SheetContent>
        <Explorer explorer={explorer} autoFocus={true} />
      </SheetContent>
      <SheetFooter>
        <Button intent="secondary" onPress={sheet.close}>
          Cancel
        </Button>
        <Button onPress={onSubmit}>Pick</Button>
      </SheetFooter>
    </SheetDialog>
  )
}
