import { Link } from 'react-router-dom';

interface BrandLogoProps {
  to?: string;
  className?: string;
  imageClassName?: string;
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  textWrapperClassName?: string;
}

function BrandLogoInner({
  imageClassName,
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  textWrapperClassName,
}: Omit<BrandLogoProps, 'to' | 'className'>) {
  return (
    <>
      <img
        src="/images/brand/c2p-admin-logo.png"
        alt={title ?? 'Centre C2P'}
        className={imageClassName ?? 'h-10 w-auto object-contain'}
      />
      {(title || subtitle) && (
        <div className={textWrapperClassName}>
          {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
          {title ? <p className={titleClassName}>{title}</p> : null}
        </div>
      )}
    </>
  );
}

export default function BrandLogo({
  to,
  className,
  imageClassName,
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  textWrapperClassName,
}: BrandLogoProps) {
  const content = (
    <BrandLogoInner
      imageClassName={imageClassName}
      title={title}
      subtitle={subtitle}
      titleClassName={titleClassName}
      subtitleClassName={subtitleClassName}
      textWrapperClassName={textWrapperClassName}
    />
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
