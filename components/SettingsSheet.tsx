'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  ConfirmResetButton,
  SettingsSectionNav,
  renderSection,
  type SettingsFieldProps,
  type SettingsSection,
} from '@/components/SettingsDialog';

interface SettingsSheetProps extends SettingsFieldProps {
  open: boolean;
  onClose: () => void;
}

const COPY = {
  'delete-all': {
    title: 'Delete all conversations?',
    body: 'Every saved conversation will be permanently removed from this browser. This cannot be undone — export first if you want a copy.',
    action: 'Delete all',
  },
  'clear-data': {
    title: 'Clear all stored data?',
    body: 'This permanently deletes every conversation and resets all settings to their defaults. The page will reload.',
    action: 'Clear everything',
  },
  reset: {
    title: 'Reset all settings?',
    body: 'Theme, model, sampler, and chat preferences return to their defaults. Conversations are kept.',
    action: 'Reset',
  },
} as const;

type ConfirmKind = keyof typeof COPY;

/** The full settings panel, opened from the sidebar's gear on every breakpoint. */
export default function SettingsSheet(props: SettingsSheetProps) {
  const { open, onClose, onResetSettings } = props;
  const [section, setSection] = useState<SettingsSection>('appearance');
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Settings"
        description="Changes apply immediately and are saved in this browser."
        size="lg"
        footer={
          <>
            <ConfirmResetButton onClick={() => setConfirm('reset')} />
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row">
          <SettingsSectionNav section={section} onSelect={setSection} />
          <div className="min-w-0 flex-1 px-5 py-4">
            {renderSection(section, props)}
          </div>
        </div>
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm ? COPY[confirm].title : ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === 'reset' ? 'primary' : 'danger'}
              size="sm"
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action === 'delete-all') props.onDeleteAllSessions();
                else if (action === 'clear-data') {
                  props.onDataCleared();
                  window.location.reload();
                } else if (action === 'reset') onResetSettings();
              }}
            >
              {confirm ? COPY[confirm].action : ''}
            </Button>
          </>
        }
      >
        <p className="px-5 py-4 text-sm leading-6 text-ink-secondary">
          {confirm ? COPY[confirm].body : ''}
        </p>
      </Modal>
    </>
  );
}
