import { WhatsAppMark } from "./whatsapp-mark";

/**
 * Most orders start as a WhatsApp message, so the chat stays one tap away on
 * every public page instead of hiding in the footer. It appears only once the
 * kitchen's number is on file at `/admin/settings`.
 */
export function WhatsAppAssistant({
  href,
  number,
}: {
  href: string;
  number: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Message ${number} on WhatsApp`}
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-brass px-4 py-3 text-[0.875rem] font-semibold text-paper shadow-lg transition-transform hover:-translate-y-0.5 md:bottom-6 md:right-6"
    >
      <WhatsAppMark className="size-5" />
      <span className="hidden sm:inline">Chat with us</span>
    </a>
  );
}
