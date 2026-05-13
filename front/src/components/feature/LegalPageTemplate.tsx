import PublicLayout from './PublicLayout';

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageTemplateProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  updatedAt: string;
}

export default function LegalPageTemplate({
  eyebrow,
  title,
  intro,
  sections,
  updatedAt,
}: LegalPageTemplateProps) {
  return (
    <PublicLayout>
      <section className="bg-c2p-surface-soft pt-32 text-c2p-text">
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <div className="max-w-4xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">{eyebrow}</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#5b6778] sm:text-lg">{intro}</p>
            <p className="mt-6 text-sm text-[#7c8698]">Derniere mise a jour : {updatedAt}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f4ef] py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-[#e6dfd0] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold text-[#111]">{section.title}</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[#4a4a4a] sm:text-[15px]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
