import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { riskDisclaimer } from "@/config/site";

export function Disclaimer({ text = riskDisclaimer }: { text?: string }) {
  return (
    <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={18} />} radius="lg">
      {text}
    </Alert>
  );
}
