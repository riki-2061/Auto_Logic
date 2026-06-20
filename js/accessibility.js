
(function () {
    'use strict';
  
    var STORAGE_KEY = 'kra-a11y-preferences';
    var HTML_CLASS_PREFIX = 'kra-a11y-';
  
    var FEATURES = {
      'screen-reader': { label: 'קורא מסך', mutuallyExclusive: [] },
      'keyboard-nav': { label: 'ניווט מקלדת', mutuallyExclusive: [] },
      'readable-font': { label: 'גופן קריא', mutuallyExclusive: [] },
      'highlight-links': { label: 'הדגשת קישורים', mutuallyExclusive: [] },
      'line-focus': { label: 'מיקוד שורות', mutuallyExclusive: [] },
      'image-descriptions': { label: 'תיאור תמונות', mutuallyExclusive: [] },
      'dark-contrast': { label: 'ניגודיות כהה', mutuallyExclusive: ['light-contrast', 'line-focus'] },
      'light-contrast': { label: 'ניגודיות לבנה', mutuallyExclusive: ['dark-contrast', 'line-focus'] },
      'grayscale': { label: 'גווני אפור', mutuallyExclusive: [] },
      'stop-animations': { label: 'עצירת אנימציות', mutuallyExclusive: [] }
    };
  
    var defaultConfig = {
      statementUrl: '#',
      feedbackUrl: '',
      contactEmail: 'accessibility@example.com',
      mainContentSelector: 'main, #main, [role="main"], .main-content, #content',
      position: 'bottom-left',
      toggleButtonImage: '',
      showImageLabels: false,
      autoDescribeImages: true,
      autoDescribeImagesOnScreenReader: true,
      imageDescriptionSelector: 'img',
      imageDescriptionMaxImages: 40,
      imageDescriptionFallbackToPageTitle: true,
      imageDescriptionPageTitlePrefix: 'תמונה מאתר: ',
      imageDescriptionApiUrl: '',
      imageDescriptionApiToken: ''
    };
  
    var config = Object.assign(
      {},
      defaultConfig,
      window.KraAccessibilityConfig || window.RikiAccessibilityConfig || {}
    );
    if (!config.imageDescriptionApiUrl && window.location && window.location.origin) {
      config.imageDescriptionApiUrl = window.location.origin + '/wp-json/kra-a11y/v1/describe-image';
    }
  
    var state = loadState();
    var screenReaderCleanup = [];
    var animationObserver = null;
    var imageObserver = null;
    var imageDescriptionRunning = false;
    var imageDescriptionScheduled = null;
    var lineFocusOverlay = null;
    var lineFocusHandler = null;
    var LINE_FOCUS_HEIGHT = 44;
  
    /* ── Icons (inline SVG – no aria-hidden, avoids screen-reader CSS conflicts) ── */
    var iconPaths = {
      close: 'M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z',
      screenReader: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
      keyboard: 'M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
      font: 'M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.19l-1.12 3H5.96L11 4h2l5.05 14.5h-2.05z',
      links: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
      dark: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
      light: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a1 1 0 0 0-1.41 0 1 1 0 0 0 0 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41L5.99 4.58zm12.37 12.37a1 1 0 0 0-1.41 0 1 1 0 0 0 0 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41l-1.06-1.06zm1.06-10.96a1 1 0 0 0 0-1.41 1 1 0 0 0-1.41 0l-1.06 1.06a1 1 0 1 0 1.41 1.41l1.06-1.06zM7.05 18.36a1 1 0 0 0 0-1.41 1 1 0 0 0-1.41 0l-1.06 1.06a1 1 0 0 0 1.41 1.41l1.06-1.06z',
      grayscale: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8v16z',
      stopAnim: 'M6 6h12v12H6z',
      lineFocus: 'M4 6h16v1.5H4V6zm0 5.25h16V12.5H4v-1.25zm0 5.25h16V18H4v-1.5z',
      imageDesc: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'
    };
  
    function getIcon(name) {
      var d = iconPaths[name];
      if (!d) return '';
      return (
        '<svg class="kra-a11y-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false">' +
        '<path d="' + d + '"/>' +
        '</svg>'
      );
    }
  
    /* סמל נגישות – האייקון המקורי */
    var BRAND_ICON_PATHS = [
      {
        d: 'M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 6h2l1.2 4.5 2.3-2.3 1.4 1.4-3.5 3.5V20h-2v-5.9L9.1 10.6l1.4-1.4 2.3 2.3L11 8z',
        fill: '#ffffff',
        className: 'kra-a11y-brand-figure'
      }
    ];
  
    function createBrandIcon(size) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'kra-a11y-brand-icon');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('fill', 'none');
      svg.setAttribute('focusable', 'false');
  
      BRAND_ICON_PATHS.forEach(function (item) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', item.className || 'kra-a11y-brand-figure');
        path.setAttribute('fill', item.fill);
        path.setAttribute('d', item.d);
        svg.appendChild(path);
      });
      return svg;
    }
  
    function appendToggleButtonContent(toggleEl) {
      var imageUrl = (config.toggleButtonImage || '').trim();
      var hasCustomImage = !!imageUrl && !/your-domain\.com/i.test(imageUrl);
  
      if (hasCustomImage) {
        var img = document.createElement('img');
        img.className = 'kra-a11y-toggle-image';
        img.src = imageUrl;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
  
        img.addEventListener('error', function () {
          if (img.parentNode === toggleEl) {
            toggleEl.removeChild(img);
          }
          if (!toggleEl.querySelector('.kra-a11y-brand-icon')) {
            toggleEl.appendChild(createBrandIcon(30));
          }
        });
  
        toggleEl.appendChild(img);
        return;
      }
      toggleEl.appendChild(createBrandIcon(30));
    }
  
    /* ── State persistence ── */
    function loadState() {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
  
    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) { /* silent */ }
    }
  
    function isActive(feature) {
      return !!state[feature];
    }
  
    function setActive(feature, active) {
      if (active) {
        var meta = FEATURES[feature];
        if (meta && meta.mutuallyExclusive) {
          meta.mutuallyExclusive.forEach(function (other) {
            if (state[other]) {
              delete state[other];
              disableFeature(other);
            }
          });
        }
        state[feature] = true;
        enableFeature(feature);
      } else {
        delete state[feature];
        disableFeature(feature);
      }
      saveState();
      updateButtonStates();
    }
  
    /* ── Feature implementations ── */
    function enableFeature(feature) {
      document.documentElement.classList.add(HTML_CLASS_PREFIX + feature);
      switch (feature) {
        case 'screen-reader':
          applyScreenReaderEnhancements();
          applyScreenReaderJqueryFixes();
          if (config.autoDescribeImagesOnScreenReader !== false) {
            scheduleImageDescriptionAgent(150);
          }
          watchNewImages();
          break;
        case 'stop-animations':
          pauseAllMedia();
          watchNewMedia();
          break;
        case 'line-focus':
          enableLineFocus();
          break;
        case 'image-descriptions':
          scheduleImageDescriptionAgent(150);
          watchNewImages();
          break;
      }
    }
  
    function disableFeature(feature) {
      document.documentElement.classList.remove(HTML_CLASS_PREFIX + feature);
      switch (feature) {
        case 'screen-reader':
          revertScreenReaderEnhancements();
          revertScreenReaderJqueryFixes();
          maybeStopWatchingImages();
          break;
        case 'stop-animations':
          unpauseAllMedia();
          stopWatchingMedia();
          break;
        case 'line-focus':
          disableLineFocus();
          break;
        case 'image-descriptions':
          maybeStopWatchingImages();
          break;
      }
    }
  
    function applyAllSavedFeatures() {
      Object.keys(state).forEach(function (feature) {
        if (state[feature]) {
          enableFeature(feature);
        }
      });
    }
  
    function resetAll() {
      Object.keys(state).forEach(function (feature) {
        disableFeature(feature);
      });
      state = {};
      saveState();
      updateButtonStates();
    }
  
    /* ── Skip to main content ── */
    function injectSkipLink() {
      if (document.querySelector('.kra-a11y-skip-link')) return;
  
      var link = document.createElement('a');
      link.className = 'kra-a11y-skip-link';
      link.href = '#kra-a11y-main-content';
      link.textContent = 'דלג לתוכן המרכזי';
  
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var target = findMainContent();
        if (target) {
          if (!target.id) {
            target.id = 'kra-a11y-main-content';
          }
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: false });
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
  
      document.body.insertBefore(link, document.body.firstChild);
    }
  
    function findMainContent() {
      var selectors = config.mainContentSelector.split(',');
      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i].trim());
        if (el) return el;
      }
      return document.querySelector('article') || document.querySelector('#content') || null;
    }
  
    /* ── Screen reader mode ── */
    function applyScreenReaderEnhancements() {
      enhanceInteractiveElements();
      enhanceImages();
      enhanceIcons();
      hideDecorativeElements();
      enhanceLandmarks();
      enforcePrimaryHeadingForScreenReader();
    }
  
    function enhanceInteractiveElements() {
      var buttons = document.querySelectorAll('button:not(.kra-a11y-widget button)');
      buttons.forEach(function (btn) {
        if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
          btn.setAttribute('aria-label', 'כפתור');
          screenReaderCleanup.push(function () { btn.removeAttribute('aria-label'); });
        }
      });
  
      var inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not(.kra-a11y-widget input)');
      inputs.forEach(function (input) {
        var placeholder = input.getAttribute('placeholder');
        var type = input.getAttribute('type') || 'text';
        var label = placeholder || ('שדה ' + type);
        input.setAttribute('aria-label', label);
        screenReaderCleanup.push(function () { input.removeAttribute('aria-label'); });
      });
  
      var navs = document.querySelectorAll('nav:not([role]):not(.kra-a11y-widget nav)');
      navs.forEach(function (nav, idx) {
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'ניווט ' + (idx + 1));
        screenReaderCleanup.push(function () {
          nav.removeAttribute('role');
          nav.removeAttribute('aria-label');
        });
      });
  
      enhanceGalleryNavigationButtons();
    }
  
    function applyScreenReaderJqueryFixes() {
      if (!window.jQuery) return;
      var $ = window.jQuery;
  
      window.jQuery('.fix_smartphone_href').attr({
        role: 'presentation',
        tabindex: '-1'
      });
      window.jQuery('img[src="https://hakolbeseder.co.il/wp-content/uploads/2023/05/3.png"]').attr('alt', 'לוגו הכל בסדר');
  
      $('.elementor-form').each(function () {
        var $form = $(this);
        if ($form.attr('aria-label')) return;
  
        var formName = ($form.attr('name') || '').toLowerCase();
        var label = inferFormAriaLabelByName(formName);
        $form.attr('aria-label', label);
        $form.attr('data-kra-added-form-label', '1');
      });
    }
  
    function revertScreenReaderJqueryFixes() {
      if (!window.jQuery) return;
      window.jQuery('.fix_smartphone_href').removeAttr('role tabindex');
      window.jQuery('.elementor-form[data-kra-added-form-label="1"]').each(function () {
        window.jQuery(this).removeAttr('aria-label data-kra-added-form-label');
      });
    }
  
    function inferFormAriaLabelByName(formName) {
      if (!formName) return 'טופס';
      if (formName.indexOf('new-form') !== -1) return 'טופס צור קשר';
      if (formName.indexOf('contact') !== -1 || formName.indexOf('lead') !== -1) return 'טופס צור קשר';
      if (formName.indexOf('newsletter') !== -1 || formName.indexOf('subscribe') !== -1) return 'טופס הרשמה לניוזלטר';
      if (formName.indexOf('quote') !== -1 || formName.indexOf('price') !== -1) return 'טופס בקשת הצעת מחיר';
      if (formName.indexOf('service') !== -1) return 'טופס פנייה לשירות';
      return 'טופס';
    }
  
    function enhanceGalleryNavigationButtons() {
      var nextSelector = [
        '.swiper-button-next',
        '.slick-next',
        '.owl-next',
        '.elementor-swiper-button-next',
        '[class*="next"]'
      ].join(',');
      var prevSelector = [
        '.swiper-button-prev',
        '.slick-prev',
        '.owl-prev',
        '.elementor-swiper-button-prev',
        '[class*="prev"]',
        '[class*="previous"]'
      ].join(',');
  
      var nextButtons = document.querySelectorAll(
        'button' + nextSelector +
        ', a' + nextSelector +
        ', [role="button"]' + nextSelector
      );
      nextButtons.forEach(function (el) {
        if (el.closest('.kra-a11y-widget')) return;
        if (!isGalleryControlElement(el)) return;
        if (el.getAttribute('aria-label')) return;
        el.setAttribute('aria-label', 'הבא');
        screenReaderCleanup.push(function () { el.removeAttribute('aria-label'); });
      });
  
      var prevButtons = document.querySelectorAll(
        'button' + prevSelector +
        ', a' + prevSelector +
        ', [role="button"]' + prevSelector
      );
      prevButtons.forEach(function (el) {
        if (el.closest('.kra-a11y-widget')) return;
        if (!isGalleryControlElement(el)) return;
        if (el.getAttribute('aria-label')) return;
        el.setAttribute('aria-label', 'הקודם');
        screenReaderCleanup.push(function () { el.removeAttribute('aria-label'); });
      });
    }
  
    function isGalleryControlElement(el) {
      return !!el.closest(
        '.swiper, .swiper-container, .slick-slider, .owl-carousel, .elementor-image-carousel, .gallery, [class*="gallery"]'
      );
    }
  
    function isUnreliableImageSrc(img) {
      var src = (img.getAttribute('src') || img.currentSrc || '').toLowerCase();
      return /picsum\.photos|placeholder\.com|via\.placeholder|placehold\.it|dummyimage|loremflickr|placekitten/i.test(src);
    }
  
    function getReliableImageFallback(img) {
      var title = img.getAttribute('title');
      if (title && title.trim()) return title.trim();
  
      var labelledBy = img.getAttribute('aria-labelledby');
      if (labelledBy) {
        var labelText = '';
        labelledBy.split(/\s+/).forEach(function (id) {
          if (labelText) return;
          var el = document.getElementById(id);
          if (el && el.textContent.trim()) labelText = el.textContent.trim();
        });
        if (labelText) return labelText;
      }
  
      var figure = img.closest('figure');
      if (figure) {
        var caption = figure.querySelector('figcaption');
        if (caption && caption.textContent.trim()) return caption.textContent.trim();
      }
  
      var link = img.closest('a[title], a[aria-label]');
      if (link) {
        var linkLabel = link.getAttribute('aria-label') || link.getAttribute('title');
        if (linkLabel && linkLabel.trim()) return linkLabel.trim();
      }
  
      return '';
    }
  
    function addImageDescriptionLabel(img, text, type) {
      if (!config.showImageLabels) return;
      if (!text) return;
      var next = img.nextElementSibling;
      if (next && next.classList && next.classList.contains('kra-a11y-alt-label')) {
        next.textContent = text;
        next.className = 'kra-a11y-alt-label kra-a11y-alt-label--' + type;
        return;
      }
      var label = document.createElement('span');
      label.className = 'kra-a11y-alt-label kra-a11y-alt-label--' + type;
      label.textContent = text;
      img.parentNode.insertBefore(label, img.nextSibling);
      screenReaderCleanup.push(function () {
        if (label.parentNode) label.parentNode.removeChild(label);
      });
    }
  
    function markMissingImageAlt(img) {
      var missingAlt = img.getAttribute('alt') === null;
      var message = missingAlt
        ? 'חסר תיאור תמונה – יש להוסיף תגית alt מדויקת בקוד האתר'
        : 'חסר תיאור תמונה – תגית alt ריקה, יש להוסיף תיאור מדויק בקוד האתר';
      addImageDescriptionLabel(img, message, 'missing');
      img.classList.add('kra-a11y-img-missing-alt');
      screenReaderCleanup.push(function () { img.classList.remove('kra-a11y-img-missing-alt'); });
    }
  
    function enhanceImages() {
      var images = document.querySelectorAll('img:not(.kra-a11y-widget img):not([data-kra-a11y-img-done])');
      images.forEach(function (img) {
        img.setAttribute('data-kra-a11y-img-done', '1');
        screenReaderCleanup.push(function () { img.removeAttribute('data-kra-a11y-img-done'); });
      });
    }
  
    function trackAttrRestore(el, attr, originalValue) {
      screenReaderCleanup.push(function () {
        if (originalValue === null) el.removeAttribute(attr);
        else el.setAttribute(attr, originalValue);
      });
    }
  
    function inferIconLabel(el) {
      var ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
      return '';
    }
  
    function enhanceElementLabel(el, label) {
      if (!label) return;
      if (el.hasAttribute('data-kra-a11y-icon-done')) return;
      el.setAttribute('data-kra-a11y-icon-done', '1');
      screenReaderCleanup.push(function () { el.removeAttribute('data-kra-a11y-icon-done'); });
  
      if (!el.getAttribute('aria-label')) {
        var original = null;
        el.setAttribute('aria-label', label);
        trackAttrRestore(el, 'aria-label', original);
      }
    }
  
    function enhanceIcons() {
      document.querySelectorAll('svg:not(.kra-a11y-widget svg):not([data-kra-a11y-icon-done])').forEach(function (svg) {
        if (svg.closest('.kra-a11y-widget')) return;
        if (svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby')) return;
        if (svg.querySelector('title')) return;
  
        var interactive = svg.closest('button, a, [role="button"], [role="link"]');
        if (interactive) {
          if (interactive.closest('.kra-a11y-widget')) return;
          if (interactive.getAttribute('aria-label') || interactive.textContent.trim()) return;
          enhanceElementLabel(interactive, inferIconLabel(interactive));
          return;
        }
  
        svg.setAttribute('data-kra-a11y-icon-done', '1');
        screenReaderCleanup.push(function () { svg.removeAttribute('data-kra-a11y-icon-done'); });
        if (!svg.getAttribute('role')) {
          svg.setAttribute('role', 'img');
          trackAttrRestore(svg, 'role', null);
        }
        var iconLabel = inferIconLabel(svg);
        svg.setAttribute('aria-label', iconLabel);
        trackAttrRestore(svg, 'aria-label', null);
      });
  
      document.querySelectorAll(
        'button:not(.kra-a11y-widget button):not([data-kra-a11y-icon-done]),' +
        'a:not(.kra-a11y-widget a):not([data-kra-a11y-icon-done])'
      ).forEach(function (el) {
        if (el.closest('.kra-a11y-widget')) return;
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
        if (el.textContent.trim()) return;
        var hasIcon = el.querySelector('svg, img, i, [class*="icon"], [class*="fa-"]');
        if (hasIcon) enhanceElementLabel(el, inferIconLabel(el));
      });
    }
  
    function hideDecorativeElements() {
      var decorative = document.querySelectorAll(
        '.decorative, .icon-only, [data-decorative="true"]'
      );
      decorative.forEach(function (el) {
        if (el.closest('.kra-a11y-widget')) return;
        el.classList.add('kra-a11y-decorative-hidden');
        screenReaderCleanup.push(function () { el.classList.remove('kra-a11y-decorative-hidden'); });
      });
    }
  
    function enhanceLandmarks() {
      var main = findMainContent();
      if (main && !main.getAttribute('role')) {
        main.setAttribute('role', 'main');
        screenReaderCleanup.push(function () { main.removeAttribute('role'); });
      }
  
      var headers = document.querySelectorAll('header:not(.kra-a11y-widget header):not([role])');
      headers.forEach(function (header) {
        header.setAttribute('role', 'banner');
        screenReaderCleanup.push(function () { header.removeAttribute('role'); });
      });
  
      var footers = document.querySelectorAll('footer:not(.kra-a11y-widget footer):not([role])');
      footers.forEach(function (footer) {
        footer.setAttribute('role', 'contentinfo');
        screenReaderCleanup.push(function () { footer.removeAttribute('role'); });
      });
    }
  
    function enforcePrimaryHeadingForScreenReader() {
      var main = findMainContent() || document.body;
      var allH1 = Array.prototype.slice.call(document.querySelectorAll('h1'));
      var primaryH1 = allH1.length ? allH1[0] : null;
  
      if (!primaryH1) {
        primaryH1 = document.createElement('h1');
        primaryH1.textContent = normalizeDescription(document.title) || 'כותרת ראשית';
        primaryH1.setAttribute('data-kra-generated-h1', '1');
        main.insertBefore(primaryH1, main.firstChild || null);
        screenReaderCleanup.push(function () {
          if (primaryH1 && primaryH1.parentNode) {
            primaryH1.parentNode.removeChild(primaryH1);
          }
        });
      }
  
      moveElementToMainStart(primaryH1, main);
      enforcePrimaryHeadingAttributes(primaryH1);
      downgradeExtraH1Headings(primaryH1);
    }
  
    function moveElementToMainStart(el, main) {
      if (!el || !main) return;
      if (el.parentNode === main && main.firstChild === el) return;
  
      var originalParent = el.parentNode;
      var originalNextSibling = el.nextSibling;
      main.insertBefore(el, main.firstChild || null);
  
      screenReaderCleanup.push(function () {
        if (!el || !originalParent) return;
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
          originalParent.insertBefore(el, originalNextSibling);
        } else {
          originalParent.appendChild(el);
        }
      });
    }
  
    function enforcePrimaryHeadingAttributes(primaryH1) {
      if (!primaryH1) return;
  
      var originalRole = primaryH1.getAttribute('role');
      var originalAriaLevel = primaryH1.getAttribute('aria-level');
      var originalStyle = primaryH1.getAttribute('style');
  
      primaryH1.setAttribute('role', 'heading');
      primaryH1.setAttribute('aria-level', '1');
      primaryH1.style.setProperty('font-size', '64px', 'important');
  
      screenReaderCleanup.push(function () {
        if (!primaryH1) return;
        if (originalRole === null) primaryH1.removeAttribute('role');
        else primaryH1.setAttribute('role', originalRole);
  
        if (originalAriaLevel === null) primaryH1.removeAttribute('aria-level');
        else primaryH1.setAttribute('aria-level', originalAriaLevel);
  
        if (originalStyle === null) primaryH1.removeAttribute('style');
        else primaryH1.setAttribute('style', originalStyle);
      });
    }
  
    function downgradeExtraH1Headings(primaryH1) {
      Array.prototype.slice.call(document.querySelectorAll('h1')).forEach(function (h1) {
        if (h1 === primaryH1) return;
  
        var originalRole = h1.getAttribute('role');
        var originalAriaLevel = h1.getAttribute('aria-level');
        h1.setAttribute('role', 'heading');
        h1.setAttribute('aria-level', '2');
  
        screenReaderCleanup.push(function () {
          if (originalRole === null) h1.removeAttribute('role');
          else h1.setAttribute('role', originalRole);
  
          if (originalAriaLevel === null) h1.removeAttribute('aria-level');
          else h1.setAttribute('aria-level', originalAriaLevel);
        });
      });
    }
  
    function revertScreenReaderEnhancements() {
      screenReaderCleanup.forEach(function (fn) { fn(); });
      screenReaderCleanup = [];
    }
  
    function watchNewImages() {
      if (imageObserver) return;
      imageObserver = new MutationObserver(function () {
        if (isActive('screen-reader')) {
          enhanceInteractiveElements();
          applyScreenReaderJqueryFixes();
          enhanceImages();
          enhanceIcons();
          enforcePrimaryHeadingForScreenReader();
        }
        if (shouldRunImageDescriptionNow()) {
          scheduleImageDescriptionAgent(350);
        }
      });
      imageObserver.observe(document.body, { childList: true, subtree: true });
    }
  
    function stopWatchingImages() {
      if (imageObserver) {
        imageObserver.disconnect();
        imageObserver = null;
      }
    }
  
    function maybeStopWatchingImages() {
      if (!isActive('screen-reader') && !isActive('image-descriptions')) {
        stopWatchingImages();
      }
    }
  
    function enableLineFocus() {
      if (lineFocusOverlay) return;
  
      lineFocusOverlay = document.createElement('div');
      lineFocusOverlay.className = 'kra-a11y-line-focus-overlay';
      lineFocusOverlay.setAttribute('aria-hidden', 'true');
  
      var band = document.createElement('div');
      band.className = 'kra-a11y-line-focus-band';
      band.style.height = LINE_FOCUS_HEIGHT + 'px';
      lineFocusOverlay.appendChild(band);
      document.body.appendChild(lineFocusOverlay);
  
      lineFocusHandler = function (e) {
        var y = e.clientY;
        if (typeof y !== 'number' && e.touches && e.touches[0]) {
          y = e.touches[0].clientY;
        }
        if (typeof y !== 'number') return;
        band.style.transform = 'translateY(' + (y - LINE_FOCUS_HEIGHT / 2) + 'px)';
      };
  
      document.addEventListener('mousemove', lineFocusHandler, { passive: true });
      document.addEventListener('touchmove', lineFocusHandler, { passive: true });
    }
  
    function disableLineFocus() {
      if (lineFocusHandler) {
        document.removeEventListener('mousemove', lineFocusHandler);
        document.removeEventListener('touchmove', lineFocusHandler);
        lineFocusHandler = null;
      }
      if (lineFocusOverlay && lineFocusOverlay.parentNode) {
        lineFocusOverlay.parentNode.removeChild(lineFocusOverlay);
      }
      lineFocusOverlay = null;
    }
  
    /* ── Stop animations / media ── */
    function pauseAllMedia() {
      document.querySelectorAll('video, audio').forEach(function (media) {
        if (!media.dataset.kraWasPlaying) {
          media.dataset.kraWasPlaying = media.paused ? '0' : '1';
        }
        media.pause();
      });
  
      document.querySelectorAll('iframe').forEach(function (iframe) {
        try {
          var src = iframe.src || '';
          if (/youtube|vimeo|autoplay/i.test(src) && !iframe.dataset.kraOriginalSrc) {
            iframe.dataset.kraOriginalSrc = src;
            iframe.src = src.replace(/autoplay=1/i, 'autoplay=0');
          }
        } catch (e) { /* cross-origin */ }
      });
    }
  
    function unpauseAllMedia() {
      document.querySelectorAll('video, audio').forEach(function (media) {
        if (media.dataset.kraWasPlaying === '1') {
          media.play().catch(function () { /* autoplay blocked */ });
        }
        delete media.dataset.kraWasPlaying;
      });
  
      document.querySelectorAll('iframe[data-kra-original-src]').forEach(function (iframe) {
        iframe.src = iframe.dataset.kraOriginalSrc;
        delete iframe.dataset.kraOriginalSrc;
      });
    }
  
    function watchNewMedia() {
      if (animationObserver) return;
      animationObserver = new MutationObserver(function () {
        if (isActive('stop-animations')) {
          pauseAllMedia();
        }
      });
      animationObserver.observe(document.body, { childList: true, subtree: true });
    }
  
    function stopWatchingMedia() {
      if (animationObserver) {
        animationObserver.disconnect();
        animationObserver = null;
      }
    }
  
    /* ── UI construction ── */
    function createFeatureButton(id, iconKey) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kra-a11y-btn';
      btn.dataset.feature = id;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML =
        '<span class="kra-a11y-btn-icon">' + getIcon(iconKey) + '</span>' +
        '<span>' + FEATURES[id].label + '</span>';
      btn.addEventListener('click', function () {
        toggleFeature(id);
      });
      return btn;
    }
  
    function toggleFeature(id) {
      setActive(id, !isActive(id));
    }
  
    function updateButtonStates() {
      document.querySelectorAll('.kra-a11y-btn[data-feature]').forEach(function (btn) {
        var feature = btn.dataset.feature;
        var active = isActive(feature);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
  
    function getFeedbackHref() {
      if (config.feedbackUrl) return config.feedbackUrl;
      return 'mailto:' + config.contactEmail + '?subject=' + encodeURIComponent('משוב נגישות');
    }
  
    function buildWidget() {
      var widget = document.createElement('div');
      widget.className = 'kra-a11y-widget';
      widget.setAttribute('role', 'region');
      widget.setAttribute('aria-label', 'תפריט נגישות');
  
      if (config.position === 'bottom-right') {
        widget.style.left = 'auto';
        widget.style.right = '24px';
      }
  
      var panel = document.createElement('div');
      panel.className = 'kra-a11y-panel';
      panel.id = 'kra-a11y-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'kra-a11y-title');
      panel.setAttribute('aria-hidden', 'true');
  
      panel.innerHTML =
        '<div class="kra-a11y-header">' +
          '<h2 class="kra-a11y-header-title" id="kra-a11y-title">' +
            '<span>התאמות נגישות</span>' +
          '</h2>' +
          '<button type="button" class="kra-a11y-close" aria-label="סגור תפריט נגישות">' +
            getIcon('close') +
          '</button>' +
        '</div>' +
        '<div class="kra-a11y-body">' +
          '<div class="kra-a11y-section">' +
            '<h3 class="kra-a11y-section-title">התאמות גלישה</h3>' +
            '<div class="kra-a11y-grid" id="kra-a11y-section-browse"></div>' +
          '</div>' +
          '<div class="kra-a11y-section">' +
            '<h3 class="kra-a11y-section-title">צבע ותנועה</h3>' +
            '<div class="kra-a11y-grid" id="kra-a11y-section-visual"></div>' +
          '</div>' +
        '</div>' +
        '<div class="kra-a11y-action-row">' +
          '<button type="button" class="kra-a11y-action-btn kra-a11y-reset-btn" id="kra-a11y-reset">' +
            'איפוס התאמות' +
          '</button>' +
        '</div>' +
        '<div class="kra-a11y-footer">' +
          '<div class="kra-a11y-footer-links">' +
            '<a class="kra-a11y-footer-link" id="kra-a11y-statement" href="' + escapeAttr(config.statementUrl) + '">' +
              'הצהרת נגישות' +
            '</a>' +
            '<span class="kra-a11y-footer-separator" role="presentation">|</span>' +
            '<a class="kra-a11y-footer-link" id="kra-a11y-feedback" href="' + escapeAttr(getFeedbackHref()) + '">' +
              ' דיווח על בעיית נגישות' +
            '</a>' +
          '</div>' +
        '</div>';
  
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'kra-a11y-toggle';
      toggle.setAttribute('aria-label', 'פתח תפריט נגישות');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'kra-a11y-panel');
      appendToggleButtonContent(toggle);
  
      widget.appendChild(panel);
      widget.appendChild(toggle);
      document.body.appendChild(widget);
  
      var browseGrid = panel.querySelector('#kra-a11y-section-browse');
      browseGrid.appendChild(createFeatureButton('keyboard-nav', 'keyboard'));
      browseGrid.appendChild(createFeatureButton('screen-reader', 'screenReader'));
      browseGrid.appendChild(createFeatureButton('readable-font', 'font'));
      browseGrid.appendChild(createFeatureButton('highlight-links', 'links'));
      browseGrid.appendChild(createFeatureButton('line-focus', 'lineFocus'));
      browseGrid.appendChild(createFeatureButton('image-descriptions', 'imageDesc'));
  
      var visualGrid = panel.querySelector('#kra-a11y-section-visual');
      visualGrid.appendChild(createFeatureButton('dark-contrast', 'dark'));
      visualGrid.appendChild(createFeatureButton('light-contrast', 'light'));
      visualGrid.appendChild(createFeatureButton('grayscale', 'grayscale'));
      visualGrid.appendChild(createFeatureButton('stop-animations', 'stopAnim'));
  
      var closeBtn = panel.querySelector('.kra-a11y-close');
      var resetBtn = panel.querySelector('#kra-a11y-reset');
  
      toggle.addEventListener('click', function () {
        var open = !panel.classList.contains('is-open');
        setPanelOpen(open);
      });
  
      closeBtn.addEventListener('click', function () {
        setPanelOpen(false);
        toggle.focus();
      });
  
      resetBtn.addEventListener('click', function () {
        resetAll();
      });
  
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel.classList.contains('is-open')) {
          setPanelOpen(false);
          toggle.focus();
        }
      });
  
      document.addEventListener('click', function (e) {
        if (panel.classList.contains('is-open') && !widget.contains(e.target)) {
          setPanelOpen(false);
        }
      });
  
      function setPanelOpen(open) {
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'סגור תפריט נגישות' : 'פתח תפריט נגישות');
        if (open) {
          var firstBtn = panel.querySelector('.kra-a11y-btn');
          if (firstBtn) firstBtn.focus();
        }
      }
  
      updateButtonStates();
    }
  
    function scheduleImageDescriptionAgent(delayMs) {
      if (!shouldRunImageDescriptionNow()) return;
      if (imageDescriptionScheduled) {
        clearTimeout(imageDescriptionScheduled);
      }
      imageDescriptionScheduled = setTimeout(function () {
        imageDescriptionScheduled = null;
        runImageDescriptionAgent();
      }, Math.max(0, delayMs || 0));
    }
  
    function runImageDescriptionAgent() {
      if (!shouldRunImageDescriptionNow() || imageDescriptionRunning) return;
      imageDescriptionRunning = true;
  
      var selector = config.imageDescriptionSelector || 'img';
      var maxImages = Math.max(1, Number(config.imageDescriptionMaxImages) || 40);
      var allImages = Array.prototype.slice.call(document.querySelectorAll(selector));
      var targets = [];
  
      allImages.forEach(function (img) {
        if (targets.length >= maxImages) return;
        if (!shouldDescribeImage(img)) return;
        targets.push(img);
      });
  
      processImagesSequentially(targets, 0).then(function () {
        imageDescriptionRunning = false;
      }).catch(function () {
        imageDescriptionRunning = false;
      });
    }
  
    function shouldDescribeImage(img) {
      if (!img || !img.getAttribute) return false;
      if (img.closest('.kra-a11y-widget')) return false;
      if (img.hasAttribute('data-kra-ai-alt-done')) return false;
  
      var alt = img.getAttribute('alt');
      var missingAlt = alt === null || alt.trim() === '';
      if (!missingAlt) return false;
  
      var src = (img.currentSrc || img.getAttribute('src') || '').trim();
      if (!src) return false;
      return true;
    }
  
    function shouldRunImageDescriptionNow() {
      if (!config.autoDescribeImages) return false;
      if (isActive('image-descriptions')) return true;
      if (config.autoDescribeImagesOnScreenReader === false) return true;
      return isActive('screen-reader');
    }
  
    function processImagesSequentially(images, index) {
      if (index >= images.length) return Promise.resolve();
      var img = images[index];
      return describeImageWithFallback(img).then(function () {
        return processImagesSequentially(images, index + 1);
      });
    }
  
    function describeImageWithFallback(img) {
      return requestImageDescription(img).then(function (description) {
        var finalDescription = normalizeDescription(description);
        if (!finalDescription && config.imageDescriptionFallbackToPageTitle !== false) {
          var title = normalizeDescription(document.title);
          if (title) {
            finalDescription = (config.imageDescriptionPageTitlePrefix || '') + title;
          }
        }
        if (finalDescription) {
          img.setAttribute('alt', finalDescription);
        }
        img.setAttribute('data-kra-ai-alt-done', '1');
      }).catch(function () {
        if (config.imageDescriptionFallbackToPageTitle !== false) {
          var title = normalizeDescription(document.title);
          if (title) {
            img.setAttribute('alt', (config.imageDescriptionPageTitlePrefix || '') + title);
          }
        }
        img.setAttribute('data-kra-ai-alt-done', '1');
      });
    }
  
    function requestImageDescription(img) {
      var imageUrl = (img.currentSrc || img.getAttribute('src') || '').trim();
      if (!imageUrl) return Promise.resolve('');
  
      var payload = {
        imageUrl: imageUrl,
        pageUrl: window.location.href,
        pageTitle: document.title || '',
        contextText: getImageContextText(img)
      };
  
      if (typeof config.imageDescriptionProvider === 'function') {
        try {
          return Promise.resolve(config.imageDescriptionProvider(payload));
        } catch (e) {
          return Promise.resolve('');
        }
      }
  
      if (!config.imageDescriptionApiUrl || !window.fetch) {
        return Promise.resolve('');
      }
  
      var headers = { 'Content-Type': 'application/json' };
      if (config.imageDescriptionApiToken) {
        headers.Authorization = 'Bearer ' + config.imageDescriptionApiToken;
      }
  
      return fetch(config.imageDescriptionApiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) return '';
        return res.json().then(function (json) {
          if (!json) return '';
          return json.description || json.alt || json.text || '';
        }).catch(function () {
          return '';
        });
      }).catch(function () {
        return '';
      });
    }
  
    function getImageContextText(img) {
      var chunks = [];
      var figure = img.closest('figure');
      if (figure) {
        var caption = figure.querySelector('figcaption');
        if (caption && caption.textContent) chunks.push(caption.textContent);
      }
  
      var container = img.closest('section, article, .elementor-widget, .elementor-column, .gallery-item, li, div');
      if (container && container.textContent) {
        chunks.push(container.textContent);
      }
  
      return normalizeDescription(chunks.join(' ').replace(/\s+/g, ' ')).slice(0, 600);
    }
  
    function normalizeDescription(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .slice(0, 180);
    }
  
    function escapeAttr(str) {
      return String(str)
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/</g, '<')
        .replace(/>/g, '>');
    }
  
    /* ── Load readable fonts ── */
    function loadFonts() {
      if (document.querySelector('#kra-a11y-fonts')) return;
      var link = document.createElement('link');
      link.id = 'kra-a11y-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Rubik:wght@400;600;700&display=swap';
      document.head.appendChild(link);
    }
  
    /* ── Init ── */
    function init() {
      loadFonts();
      injectSkipLink();
      buildWidget();
      applyAllSavedFeatures();
      if (config.autoDescribeImagesOnScreenReader === false) {
        scheduleImageDescriptionAgent(600);
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    window.KraAccessibility = {
      toggle: toggleFeature,
      reset: resetAll,
      isActive: isActive,
      describeImages: function () { scheduleImageDescriptionAgent(0); },
      getConfig: function () { return Object.assign({}, config); }
    };
    window.RikiAccessibility = window.KraAccessibility;
  })();
  
  