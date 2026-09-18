import Image from "next/image";
import { FaqList } from "@/components/support/faq-list";
import { SupportHeader } from "@/components/support/support-header";

/** `/support?view=faqs`. */
export function FaqScreen() {
  return (
    <div className="px-4.5 pb-12">
      <SupportHeader
        action={
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={96}
            height={20}
            className="h-5 w-24 object-contain"
          />
        }
      >
        <h1 className="text-[13px] leading-4 font-medium text-jumpa-black">
          Jumpa FAQs
        </h1>
      </SupportHeader>

      <div className="mt-4">
        <FaqList />
      </div>
    </div>
  );
}
