import { TemplateEditor } from "@/components/template-editor";
import { starterDesign } from "@/lib/email/starter";

export const metadata = { title: "Nueva plantilla" };

export default function NewTemplatePage() {
  return (
    <TemplateEditor initialName="Plantilla sin título" initialDesign={starterDesign()} />
  );
}
