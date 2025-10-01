import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to hijack internal links in HTML content (e.g., from CMS or third-party sources)
 * and convert them to SPA navigation using React Router.
 * 
 * This prevents hard reloads when clicking on internal links in dynamically rendered HTML.
 * 
 * @param containerRef - Optional ref to a container element to scope the hijacking
 * 
 * Usage:
 * ```tsx
 * const contentRef = useRef<HTMLDivElement>(null);
 * useInternalLinkHijack(contentRef);
 * 
 * return <div ref={contentRef} dangerouslySetInnerHTML={{ __html: content }} />;
 * ```
 */
export function useInternalLinkHijack(containerRef?: React.RefObject<HTMLElement>) {
  const navigate = useNavigate();
  
  useEffect(() => {
    const root = containerRef?.current ?? document;
    
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest?.('a') as HTMLAnchorElement | null;
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href') || '';
      
      // Skip external links
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      
      // Skip if modified click (new tab, etc.)
      const mouseEvent = e as MouseEvent;
      const isModified = mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.altKey || mouseEvent.button !== 0;
      if (isModified || anchor.target === '_blank') {
        return;
      }
      
      // Internal link → hijack and use SPA navigation
      e.preventDefault();
      navigate(href);
    };
    
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, [navigate, containerRef]);
}
