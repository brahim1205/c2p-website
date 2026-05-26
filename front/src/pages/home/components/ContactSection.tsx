import { useState, type FormEvent } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { apiRequest } from '@/lib/api';
import { ContactFormColumn, ContactIntroColumn } from './ContactSectionPanels';
import type { ContactSubmitState } from './contactSectionModel';

export default function ContactSection() {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>();
  const [newsletterState, setNewsletterState] = useState<ContactSubmitState>('idle');
  const [contactState, setContactState] = useState<ContactSubmitState>('idle');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('general');

  const handleNewsletterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!newsletterEmail) return;

    setNewsletterState('loading');

    try {
      await apiRequest(
        '/public/newsletter',
        {
          method: 'POST',
          body: JSON.stringify({
            email: newsletterEmail,
            source: 'home-contact-section',
          }),
        },
        { retryOnAuth: false },
      );

      setNewsletterState('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterState('idle'), 4000);
    } catch {
      setNewsletterState('error');
      setTimeout(() => setNewsletterState('idle'), 4000);
    }
  };

  const handleContactSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !prenom || !nom || !message) return;

    setContactState('loading');

    try {
      await apiRequest(
        '/public/contact',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: prenom,
            lastName: nom,
            email,
            subject,
            message,
          }),
        },
        { retryOnAuth: false },
      );

      setContactState('success');
      setEmail('');
      setPrenom('');
      setNom('');
      setMessage('');
      setTimeout(() => setContactState('idle'), 4000);
    } catch {
      setContactState('error');
      setTimeout(() => setContactState('idle'), 4000);
    }
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#ffffff] px-4 py-24 sm:px-6 lg:px-20 lg:py-32">
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-[#5fa6f3]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#06053a]/5 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          <ContactIntroColumn
            isVisible={isVisible}
            newsletterEmail={newsletterEmail}
            newsletterState={newsletterState}
            onNewsletterEmailChange={setNewsletterEmail}
            onNewsletterSubmit={handleNewsletterSubmit}
          />
          <ContactFormColumn
            isVisible={isVisible}
            firstName={prenom}
            lastName={nom}
            email={email}
            subject={subject}
            message={message}
            state={contactState}
            onFirstNameChange={setPrenom}
            onLastNameChange={setNom}
            onEmailChange={setEmail}
            onSubjectChange={setSubject}
            onMessageChange={setMessage}
            onSubmit={handleContactSubmit}
          />
        </div>
      </div>
    </section>
  );
}
