import { useWindowStore } from '../stores/windowStore';

beforeEach(() => {
  useWindowStore.setState({ windows: [], maxZIndex: 10, activeWindowId: null });
});

describe('windowStore', () => {
  it('opens a window', () => {
    useWindowStore.getState().openWindow('finder');
    const { windows } = useWindowStore.getState();
    expect(windows).toHaveLength(1);
    expect(windows[0].app).toBe('finder');
    expect(windows[0].minimized).toBe(false);
    expect(windows[0].maximized).toBe(false);
  });

  it('does not open duplicate windows for same app', () => {
    useWindowStore.getState().openWindow('browser');
    useWindowStore.getState().openWindow('browser');
    expect(useWindowStore.getState().windows).toHaveLength(1);
  });

  it('closes a window and updates active', () => {
    useWindowStore.getState().openWindow('finder');
    useWindowStore.getState().openWindow('browser');
    const { windows } = useWindowStore.getState();
    const finderWin = windows.find((w) => w.app === 'finder')!;
    useWindowStore.getState().closeWindow(finderWin.id);
    const state = useWindowStore.getState();
    expect(state.windows).toHaveLength(1);
    expect(state.windows[0].app).toBe('browser');
  });

  it('minimizes and restores a window', () => {
    useWindowStore.getState().openWindow('calendar');
    const win = useWindowStore.getState().windows[0];
    useWindowStore.getState().minimizeWindow(win.id);
    expect(useWindowStore.getState().windows[0].minimized).toBe(true);
    useWindowStore.getState().restoreWindow('calendar');
    expect(useWindowStore.getState().windows[0].minimized).toBe(false);
  });

  it('maximizes and restores a window', () => {
    useWindowStore.getState().openWindow('textedit');
    const win = useWindowStore.getState().windows[0];
    const originalWidth = win.width;

    useWindowStore.getState().maximizeWindow(win.id);
    const maxed = useWindowStore.getState().windows[0];
    expect(maxed.maximized).toBe(true);
    expect(maxed.previousBounds).toBeDefined();

    useWindowStore.getState().restoreWindowById(win.id);
    const restored = useWindowStore.getState().windows[0];
    expect(restored.maximized).toBe(false);
    expect(restored.width).toBe(originalWidth);
  });

  it('toggleMaximize toggles between states', () => {
    useWindowStore.getState().openWindow('browser');
    const win = useWindowStore.getState().windows[0];
    useWindowStore.getState().toggleMaximize(win.id);
    expect(useWindowStore.getState().windows[0].maximized).toBe(true);
    useWindowStore.getState().toggleMaximize(win.id);
    expect(useWindowStore.getState().windows[0].maximized).toBe(false);
  });

  it('brings window to front and sets active', () => {
    useWindowStore.getState().openWindow('finder');
    useWindowStore.getState().openWindow('browser');
    const finder = useWindowStore.getState().windows.find((w) => w.app === 'finder')!;
    useWindowStore.getState().bringToFront(finder.id);
    expect(useWindowStore.getState().activeWindowId).toBe(finder.id);
  });

  it('closeAllWindows empties the list', () => {
    useWindowStore.getState().openWindow('finder');
    useWindowStore.getState().openWindow('browser');
    useWindowStore.getState().closeAllWindows();
    expect(useWindowStore.getState().windows).toHaveLength(0);
    expect(useWindowStore.getState().activeWindowId).toBeNull();
  });
});
