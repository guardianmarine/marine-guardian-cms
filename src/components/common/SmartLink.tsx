import { Link, LinkProps } from 'react-router-dom';

function isExternal(href: string): boolean {
  try {
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    const url = new URL(href, window.location.origin);
    return url.origin !== window.location.origin;
  } catch {
    // Relative paths, anchors, etc. are treated as internal
    return false;
  }
}

type Props = (
  | ({ to: string } & Omit<LinkProps, 'to'>)
  | ({ href: string; target?: string; rel?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
);

/**
 * SmartLink automatically detects if a link is internal or external.
 * - For internal links: Uses React Router's Link component (SPA navigation)
 * - For external links: Uses regular <a> tag with proper security attributes
 * 
 * Usage:
 * <SmartLink to="/dashboard">Dashboard</SmartLink>
 * <SmartLink href="/dashboard">Dashboard</SmartLink>
 * <SmartLink href="https://example.com">External</SmartLink>
 */
export default function SmartLink(props: Props) {
  // Mode: Link with 'to' prop
  if ('to' in props) {
    const { to, ...rest } = props;
    return <Link to={to} {...rest} />;
  }
  
  // Mode: anchor with 'href' prop
  const { href, target, rel, ...rest } = props as any;
  
  // Check if external
  if (!isExternal(href)) {
    // Internal link → use Link
    return <Link to={href} {...(rest as any)} />;
  }
  
  // External link → use <a> with security defaults
  return (
    <a 
      href={href} 
      target={target ?? '_blank'} 
      rel={rel ?? 'noopener noreferrer'} 
      {...rest} 
    />
  );
}
