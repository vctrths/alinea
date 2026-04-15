import {Button, Icon, Tab, TabList, TabPanel, Tabs} from '@alinea/components'
import {styler} from '@alinea/styler'
import {IcRoundArrowForward} from 'alinea/ui/icons/IcRoundArrowForward.js'
import IcRoundRefresh from 'alinea/ui/icons/IcRoundRefresh.js'
import {useAtom, useAtomValue} from 'jotai'
import {
  IcRoundArrowBack,
  IcRoundHistory,
  IcRoundKeyboardTab,
  IcRoundLaunch,
  IcRoundVisibility
} from '../icons.js'
import {DashboardEntry} from '../store.js'
import css from './EntrySidebar.module.css'
import {Sidebar, SidebarBody, SidebarHeader} from './ui/Sidebar.js'

const styles = styler(css)

export interface EntrySidebarProps {
  entry: DashboardEntry
}

export function EntrySidebar({entry}: EntrySidebarProps) {
  const activeStatus = useAtomValue(entry.activeStatus)
  const currentlyEditing = useAtomValue(entry.currentlyEditing)
  const statuses = useAtomValue(entry.availableStatuses)
  const [selectedVersion, setSelectedVersion] = useAtom(entry.selectedVersion)
  return (
    <Sidebar>
      <Tabs defaultSelectedKey="history" variant="subtle">
        <SidebarHeader className={styles.tabControls()}>
          <Button
            size="icon"
            intent="secondary"
            appearance="outline"
            icon={IcRoundKeyboardTab}
          />
          <TabList aria-label="Entry sidebar">
            <Tab id="history">
              <Icon icon={IcRoundHistory} />
              History
            </Tab>
            <Tab id="preview">
              <Icon icon={IcRoundVisibility} />
              Preview
            </Tab>
          </TabList>
        </SidebarHeader>

        <SidebarBody>
          <TabPanel id="history">
            <ul>
              {statuses.map((status, index) => {
                const isEditing =
                  activeStatus == status && currentlyEditing !== undefined
                return (
                  <li key={status}>
                    <Button
                      onPress={() =>
                        setSelectedVersion({type: 'status', status})
                      }
                    >
                      {status}{' '}
                      {selectedVersion.type === 'status' &&
                      selectedVersion.status === status
                        ? 'selected'
                        : ''}
                      {isEditing ? 'editing' : ''}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </TabPanel>
          <TabPanel id="preview">
            <SidebarHeader>
              <div className={styles.previewControls()}>
                <Button
                  size="icon"
                  appearance="outline"
                  intent="secondary"
                  icon={IcRoundArrowBack}
                />
                <Button
                  size="icon"
                  appearance="outline"
                  intent="secondary"
                  icon={IcRoundArrowForward}
                />
                <Button
                  size="icon"
                  appearance="outline"
                  intent="secondary"
                  icon={IcRoundRefresh}
                />
              </div>
              <Button
                size="icon"
                appearance="outline"
                intent="secondary"
                icon={IcRoundLaunch}
              />
            </SidebarHeader>
          </TabPanel>
        </SidebarBody>
      </Tabs>
    </Sidebar>
  )
}
