import { APP_REGISTRY, getAppEntry, getDockApps, getDefaultSize, getAppTitle } from '../lib/apps/registry';

describe('App Registry', () => {
  it('contains finder app', () => {
    const finder = getAppEntry('finder');
    expect(finder).toBeDefined();
    expect(finder!.title).toBe('Finder');
    expect(finder!.showInDock).toBe(true);
  });

  it('getDockApps returns apps sorted by dockOrder', () => {
    const dockApps = getDockApps();
    expect(dockApps.length).toBeGreaterThan(0);
    for (let i = 1; i < dockApps.length; i++) {
      expect(dockApps[i].dockOrder).toBeGreaterThanOrEqual(dockApps[i - 1].dockOrder);
    }
  });

  it('getDefaultSize returns dimensions', () => {
    const size = getDefaultSize('browser');
    expect(size.width).toBe(800);
    expect(size.height).toBe(600);
  });

  it('getDefaultSize returns fallback for unknown app', () => {
    const size = getDefaultSize('nonexistent' as any);
    expect(size.width).toBe(600);
    expect(size.height).toBe(400);
  });

  it('getAppTitle returns human title', () => {
    expect(getAppTitle('systemsettings')).toBe('System Settings');
    expect(getAppTitle('photobooth')).toBe('Photo Booth');
  });

  it('all registry entries have required fields', () => {
    for (const entry of APP_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.defaultWidth).toBeGreaterThan(0);
      expect(entry.defaultHeight).toBeGreaterThan(0);
      expect(typeof entry.showInDock).toBe('boolean');
      expect(typeof entry.dockOrder).toBe('number');
    }
  });
});
