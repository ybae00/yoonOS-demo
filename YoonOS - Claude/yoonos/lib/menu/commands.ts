export type MenuCommand = {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  action?: () => void;
};

export type MenuDefinition = {
  id: string;
  label: string;
  items: MenuCommand[];
};

export function createMenuDefinitions(handlers: {
  openAbout: () => void;
  openSystemSettings: () => void;
  signOut: () => void;
  openFinder: () => void;
  closeWindow: () => void;
  closeAllWindows: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  focusNextWindow: () => void;
  bringAllToFront: () => void;
  toggleHiddenFiles: () => void;
  openWindows: { id: string; title: string; isActive: boolean; focus: () => void }[];
}): MenuDefinition[] {
  return [
    {
      id: 'yoonos',
      label: 'YoonOS',
      items: [
        { id: 'about', label: 'About YoonOS', action: handlers.openAbout },
        { id: 'sep1', label: '', separator: true },
        { id: 'settings', label: 'System Settings...', shortcut: '⌘,', action: handlers.openSystemSettings },
        { id: 'sep2', label: '', separator: true },
        { id: 'signout', label: 'Sign Out', action: handlers.signOut },
      ],
    },
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new-finder', label: 'New Finder Window', shortcut: '⌘N', action: handlers.openFinder },
        { id: 'sep1', label: '', separator: true },
        { id: 'close-window', label: 'Close Window', shortcut: '⌘W', action: handlers.closeWindow },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: '⌘Z', disabled: true },
        { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
        { id: 'sep1', label: '', separator: true },
        { id: 'cut', label: 'Cut', shortcut: '⌘X', action: () => document.execCommand('cut') },
        { id: 'copy', label: 'Copy', shortcut: '⌘C', action: () => document.execCommand('copy') },
        { id: 'paste', label: 'Paste', shortcut: '⌘V', action: () => document.execCommand('paste') },
        { id: 'selectall', label: 'Select All', shortcut: '⌘A', action: () => document.execCommand('selectAll') },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'show-hidden', label: 'Show Hidden Files', action: handlers.toggleHiddenFiles },
      ],
    },
    {
      id: 'window',
      label: 'Window',
      items: [
        { id: 'minimize', label: 'Minimize', shortcut: '⌘M', action: handlers.minimizeWindow },
        { id: 'zoom', label: 'Zoom', action: handlers.maximizeWindow },
        { id: 'sep1', label: '', separator: true },
        { id: 'cycle', label: 'Cycle Through Windows', shortcut: '⌘`', action: handlers.focusNextWindow },
        { id: 'bring-all', label: 'Bring All to Front', action: handlers.bringAllToFront },
        { id: 'close-all', label: 'Close All Windows', action: handlers.closeAllWindows },
        ...(handlers.openWindows.length > 0
          ? [
              { id: 'sep-windows', label: '', separator: true } as MenuCommand,
              ...handlers.openWindows.map((w) => ({
                id: `win-${w.id}`,
                label: `${w.isActive ? '✓ ' : '  '}${w.title}`,
                action: w.focus,
              })),
            ]
          : []),
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { id: 'about-help', label: 'About YoonOS', action: handlers.openAbout },
      ],
    },
  ];
}
