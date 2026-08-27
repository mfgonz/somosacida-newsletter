import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Nuevo contacto" };

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nuevo contacto" />
      <div className="card p-6">
        <ContactForm />
      </div>
    </div>
  );
}
