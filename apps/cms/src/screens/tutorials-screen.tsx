import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ListVideo } from "lucide-react";
import { BareIconButton, buttonVariants, Modal, PanelHeader, ScrollArea, Tooltip } from "../components/atoms";
import { TutorialDetail } from "../tutorials/tutorial-detail";
import { TutorialList } from "../tutorials/tutorial-list";
import { tutorials } from "../tutorials/library";
import { useTutorialMedia } from "../tutorials/use-tutorial-media";

type TutorialsScreenProps = {
  activeId: string;
  onBack: () => void;
  onSelect: (id: string) => void;
};

export default function TutorialsScreen({ activeId, onBack, onSelect }: TutorialsScreenProps) {
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState("1");
  const index = Math.max(0, tutorials.findIndex((tutorial) => tutorial.id === activeId));
  const current = tutorials[index];
  const media = useTutorialMedia(current.id);

  function select(id: string) {
    onSelect(id);
    setPickerOpen(false);
  }

  const listProps = { activeId: current.id, onSelect: select, query, onQueryChange: setQuery };

  return (
    <main className="flex min-h-0 min-w-0 flex-1" aria-label="CMS tutorials">
      <aside className="hidden w-pane shrink-0 flex-col border-r border-cms-line-strong lg:flex" aria-label="Tutorial library">
        <PanelHeader><span className="text-ui-lg font-semibold">Tutorials</span></PanelHeader>
        <ScrollArea className="min-h-0 flex-1"><TutorialList {...listProps} /></ScrollArea>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Selected tutorial">
        <PanelHeader className="justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip content="Back to editor">
              <BareIconButton aria-label="Back to editor" onClick={onBack}><ArrowLeft aria-hidden="true" size={15} /></BareIconButton>
            </Tooltip>
            <h1 className="m-0 truncate text-ui-lg font-semibold">Tutorials</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Tooltip content="Choose a tutorial">
              <BareIconButton aria-label="Choose a tutorial" className="lg:hidden" onClick={() => setPickerOpen(true)}><ListVideo aria-hidden="true" size={15} /></BareIconButton>
            </Tooltip>
            <Tooltip content="Previous tutorial">
              <BareIconButton aria-label="Previous tutorial" disabled={index === 0} onClick={() => select(tutorials[index - 1].id)}><ChevronLeft aria-hidden="true" size={15} /></BareIconButton>
            </Tooltip>
            <Tooltip content="Next tutorial">
              <BareIconButton aria-label="Next tutorial" disabled={index === tutorials.length - 1} onClick={() => select(tutorials[index + 1].id)}><ChevronRight aria-hidden="true" size={15} /></BareIconButton>
            </Tooltip>
            {media.media && media.mediaUsable ? <a className={buttonVariants({ variant: "normal" })} href={media.media.pdf} rel="noreferrer" target="_blank"><Download aria-hidden="true" size={13} /> PDF guide</a> : null}
          </div>
        </PanelHeader>
        <TutorialDetail key={current.id} files={media.media} mediaUsable={media.mediaUsable} mediaError={media.error} mediaLoading={media.loading} onRetryMedia={media.retry} onPlaybackRateChange={setPlaybackRate} playbackRate={playbackRate} tutorial={current} />
      </section>
      <Modal className="w-100" onClose={() => setPickerOpen(false)} open={pickerOpen} title="Choose a tutorial"><TutorialList {...listProps} /></Modal>
    </main>
  );
}
