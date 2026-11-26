import { useCallback, useEffect, useState } from "react";
import type { BookmarkNode } from "@/types";
import { getTree } from "@/lib/bookmarks";

export function useBookmarkTree() {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const reload = useCallback(async () => {
    setTree(await getTree());
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    chrome.bookmarks?.onChanged?.addListener(onChange);
    chrome.bookmarks?.onCreated?.addListener(onChange);
    chrome.bookmarks?.onRemoved?.addListener(onChange);
    chrome.bookmarks?.onMoved?.addListener(onChange);
    return () => {
      chrome.bookmarks?.onChanged?.removeListener(onChange);
      chrome.bookmarks?.onCreated?.removeListener(onChange);
      chrome.bookmarks?.onRemoved?.removeListener(onChange);
      chrome.bookmarks?.onMoved?.removeListener(onChange);
    };
  }, [reload]);

  return { tree, reload };
}
