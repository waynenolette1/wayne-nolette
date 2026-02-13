/**
 * Article layout inline script for reading progress, TOC, code copy buttons,
 * and reading progress persistence. Works with Astro View Transitions.
 *
 * This module exports only the inline script string used by ArticleLayout.astro.
 * The script runs in the browser and handles all article-specific interactivity.
 */

/**
 * Unified inline script for ArticleLayout.
 * Works with any content ID and includes core features:
 * reading progress, TOC, mobile TOC, code copy buttons.
 */
export const ARTICLE_LAYOUT_SCRIPT = `
(function() {
  // ========== Cleanup Registry ==========
  // Single registry for all cleanup tasks instead of tracking 7+ variables individually
  var cleanupTasks = [];
  var timeouts = [];

  function onCleanup(fn) { cleanupTasks.push(fn); }
  function trackTimeout(id) { timeouts.push(id); return id; }

  function addListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    onCleanup(function() { target.removeEventListener(event, handler, options); });
  }

  // ========== Content Element Discovery ==========
  function getContentElement() {
    return document.getElementById('article-content')
      || document.getElementById('post-content')
      || document.getElementById('study-content')
      || document.getElementById('adr-content');
  }

  // ========== Progress Bar ==========
  function updateProgressBar() {
    var progressBar = document.getElementById('reading-progress');
    if (!progressBar) return;

    var article = document.querySelector('article');
    if (!article) return;

    var scrollY = window.scrollY;
    var scrollableDistance = article.offsetHeight - window.innerHeight;
    var scrolledPastArticleTop = scrollY - article.offsetTop;
    var progress = scrollableDistance <= 0 ? 1 : Math.min(
      Math.max(scrolledPastArticleTop / scrollableDistance, 0),
      1
    );

    progressBar.style.transform = 'scaleX(' + progress + ')';
  }

  // ========== Table of Contents ==========
  var tocLinkMap = {};
  var mobileTocLinkMap = {};
  var activeDesktopLink = null;
  var activeMobileLink = null;

  function generateTOC() {
    var content = getContentElement();
    var tocNav = document.getElementById('toc-nav');
    var mobileTocNav = document.getElementById('mobile-toc-nav');
    var toc = document.getElementById('toc');
    var mobileTocToggle = document.getElementById('mobile-toc-toggle');

    if (!content || !tocNav) return;

    var headings = content.querySelectorAll('h2, h3');
    if (headings.length < 2) {
      if (toc) toc.style.display = 'none';
      if (mobileTocToggle) mobileTocToggle.style.display = 'none';
      return;
    }

    tocNav.innerHTML = '';
    if (mobileTocNav) mobileTocNav.innerHTML = '';
    tocLinkMap = {};
    mobileTocLinkMap = {};
    activeDesktopLink = null;
    activeMobileLink = null;

    function createTocLink(heading, isMobile) {
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.classList.add('toc-' + heading.tagName.toLowerCase());

      link.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.getElementById(heading.id);
        if (target) {
          var offset = 80;
          var elementPosition = target.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
          history.pushState(null, '', '#' + heading.id);
          if (isMobile) closeMobileToc();
        }
      });

      return link;
    }

    headings.forEach(function(heading, index) {
      if (!heading.id) {
        var baseId = 'heading-' + index;
        var uniqueId = baseId;
        var counter = 0;
        while (document.getElementById(uniqueId) && counter < 100) {
          counter++;
          uniqueId = baseId + '-' + counter;
        }
        heading.id = uniqueId;
      }
      var desktopLink = createTocLink(heading, false);
      var mobileLink = mobileTocNav ? createTocLink(heading, true) : null;
      tocNav.appendChild(desktopLink);
      if (mobileLink) mobileTocNav.appendChild(mobileLink);
      tocLinkMap[heading.id] = desktopLink;
      if (mobileLink) mobileTocLinkMap[heading.id] = mobileLink;
    });

    if (!('IntersectionObserver' in window)) {
      if (headings.length > 0) {
        var firstLink = tocLinkMap[headings[0].id];
        if (firstLink) firstLink.classList.add('active');
      }
      return;
    }

    var tocObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          if (activeDesktopLink) activeDesktopLink.classList.remove('active');
          if (activeMobileLink) activeMobileLink.classList.remove('active');
          var link = tocLinkMap[id];
          if (link) {
            link.classList.add('active');
            activeDesktopLink = link;
          }
          var mobileLink = mobileTocLinkMap[id];
          if (mobileLink) {
            mobileLink.classList.add('active');
            activeMobileLink = mobileLink;
          }
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

    headings.forEach(function(heading) { tocObserver.observe(heading); });
    onCleanup(function() { tocObserver.disconnect(); });
  }

  // ========== Mobile TOC ==========
  function initMobileToc() {
    var toggle = document.getElementById('mobile-toc-toggle');
    var panel = document.getElementById('mobile-toc-panel');
    var backdrop = document.getElementById('mobile-toc-backdrop');
    var closeBtn = document.getElementById('mobile-toc-close');

    if (!toggle || !panel || !backdrop) return;

    function openMobileToc() {
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      panel.classList.add('active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    addListener(toggle, 'click', openMobileToc);
    if (closeBtn) addListener(closeBtn, 'click', closeMobileToc);
    addListener(backdrop, 'click', closeMobileToc);

    addListener(document, 'keydown', function(e) {
      if (e.key === 'Escape' && panel.classList.contains('active')) {
        closeMobileToc();
      }
    });
  }

  function closeMobileToc() {
    var toggle = document.getElementById('mobile-toc-toggle');
    var panel = document.getElementById('mobile-toc-panel');
    var backdrop = document.getElementById('mobile-toc-backdrop');

    if (!toggle && !panel && !backdrop) return;

    if (toggle) toggle.classList.remove('active');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (panel) panel.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ========== Code Copy ==========
  function addCodeCopyButtons() {
    var content = getContentElement();
    var codeBlocks = content ? content.querySelectorAll('pre') : [];
    var copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    var checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    codeBlocks.forEach(function(pre) {
      if (pre.querySelector('.code-copy-btn')) return;

      var button = document.createElement('button');
      button.className = 'code-copy-btn';
      button.innerHTML = copyIcon + ' Copy';

      button.addEventListener('click', async function() {
        var code = pre.querySelector('code');
        if (code) {
          try {
            await navigator.clipboard.writeText(code.textContent || '');
            if (!document.body.contains(button)) return;
            button.classList.add('copied');
            button.innerHTML = checkIcon + ' Copied!';
            trackTimeout(setTimeout(function() {
              if (document.body.contains(button)) {
                button.classList.remove('copied');
                button.innerHTML = copyIcon + ' Copy';
              }
            }, 1000));
          } catch (e) {
            if (!document.body.contains(button)) return;
            button.innerHTML = copyIcon + ' Failed';
            trackTimeout(setTimeout(function() {
              if (document.body.contains(button)) {
                button.innerHTML = copyIcon + ' Copy';
              }
            }, 1000));
          }
        }
      });

      pre.appendChild(button);
    });
  }

  // ========== Share Buttons ==========
  function initShareButtons() {
    var nativeShareBtn = document.getElementById('native-share-btn');
    var copyLinkBtn = document.getElementById('copy-link-btn');

    if (nativeShareBtn) {
      if (navigator.share) {
        addListener(nativeShareBtn, 'click', async function() {
          try {
            var desc = document.querySelector('meta[name="description"]');
            await navigator.share({
              title: document.title,
              text: desc ? desc.getAttribute('content') || '' : '',
              url: window.location.href,
            });
          } catch (e) {
            // AbortError is expected when user cancels share dialog
          }
        });
      } else {
        nativeShareBtn.style.display = 'none';
      }
    }

    if (copyLinkBtn) {
      addListener(copyLinkBtn, 'click', async function() {
        try {
          await navigator.clipboard.writeText(window.location.href);
          var linkIcon = copyLinkBtn.querySelector('.link-icon');
          var checkIcon = copyLinkBtn.querySelector('.check-icon');
          var btnText = copyLinkBtn.querySelector('.btn-text');

          if (linkIcon && checkIcon && btnText) {
            linkIcon.style.display = 'none';
            checkIcon.style.display = 'block';
            btnText.textContent = 'Copied!';
            copyLinkBtn.classList.add('copied');

            trackTimeout(setTimeout(function() {
              if (document.body.contains(copyLinkBtn)) {
                linkIcon.style.display = 'block';
                checkIcon.style.display = 'none';
                btnText.textContent = 'Copy link';
                copyLinkBtn.classList.remove('copied');
              }
            }, 1000));
          }
        } catch (e) {
          // Clipboard may be blocked or unavailable
        }
      });
    }
  }

  // ========== Reading Progress Persistence ==========
  // ========== Keyboard Navigation ==========
  function initKeyboardNav() {
    var prevLink = document.querySelector('[data-nav="prev"]');
    var nextLink = document.querySelector('[data-nav="next"]');
    var navTimeout = null;

    addListener(document, 'keydown', function(e) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if ((e.key === 'j' || e.key === 'ArrowRight') && nextLink) {
        e.preventDefault();
        highlightNavLink(nextLink);
        if (navTimeout) clearTimeout(navTimeout);
        navTimeout = trackTimeout(setTimeout(function() {
          navTimeout = null;
          window.location.href = nextLink.href;
        }, 150));
      } else if ((e.key === 'k' || e.key === 'ArrowLeft') && prevLink) {
        e.preventDefault();
        highlightNavLink(prevLink);
        if (navTimeout) clearTimeout(navTimeout);
        navTimeout = trackTimeout(setTimeout(function() {
          navTimeout = null;
          window.location.href = prevLink.href;
        }, 150));
      }
    });
  }

  function highlightNavLink(link) {
    link.style.transform = 'scale(1.02)';
    link.style.borderColor = 'var(--color-accent)';
    link.style.boxShadow = '0 0 20px var(--color-accent-30)';
  }

  // ========== Cleanup ==========
  function cleanup() {
    cleanupTasks.forEach(function(fn) { fn(); });
    cleanupTasks = [];
    timeouts.forEach(function(t) { clearTimeout(t); });
    timeouts = [];
    document.body.style.overflow = '';
  }

  // ========== Initialize ==========
  function init() {
    cleanup();
    updateProgressBar();
    generateTOC();
    initMobileToc();
    addCodeCopyButtons();
    initShareButtons();
    initKeyboardNav();

    // Setup scroll/resize listeners
    addListener(window, 'scroll', updateProgressBar, { passive: true });
    addListener(window, 'resize', updateProgressBar, { passive: true });
  }

  init();

  // Reinitialize on View Transitions navigation
  var wasRegistered = window.__articleLayoutRegistered;
  window.__articleLayoutRegistered = true;
  if (!wasRegistered) {
    document.addEventListener('astro:after-swap', init);
    document.addEventListener('astro:before-swap', cleanup);
  }
})();
`;
