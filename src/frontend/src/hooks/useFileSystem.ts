import { useCallback, useRef, useState } from "react";

export function useFileSystem() {
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const isSupported =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  const requestFolder = useCallback(async () => {
    if (!isSupported) return;
    try {
      // @ts-ignore – File System Access API
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      dirHandleRef.current = handle;
      setFolderName(handle.name);
    } catch {
      // User cancelled
    }
  }, [isSupported]);

  const saveFile = useCallback(async (title: string, content: string) => {
    if (!dirHandleRef.current) return;
    try {
      const safeName = title.replace(/[^a-z0-9_\-. ]/gi, "_");
      const fileName = `${safeName}.fountain`;
      // @ts-ignore – File System Access API
      const fileHandle = await dirHandleRef.current.getFileHandle(fileName, {
        create: true,
      });
      // @ts-ignore – File System Access API
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (e) {
      console.warn("File system save failed:", e);
    }
  }, []);

  return {
    folderName,
    isLinked: !!folderName,
    isSupported,
    requestFolder,
    saveFile,
  };
}
