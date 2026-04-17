import {Button, DialogTrigger, Label} from '@alinea/components'
import {createId} from 'alinea/core/Id'
import {Reference} from 'alinea/core/Reference'
import {ListRow} from 'alinea/core/shape/ListShape'
import {LinkField, LinksField} from 'alinea/field/link/LinkField'
import {EntryReference, UrlReference} from 'alinea/types.js'
import {
  IcRoundAdd,
  IcRoundClose,
  IcRoundLink,
  IcRoundSwapHoriz
} from 'alinea/v2/icons.js'
import {useAtomValue} from 'jotai'
import {ReactNode} from 'react'
import {
  ReactiveNode,
  useDashboard,
  useFieldNode,
  useFieldOptions,
  useFieldValue
} from '../../../store.js'
import {Box, BoxHeader, BoxRow} from '../../Box.js'
import {ExternalLinkPicker} from '../../ExternalLinkPicker.js'
import {ImagePicker} from '../../ImagePicker.js'
import {LinkPicker} from '../../LinkPicker.js'
interface LinkRowProps {
  node: ReactiveNode<Reference>
}

function LinkRow({node}: LinkRowProps) {
  const type = useAtomValue(node.field('_type')) as string | undefined
  if (type === 'entry') return <EntryRowLayer node={node} />
  if (type === 'url') return <UrlRow node={node} />
}

interface RowLayerProps {
  node: ReactiveNode<Reference>
}

function EntryRowLayer({node}: RowLayerProps) {
  const entryId = useAtomValue(node.field('_entry')) as string | undefined
  if (!entryId) return null
  return <EntryRow entryId={entryId} />
}
interface EntryRowProps {
  entryId: string
}

function EntryRow({entryId}: EntryRowProps) {
  const dashboard = useDashboard()
  const entry = useAtomValue(dashboard.entries(entryId))
  const label = useAtomValue(entry.label)
  const type = useAtomValue(entry.type)
  return (
    <>
      <IcRoundLink /> {label} ({type.label})
    </>
  )
}

function UrlRow({node}: RowLayerProps) {
  const title = useAtomValue(node.field('_title')) as string | undefined
  const url = useAtomValue(node.field('_url')) as string | undefined
  return (
    <>
      <IcRoundLink /> {title} ({url})
    </>
  )
}

interface SingleLinkDialogProps {
  field: LinkField<Reference, unknown>
  children: ReactNode
}

function SingleLinkDialog({field, children}: SingleLinkDialogProps) {
  const [value, setValue] = useFieldValue(field)
  return (
    <DialogTrigger>
      <Button appearance="plain" intent="secondary">
        {children}
      </Button>
      <LinkPicker
        selectionMode="single"
        selectionBehavior="replace"
        initialSelection={
          value?._type === 'entry' ? [(value as EntryReference)._entry] : []
        }
        onConfirm={selection =>
          setValue({
            _id: createId(),
            _type: 'entry',
            _entry: selection[0]
          } satisfies EntryReference as Reference)
        }
      />
    </DialogTrigger>
  )
}

interface SingleExternalDialogProps {
  field: LinkField<Reference, unknown>
  children: ReactNode
}

function SingleExternalDialog({field, children}: SingleExternalDialogProps) {
  const [_, setValue] = useFieldValue(field)
  return (
    <DialogTrigger>
      <Button appearance="plain" intent="secondary">
        {children}
      </Button>
      <ExternalLinkPicker
        selectionMode="single"
        onConfirm={({url, title, target}) =>
          setValue({
            _id: createId(),
            _type: 'url',
            _url: url,
            _title: title,
            _target: target
          } satisfies UrlReference as Reference)
        }
      />
    </DialogTrigger>
  )
}

interface MultipleLinkDialogProps {
  field: LinksField<ListRow, Reference>
  children: ReactNode
}

function MultipleLinkDialog({field, children}: MultipleLinkDialogProps) {
  const [value, setValue] = useFieldValue(field)
  return (
    <DialogTrigger>
      <Button intent="secondary" appearance="plain">
        {children}
      </Button>
      <LinkPicker
        selectionMode="multiple"
        selectionBehavior="toggle"
        initialSelection={value
          ?.filter(row => '_entry' in row)
          .map(row => row._entry as string)}
        onConfirm={selection =>
          setValue(
            selection.map(entryId => ({
              _id: createId(),
              _index: undefined!,
              _type: 'entry',
              _entry: entryId
            }))
          )
        }
      />
    </DialogTrigger>
  )
}

interface AllowedActions {
  allowLinks?: boolean
  allowExternalLinks?: boolean
  allowImages?: boolean
}

interface StandardFieldActionProps {
  field: LinkField<Reference, unknown>
}
interface SingleFieldActionsProps
  extends AllowedActions, StandardFieldActionProps {}

function SingleFieldActions({
  field,
  allowLinks = false,
  allowExternalLinks = false,
  allowImages = false
}: SingleFieldActionsProps) {
  return (
    <>
      {allowLinks && (
        <SingleLinkDialog field={field}>
          <IcRoundAdd /> Add link
        </SingleLinkDialog>
      )}

      {allowExternalLinks && (
        <SingleExternalDialog field={field}>
          <IcRoundAdd /> Add external link
        </SingleExternalDialog>
      )}

      {allowImages && (
        <SingleImageDialog field={field}>
          <IcRoundAdd /> Add image
        </SingleImageDialog>
      )}
    </>
  )
}
function SingleImageDialog({field, children}: SingleLinkDialogProps) {
  const [value, setValue] = useFieldValue(field)
  // const dashboard = useAtom()

  return (
    <DialogTrigger>
      <Button appearance="plain" intent="secondary">
        {children}
      </Button>
      <ImagePicker
        selectionMode="single"
        selectionBehavior="replace"
        initialSelection={
          value?._type === 'entry' ? [(value as EntryReference)._entry] : []
        }
        onConfirm={selection =>
          setValue({
            _id: createId(),
            _type: 'image',
            _entry: selection[0]
          } satisfies EntryReference as Reference)
        }
      />
    </DialogTrigger>
  )
}

export function SingleLinkFieldView({field}: StandardFieldActionProps) {
  const [_, setValue] = useFieldValue(field)
  const options = useFieldOptions(field)
  const node = useFieldNode(field)
  const isEmpty = useAtomValue(node.isEmpty)
  return (
    <Label label={options.label}>
      <Box style={{marginBottom: '8px'}}>
        {!isEmpty && (
          <BoxRow>
            <BoxHeader>
              <LinkRow node={node as ReactiveNode<Reference>} />
            </BoxHeader>
            <div>
              <SingleLinkDialog field={field}>
                <IcRoundSwapHoriz />
              </SingleLinkDialog>
              <Button
                size="icon"
                appearance="plain"
                intent="secondary"
                onPress={() => setValue(undefined!)}
                icon={IcRoundClose}
              />
            </div>
          </BoxRow>
        )}
        {isEmpty && (
          <BoxRow position="middle">
            <BoxHeader>
              <SingleFieldActions
                field={field}
                allowImages
                allowExternalLinks
                allowLinks
              />
            </BoxHeader>
          </BoxRow>
        )}
      </Box>
    </Label>
  )
}

export interface MultipleLinksFieldViewProps {
  field: LinksField<ListRow, Reference>
}

export function MultipleLinksFieldView({field}: MultipleLinksFieldViewProps) {
  const [, setValue] = useFieldValue(field)
  const options = useFieldOptions(field)
  const node = useFieldNode(field)
  const nodes = useAtomValue(node.nodes) as Array<ReactiveNode<Reference>>

  return (
    <Label label={options.label}>
      <Box style={{marginBottom: '8px'}}>
        {nodes?.map((node, index) => (
          <BoxRow key={index}>
            <BoxHeader>
              <LinkRow key={index} node={node} />
            </BoxHeader>
            <Button
              size="icon"
              appearance="plain"
              intent="secondary"
              icon={IcRoundClose}
              onPress={() =>
                setValue(links =>
                  links.filter((_, currentIndex) => currentIndex !== index)
                )
              }
            />
          </BoxRow>
        ))}
        <BoxRow position="middle">
          <BoxHeader>
            <MultipleLinkDialog field={field}>
              <IcRoundAdd />
              Add/Remove Link(s)
            </MultipleLinkDialog>
          </BoxHeader>
        </BoxRow>
      </Box>
    </Label>
  )
}
