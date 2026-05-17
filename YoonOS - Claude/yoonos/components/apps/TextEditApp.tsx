'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FilePlus, FileText, Trash2, Check, Pencil } from 'lucide-react';
import { useTextEditStore } from '@/stores/textEditStore';
import { useAuthStore } from '@/stores/authStore';

export default function TextEditApp() {
  const {
    files,
    activeFileId,
    createFile,
    updateContent,
    renameFile,
    setActiveFile,
    removeFile,
    saveActiveFile,
    initLocal,
  } = useTextEditStore();
  const userId = useAuthStore((s) => s.userId);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!userId) {
      initLocal();
    }
  }, [userId, initLocal]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  const handleCreate = () => {
    createFile(userId);
  };

  const startRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    setEditingName(fileId);
    setNameInput(file?.name || '');
  };

  const commitRename = () => {
    if (editingName && nameInput.trim()) {
      renameFile(editingName, nameInput.trim(), userId);
    }
    setEditingName(null);
  };

  const handleContentChange = useCallback(
    (content: string) => {
      updateContent(content);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveActiveFile(userId);
      }, 1000);
    },
    [updateContent, saveActiveFile, userId]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full bg-white text-black">
      <div className="w-40 bg-neutral-50 border-r border-black/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b border-black/10">
          <span className="text-[10px] text-black/40 uppercase tracking-wider">Files</span>
          <button
            onClick={handleCreate}
            className="p-0.5 hover:bg-black/5 rounded transition-colors"
            title="New File"
          >
            <FilePlus className="w-3.5 h-3.5 text-black/60" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-1">
          {files.length === 0 && (
            <p className="text-[10px] text-black/25 px-2 py-4 text-center">No files yet</p>
          )}
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group transition-colors
                ${file.id === activeFileId ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            >
              <FileText className="w-3 h-3 text-current opacity-60 flex-shrink-0" />
              <span className="text-xs text-current opacity-80 truncate flex-1">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id, userId);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
              >
                <Trash2 className="w-2.5 h-2.5 text-current opacity-70" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeFile ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-black/10">
              {editingName === activeFile.id ? (
                <div className="flex items-center gap-1">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                    onBlur={commitRename}
                    className="bg-white border border-black/10 text-xs text-black px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-black w-32"
                    autoFocus
                  />
                  <button onClick={commitRename} className="p-0.5">
                    <Check className="w-3 h-3 text-black" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-black/60">{activeFile.name}</span>
                  <button
                    onClick={() => startRename(activeFile.id)}
                    className="p-0.5 hover:bg-black/5 rounded transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5 text-black/30" />
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={activeFile.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 bg-white text-black/90 text-sm p-3 resize-none outline-none font-mono leading-relaxed"
              placeholder="Start typing..."
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-black/30 gap-2">
            <FileText className="w-10 h-10 opacity-30" />
            <p className="text-sm">Create or select a file</p>
          </div>
        )}
      </div>
    </div>
  );
}
