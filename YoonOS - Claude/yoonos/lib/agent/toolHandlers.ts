import { useWindowStore } from '@/stores/windowStore';
import { useBrowserStore } from '@/stores/browserStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { useTextEditStore } from '@/stores/textEditStore';
import { usePhotoBoothStore } from '@/stores/photoBoothStore';
import { useAgentStore } from '@/stores/agentStore';
import { useAuthStore } from '@/stores/authStore';
import { AppName } from '@/types';

export function handleToolOnClient(
  toolName: string,
  input: Record<string, unknown>
): string {
  const userId = useAuthStore.getState().userId;

  switch (toolName) {
    case 'open_app': {
      const appName = input.app_name as AppName;
      useWindowStore.getState().openWindow(appName);
      return JSON.stringify({ status: 'ok', opened: appName });
    }

    case 'navigate_browser': {
      const url = input.url as string;
      useWindowStore.getState().openWindow('browser');
      useBrowserStore.getState().navigate(url);
      useAgentStore.getState().setCurrentBrowserUrl(url);
      return JSON.stringify({ status: 'ok', navigated_to: url });
    }

    case 'type_in_text_editor': {
      const content = input.content as string;
      const mode = (input.mode as string) || 'replace';
      useWindowStore.getState().openWindow('textedit');

      const store = useTextEditStore.getState();
      if (!store.activeFileId && userId) {
        store.createFile(userId);
      }
      if (mode === 'append') {
        const activeFile = store.files.find((f) => f.id === store.activeFileId);
        const existing = activeFile?.content || '';
        useTextEditStore.getState().updateContent(existing + content);
      } else {
        useTextEditStore.getState().updateContent(content);
      }
      if (userId) {
        useTextEditStore.getState().saveActiveFile(userId);
      }
      return JSON.stringify({ status: 'ok', mode, length: content.length });
    }

    case 'get_text_editor_content': {
      const store = useTextEditStore.getState();
      const activeFile = store.files.find((f) => f.id === store.activeFileId);
      return activeFile?.content || '(No file open or file is empty)';
    }

    case 'create_calendar_event': {
      const date = input.date as string;
      const title = input.title as string;
      const notes = input.notes as string | undefined;
      useWindowStore.getState().openWindow('calendar');
      if (userId) {
        useCalendarStore.getState().addEvent(userId, date, title, notes);
      }
      return JSON.stringify({ status: 'ok', date, title });
    }

    case 'get_calendar_events': {
      const date = input.date as string;
      const events = useCalendarStore.getState().getEventsForDate(date);
      if (events.length === 0) return `No events found for ${date}`;
      return JSON.stringify(events.map((e) => ({ title: e.title, notes: e.notes })));
    }

    case 'capture_photo': {
      useWindowStore.getState().openWindow('photobooth');
      usePhotoBoothStore.getState().requestCapture();
      return JSON.stringify({ status: 'ok', message: 'Photo capture triggered' });
    }

    default:
      return JSON.stringify({ status: 'error', message: `Unknown tool: ${toolName}` });
  }
}
