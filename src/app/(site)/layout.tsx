import { PublicChrome } from "@/components/site/public-chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>;
}
