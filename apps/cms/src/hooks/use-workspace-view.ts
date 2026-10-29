import { useCallback, useEffect, useRef, useState } from "react";

export type WorkspaceView = { page: "content" } | { page: "tutorials"; tutorialId: string };

export function workspaceViewFromHash(hash: string): WorkspaceView {
  if (hash !== "#tutorials" && !hash.startsWith("#tutorials/")) return { page: "content" };
  const id = hash.slice("#tutorials/".length);
  const valid = /^\d{2}$/.test(id) && Number(id) >= 1 && Number(id) <= 21;
  return { page: "tutorials", tutorialId: valid ? id : "01" };
}

/** Change the visible screen without resetting the workspace's draft and staged files. */
export function useWorkspaceView() {
  const [view, setView] = useState(() => workspaceViewFromHash(window.location.hash));
  const lastTutorialId = useRef(view.page === "tutorials" ? view.tutorialId : "01");

  useEffect(() => {
    function handleHashChange() {
      const next = workspaceViewFromHash(window.location.hash);
      if (next.page === "tutorials") lastTutorialId.current = next.tutorialId;
      setView(next);
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((next: WorkspaceView, replace = false) => {
    if (next.page === "tutorials") lastTutorialId.current = next.tutorialId;
    const hash = next.page === "tutorials" ? `#tutorials/${next.tutorialId}` : "";
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history[replace ? "replaceState" : "pushState"](null, "", url);
    }
    setView(next);
  }, []);

  return {
    view,
    showContent: () => navigate({ page: "content" }),
    showTutorials: () => navigate({ page: "tutorials", tutorialId: lastTutorialId.current }),
    selectTutorial: (tutorialId: string) => navigate({ page: "tutorials", tutorialId }, true)
  };
}
