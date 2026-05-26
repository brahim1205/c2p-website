import type { LessonContentBlock } from '../types';

function renderTextWithStrong(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export default function LessonArticle({ blocks }: { blocks: LessonContentBlock[] }) {
  return (
    <article className="mx-auto max-w-4xl space-y-7 text-[17px] leading-8 text-slate-800">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h2 key={index} className="pt-2 text-2xl font-bold leading-tight text-slate-950">
              {block.text}
            </h2>
          );
        }

        if (block.type === 'paragraph') {
          return <p key={index}>{renderTextWithStrong(block.text)}</p>;
        }

        if (block.type === 'quote') {
          return (
            <blockquote key={index} className="border-l-4 border-slate-300 pl-5 text-slate-700">
              {renderTextWithStrong(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="space-y-2 pl-6 list-disc">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderTextWithStrong(item)}</li>
              ))}
            </ul>
          );
        }

        const isWarning = block.tone === 'warning';
        return (
          <div
            key={index}
            className={`relative rounded-2xl px-6 py-5 ${
              isWarning ? 'bg-orange-50 text-orange-950' : 'bg-sky-50 text-sky-950'
            }`}
          >
            <div
              className={`absolute -left-3 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white ${
                isWarning ? 'bg-orange-400' : 'bg-sky-500'
              }`}
            >
              <i className={`${isWarning ? 'ri-error-warning-line' : 'ri-information-line'} text-lg`}></i>
            </div>
            <p className="pl-2">{renderTextWithStrong(block.text)}</p>
          </div>
        );
      })}
    </article>
  );
}
