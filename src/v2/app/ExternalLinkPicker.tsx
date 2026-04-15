import {Button, Checkbox, Label, Modal, TextField} from '@alinea/components'
import {startTransition, useState} from 'react'
import {Box, BoxContent, BoxHeader, BoxRow} from './Box'

export interface ExternalLinkValue {
  url: string
  title: string
  target: string
}

export interface ExternalLinkPickerProps {
  selectionMode: 'single' | 'multiple'
  onConfirm: (value: ExternalLinkValue) => void
}

export function ExternalLinkPicker({
  selectionMode,
  onConfirm
}: ExternalLinkPickerProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [openInNewTab, setOpenInNewTab] = useState(false)

  const onSubmit = () => {
    startTransition(() => {
      onConfirm({url, title, target: openInNewTab ? '_blank' : '_self'})
    })
  }

  return (
    <Modal style={{minWidth: '512px'}} isDismissable>
      <Box>
        <BoxRow>
          <BoxHeader>
            {selectionMode === 'multiple' ? 'External links' : 'External link'}
          </BoxHeader>
        </BoxRow>
        <BoxContent>
          <TextField
            label="URL"
            description="Url of the link"
            value={url}
            onChange={setUrl}
            isRequired
          />
          <TextField
            label="Description"
            description="Text to display inside the link element"
            value={title}
            onChange={setTitle}
            isRequired
          />
          <Label label="Target">
            <Checkbox
              isSelected={openInNewTab}
              onChange={setOpenInNewTab}
              label="Open link in new tab"
            />
          </Label>
        </BoxContent>
        <BoxRow position="end">
          <Button onPress={onSubmit}>Add link</Button>
        </BoxRow>
      </Box>
    </Modal>
  )
}
