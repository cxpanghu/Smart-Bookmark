import InfoCollections from "@/components/InfoCollections";
import type { Settings } from "@/types";

interface Props {
  settings: Settings;
}

export default function InfoRadar({ settings }: Props) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <InfoCollections language={settings.language} />
    </div>
  );
}
