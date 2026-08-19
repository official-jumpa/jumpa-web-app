import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";

/** Message entry. The dock behind it supplies the frosted panel. */
export function ChatComposer() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-11.5 flex-1 items-center gap-2.5 rounded-surface bg-jumpa-white p-1">
        <button
          type="button"
          aria-label="Add an attachment"
          className="flex h-full w-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-neutral-250 text-jumpa-grey-600"
        >
          <CirclePlusIcon className="size-6" />
        </button>

        <input
          type="text"
          aria-label="Message Jumpa"
          placeholder="Tap to start typing..."
          className="min-w-0 flex-1 pr-2.5 text-[10px] leading-5 font-medium text-jumpa-black outline-none placeholder:text-jumpa-black/20"
        />
      </div>

      <button
        type="button"
        aria-label="Dictate a message"
        className="flex size-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-alt-400 text-jumpa-secondary-600"
      >
        <MicrophoneIcon className="size-6" />
      </button>
    </div>
  );
}
