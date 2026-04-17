import {createId} from '#/core/Id.js'
import {getType} from '#/core/Internal.js'
import {Schema} from '#/core/Schema.js'
import {Type} from '#/core/Type.js'
import {ListField as CoreListField} from '#/core/field/ListField.js'
import {ListRow} from '#/core/shape/ListShape.js'
import {ListOptions} from '#/field/list.js'
import {NodeEditor} from '#/v2/app/Editor.js'
import {
  IcRoundAdd,
  IcRoundArrowDownward,
  IcRoundArrowUpward,
  IcRoundDelete,
  IcRoundMoreVert,
  IcRoundUnfoldLess,
  IcRoundUnfoldMore
} from '#/v2/icons.js'
import {ReactiveNode} from '#/v2/store/Dashboard.js'
import {
  useFieldError,
  useFieldNode,
  useFieldOptions,
  useNodes
} from '#/v2/store/hooks.js'
import {Button, Icon, Label} from '@alinea/components'
import styler from '@alinea/styler'
import type {DragItem} from '@react-types/shared'
import {useAtomValue, useSetAtom} from 'jotai'
import {useMemo, useState} from 'react'
import {
  type Key,
  GridList,
  GridListItem,
  useDragAndDrop
} from 'react-aria-components'
import {Box, BoxContent, BoxHeader, BoxRow} from '../../Box'
import css from './ListField.module.css'

const styles = styler(css)

interface ListValue {
  _id: string
  _type: string
  [key: string]: unknown
}

interface ListFieldItem {
  id: string
  index: number
  row: ReactiveNode<ListValue>
  typeName: string
}

const LIST_FIELD_ROW_DRAG_TYPE = 'application/x-alinea-list-field-row-id'

export interface ListFieldViewProps {
  field: CoreListField<ListRow, ListValue, ListOptions<Schema>>
}

export function ListFieldView({field}: ListFieldViewProps) {
  const options = useFieldOptions(field) as ListOptions<Schema>
  const error = useFieldError(field)
  const list = useFieldNode(field) as ReactiveNode<Array<ListValue>>
  const rows = useAtomValue(list.value) as Array<ListValue>
  const nodes = useNodes(list) as Array<ReactiveNode<ListValue>>
  const setRows = useSetAtom(list.value)
  const schemaEntries = useMemo(
    () => Object.entries(options.schema),
    [options.schema]
  )
  const readOnly = Boolean(options.readOnly)
  const hasRows = rows.length > 0
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const items = useMemo(
    () =>
      rows.map((value, index) => ({
        id: value._id,
        index,
        row: nodes[index],
        typeName: value._type,
        expanded: expandedIds.has(value._id)
      })),
    [nodes, rows, expandedIds]
  )
  const allExpanded = rows.length > 0 && expandedIds.size === rows.length
  function toggleAll() {
    setExpandedIds(allExpanded ? new Set() : new Set(rows.map(row => row._id)))
    console.log(expandedIds)
  }

  function toggleRow(rowId: string) {
    console.log('toggle ' + rowId)
    setExpandedIds(current => {
      const next = new Set(current)

      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)

      return next
    })
  }

  function reorderRows(
    current: Array<ListValue>,
    keys: Set<Key>,
    target: {key: Key; dropPosition: 'before' | 'after' | 'on'}
  ) {
    if (target.dropPosition === 'on') return current
    if (keys.size === 0 || keys.has(target.key)) return current
    const moving = current.filter(row => keys.has(row._id))
    if (moving.length === 0) return current
    const remaining = current.filter(row => !keys.has(row._id))
    let targetIndex = remaining.findIndex(row => row._id === String(target.key))
    if (targetIndex === -1) return current
    if (target.dropPosition === 'after') targetIndex += 1
    remaining.splice(targetIndex, 0, ...moving)
    return remaining
  }

  function getItems(keys: Set<Key>): Array<DragItem> {
    return [...keys].map(key => {
      const id = String(key)
      const item = items.find(i => i.id === id)
      return {
        'text/plain': id,
        [LIST_FIELD_ROW_DRAG_TYPE]: id,
        typeName: item?.typeName
      }
    })
  }

  const {dragAndDropHooks} = useDragAndDrop<ListFieldItem>({
    getItems,
    onReorder(event) {
      setRows(current => reorderRows(current, event.keys, event.target))
    },
    renderDragPreview(items) {
      const labels = items.map(item => {
        console.log(item)
        const type = options.schema[item.typeName]
        return type ? Type.label(type) : 'no type'
      })
      const holdLabel = labels[0] || labels.join(', ')
      return (
        <Box className={styles.ListField.DragPreview()}>
          <Button slot="drag" appearance="plain" intent="secondary">
            ≡
          </Button>
          {holdLabel}
        </Box>
      )
    }
  })

  function addRow(typeName: string, type: Schema[string]) {
    setRows(current => {
      const initialValue = Type.initialValue(type) as Record<string, unknown>
      return [
        ...current,
        {
          _id: createId(),
          _index: '',
          _type: typeName,
          ...initialValue
        }
      ]
    })
  }

  const content = (hasRows || !readOnly) && (
    <Box>
      <BoxRow>
        <BoxHeader>{options.label}</BoxHeader>
        <Button
          size="icon"
          icon={allExpanded ? IcRoundUnfoldLess : IcRoundUnfoldMore}
          onPress={toggleAll}
        />
      </BoxRow>
      {hasRows && (
        <GridList
          aria-label={options.label || 'List items'}
          items={items}
          className={styles.rows()}
          dragAndDropHooks={readOnly ? undefined : dragAndDropHooks}
          selectionMode="none"
        >
          {item => (
            <ListFieldRow
              index={item.index}
              itemId={item.id}
              key={item.id}
              list={list}
              readOnly={readOnly}
              row={item.row}
              rows={rows.length}
              schema={options.schema}
              expanded={item.expanded}
              expandTrigger={() => toggleRow(item.id)}
            />
          )}
        </GridList>
      )}
      {!readOnly && (
        <BoxRow position="middle">
          <div className={styles.ListFieldView.create()}>
            {schemaEntries.map(([typeName, type]) => (
              <Button
                key={typeName}
                appearance="plain"
                intent="secondary"
                onPress={() => addRow(typeName, type)}
              >
                <Icon aria-hidden icon={getType(type).icon || IcRoundAdd} />
                {`Add ${Type.label(type)}`}
              </Button>
            ))}
          </div>
        </BoxRow>
      )}
    </Box>
  )

  return (
    <Label errorMessage={error}>
      <div className={styles.root()}>{content}</div>
    </Label>
  )
}

interface ListFieldRowProps {
  index: number
  itemId: string
  list: ReactiveNode<Array<ListValue>>
  readOnly: boolean
  row: ReactiveNode<ListValue>
  rows: number
  schema: Schema
  expanded: boolean
  expandTrigger: () => void
}

function ListFieldRow({
  index,
  itemId,
  list,
  readOnly,
  row,
  rows,
  schema,
  expanded,
  expandTrigger
}: ListFieldRowProps) {
  const typeName = useAtomValue(row.field('_type')) as string
  const setRows = useSetAtom(list.value)
  const type = schema[typeName]
  if (!type) return null

  const label = Type.label(type)
  // const icon = getType(type).icon || IcOutlineList

  function moveRow(direction: -1 | 1) {
    setRows(current => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  function deleteRow() {
    setRows(current =>
      current.filter((_, currentIndex) => currentIndex !== index)
    )
  }

  return (
    <GridListItem
      id={itemId}
      textValue={`${label} ${index + 1}`}
      className={styles.ListFieldRow()}
    >
      <BoxRow className={styles.ListFieldRow.header()}>
        <BoxHeader className={styles.ListFieldRow.leading()}>
          <Button slot="drag" appearance="plain" intent="secondary">
            ≡
          </Button>
          <strong className={styles.ListFieldRow.title()}>{label}</strong>
        </BoxHeader>
        <div className={styles.ListFieldRow.actions()}>
          {index != 0 && (
            <Button
              size="icon"
              aria-label={`Move ${label} up`}
              className={styles.ListFieldRow.action()}
              isDisabled={readOnly || index === 0}
              onPress={() => moveRow(-1)}
            >
              <Icon aria-hidden icon={IcRoundArrowUpward} />
            </Button>
          )}
          {index != rows - 1 && (
            <Button
              size="icon"
              aria-label={`Move ${label} down`}
              className={styles.ListFieldRow.action()}
              isDisabled={readOnly || index === rows - 1}
              onPress={() => moveRow(1)}
            >
              <Icon aria-hidden icon={IcRoundArrowDownward} />
            </Button>
          )}
          <Button
            size="icon"
            aria-label={`Remove ${label}`}
            className={styles.ListFieldRow.action()}
            isDisabled={readOnly}
            onPress={expandTrigger}
          >
            {expanded ? (
              <Icon aria-hidden icon={IcRoundUnfoldLess} />
            ) : (
              <Icon aria-hidden icon={IcRoundUnfoldMore} />
            )}
          </Button>
          <Button
            size="icon"
            aria-label={`Remove ${label}`}
            className={styles.ListFieldRow.action()}
            isDisabled={readOnly}
          >
            <Icon aria-hidden icon={IcRoundMoreVert} />
          </Button>
          <Button
            size="icon"
            aria-label={`Remove ${label}`}
            className={styles.ListFieldRow.action()}
            isDisabled={readOnly}
            onPress={deleteRow}
          >
            <Icon aria-hidden icon={IcRoundDelete} />
          </Button>
        </div>
      </BoxRow>
      {expanded && (
        <BoxContent className={styles.body()}>
          <NodeEditor
            node={row as ReactiveNode<object>}
            surface="plain"
            type={type}
          />
        </BoxContent>
      )}
    </GridListItem>
  )
}
