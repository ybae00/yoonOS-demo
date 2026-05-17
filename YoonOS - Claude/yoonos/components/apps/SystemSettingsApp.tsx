'use client';

import { useState, useRef, useEffect } from 'react';
import { Image, User, Check, Upload, Monitor, RotateCw, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { updateUserSettings } from '@/lib/storage/settings';
import { uploadWallpaper } from '@/lib/storage/wallpapers';
import { isNativeAvailable } from '@/types/native';

type Section = 'wallpaper' | 'profile';
type WallpaperTab = 'presets' | 'color' | 'custom';

const PRESETS: { name: string; css: string; label: string }[] = [
  { name: 'gradient-blue', css: 'url("/wallpapers/dune-dark.png") center center / cover no-repeat', label: 'Dark Dune' },
  { name: 'gradient-purple', css: 'linear-gradient(135deg, #fafafa 0%, #eeeeee 50%, #d4d4d4 100%)', label: 'Paper Gray' },
  { name: 'gradient-green', css: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #cfcfcf 100%)', label: 'Bright Mono' },
  { name: 'gradient-sunset', css: 'linear-gradient(135deg, #fdfdfd 0%, #e9e9e9 55%, #bdbdbd 100%)', label: 'Warm Gray' },
  { name: 'gradient-mono', css: 'linear-gradient(135deg, #ffffff 0%, #f3f3f3 50%, #111111 100%)', label: 'Black & White' },
];

const SIDEBAR: { key: Section; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'wallpaper', label: 'Wallpaper', Icon: Image },
  { key: 'profile', label: 'Profile', Icon: User },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function SystemSettingsApp() {
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const settings = useAuthStore((s) => s.settings);

  const [section, setSection] = useState<Section>('wallpaper');
  const [wallpaperTab, setWallpaperTab] = useState<WallpaperTab>('presets');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [colorValue, setColorValue] = useState(
    settings?.wallpaper_type === 'color' ? settings.wallpaper_value : '#ffffff'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const native = isNativeAvailable();

  const syncLocalWallpaper = async (
    wallpaperType: 'preset' | 'color' | 'local' | 'cloud',
    wallpaperValue: string
  ) => {
    if (!native || !window.yoonosNative) return;
    await window.yoonosNative.settings.setLocal({ wallpaperType, wallpaperValue });
    window.dispatchEvent(new Event('yoonos:local-settings-updated'));
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handlePresetSelect = async (presetName: string) => {
    setError(null);
    try {
      const ok = await updateUserSettings({ wallpaper_type: 'preset', wallpaper_value: presetName });
      if (!ok && !native) {
        setError('Failed to update wallpaper');
        return;
      }
      await syncLocalWallpaper('preset', presetName);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update wallpaper');
    }
  };

  const handleColorChange = async (hex: string) => {
    setError(null);
    setColorValue(hex);
    try {
      const ok = await updateUserSettings({ wallpaper_type: 'color', wallpaper_value: hex });
      if (!ok && !native) {
        setError('Failed to update wallpaper');
        return;
      }
      await syncLocalWallpaper('color', hex);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update wallpaper');
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Use JPG, PNG, or WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
    }
    return null;
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setSaving(true);

    try {
      const url = await uploadWallpaper(userId, file);
      if (url) {
        const ext = file.name.split('.').pop();
        const storagePath = `${userId}/wallpaper.${ext}`;
        const ok = await updateUserSettings({ wallpaper_type: 'custom', wallpaper_value: storagePath });
        if (!ok && !native) {
          setError('Uploaded image but failed to apply wallpaper');
          return;
        }
        await syncLocalWallpaper('cloud', storagePath);
      } else {
        setError('Upload failed — please try again.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNativePick = async () => {
    const native = window.yoonosNative;
    if (!native) return;

    setError(null);
    const picked = await native.wallpaper.pickLocalImage();
    if (!picked) return;

    setSaving(true);
    try {
      await native.settings.setLocal({ wallpaperType: 'local', wallpaperValue: picked.path });
      setPreview(`file://${picked.path}`);
      window.dispatchEvent(new Event('yoonos:local-settings-updated'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to set wallpaper');
    }
    setSaving(false);
  };

  const handleResetDefault = async () => {
    setError(null);
    setPreview(null);
    try {
      const ok = await updateUserSettings({ wallpaper_type: 'preset', wallpaper_value: 'gradient-blue' });
      if (!ok && !native) {
        setError('Failed to reset wallpaper');
        return;
      }
      await syncLocalWallpaper('preset', 'gradient-blue');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset wallpaper');
    }
  };

  const handleSaveProfile = async () => {
    if (!userId || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', userId);
    if (!err) {
      useAuthStore.getState().updateProfile({ display_name: displayName.trim() });
    } else {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full bg-white text-black">
      {/* Sidebar */}
      <div className="w-40 bg-neutral-50 border-r border-black/10 flex flex-col py-2">
        {SIDEBAR.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setSection(key); setError(null); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              section === key ? 'bg-black text-white' : 'text-black/55 hover:bg-black/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {error && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-neutral-100 border border-black/15 rounded-lg text-xs text-black">
            <X className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-black/50 hover:text-black">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {section === 'wallpaper' && (
          <div>
            <h2 className="text-sm font-medium mb-3">Wallpaper</h2>
            <div className="flex gap-1 mb-4">
              {(['presets', 'color', 'custom'] as WallpaperTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setWallpaperTab(t)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    wallpaperTab === t ? 'bg-black text-white' : 'text-black/50 hover:text-black'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {wallpaperTab === 'presets' && (
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handlePresetSelect(p.name)}
                    className={`relative h-16 rounded-lg border transition-all ${
                      settings?.wallpaper_type === 'preset' && settings.wallpaper_value === p.name
                        ? 'border-black ring-1 ring-black'
                        : 'border-black/10 hover:border-black/30'
                    }`}
                    style={{ background: p.css }}
                    title={p.label}
                  >
                    {settings?.wallpaper_type === 'preset' && settings.wallpaper_value === p.name && (
                      <Check className="absolute top-1 right-1 w-3 h-3 text-black" />
                    )}
                    <span className="absolute bottom-1 left-1 text-[9px] text-black/60">{p.label}</span>
                  </button>
                ))}
              </div>
            )}

            {wallpaperTab === 'color' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorValue}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-black/20 bg-transparent"
                  />
                  <span className="text-xs text-black/50 font-mono">{colorValue}</span>
                </div>
                <div
                  className="w-full h-16 rounded-lg border border-black/10"
                  style={{ backgroundColor: colorValue }}
                />
              </div>
            )}

            {wallpaperTab === 'custom' && (
              <div className="space-y-3">
                {preview && (
                  <div className="relative">
                    <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-black/10" />
                    <span className="absolute top-1 left-1 text-[9px] bg-white/80 px-1 rounded text-black/70">Preview</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCustomUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-black/80 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {saving ? 'Uploading...' : 'Upload Image'}
                  </button>

                  {native && (
                    <button
                      onClick={handleNativePick}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 border border-black/10 rounded-lg text-xs transition-colors disabled:opacity-50"
                    >
                      <Monitor className="w-4 h-4" />
                      Choose from Computer
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-black/35">JPG, PNG, or WebP up to 10 MB</p>

                <button
                  onClick={handleResetDefault}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-black/50 hover:text-black transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  Reset to default
                </button>
              </div>
            )}
          </div>
        )}

        {section === 'profile' && (
          <div>
            <h2 className="text-sm font-medium mb-3">Profile</h2>
            <div className="space-y-3 max-w-xs">
              <div>
                <label className="text-[10px] text-black/40 uppercase tracking-wider block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="px-4 py-2 bg-black hover:bg-black/80 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
