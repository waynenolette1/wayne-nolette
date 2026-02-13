/**
 * Global type declarations for the application.
 * Extends Window interface with third-party integrations.
 */

declare global {
  interface Window {
    /**
     * Plausible Analytics tracking function.
     * Available when Plausible script is loaded.
     */
    plausible?: (
      eventName: string,
      options?: { props: Record<string, string | number> }
    ) => void;

    /**
     * Guard to prevent search keyboard shortcut listener from stacking
     * on View Transitions.
     */
    __searchKeydownRegistered?: boolean;

    /**
     * Guard to prevent mobile menu before-swap cleanup listener from stacking.
     */
    __mobileMenuBeforeSwapRegistered?: boolean;

    /**
     * Guard to prevent mobile nav bypass listener from stacking.
     */
    __mobileNavBypassRegistered?: boolean;

    /**
     * Guard to prevent service worker registration from running multiple times.
     */
    __swRegistrationHandled?: boolean;

    /**
     * Set of registered after-swap handlers to prevent duplicates.
     */
    __registeredHandlers?: Set<string>;

    /**
     * Function to register handlers for View Transition after-swap events.
     */
    __registerAfterSwap?: (name: string, handler: () => void) => void;

    /**
     * Guard to prevent page transition listeners from stacking.
     */
    __pageTransitionRegistered?: boolean;

    /**
     * Guard to prevent page loader listeners from stacking
     * on View Transitions.
     */
    __pageLoaderRegistered?: boolean;

    /**
     * Guard to prevent keyboard shortcuts from registering multiple times.
     */
    __keyboardShortcutsRegistered?: boolean;

    /**
     * Guard to prevent speculative prefetch listeners from stacking
     * on View Transitions.
     */
    __prefetchRegistered?: boolean;

    /**
     * Guard to prevent article layout View Transition listeners from stacking.
     */
    __articleLayoutRegistered?: boolean;

    /**
     * Guard to prevent post layout View Transition listeners from stacking.
     */
    __postLayoutRegistered?: boolean;

    /**
     * Guard to prevent web vitals View Transition listeners from stacking.
     */
    __webVitalsRegistered?: boolean;

    /**
     * Guard to prevent web vitals init from running multiple times.
     */
    __webVitalsInitialized?: boolean;

    /**
     * Set of URLs that have already been prefetched to avoid duplicates.
     */
    __prefetchedUrls?: Set<string>;

    /**
     * Array of prefetch link elements for cleanup on navigation.
     */
    __prefetchLinks?: HTMLElement[];

    /**
     * Console easter egg commands for curious developers.
     */
    __wn?: {
      hire: () => void;
      stack: () => void;
      help: () => void;
    };
  }
}

export {};
