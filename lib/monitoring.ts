/**
 * Monitoring stub for future observability integration
 *
 * This file is a placeholder for future monitoring and analytics tools like:
 * - Sentry (error tracking)
 * - PostHog (analytics)
 * - LogRocket (session replay)
 *
 * For now, all functions just log to console.
 * When ready, install the appropriate SDK and update these functions.
 */

export interface MonitoringContext {
  user?: {
    id: string;
    email: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Initialize monitoring (to be called in app initialization)
 * TODO: Replace with actual SDK initialization
 */
export function initMonitoring() {
  if (process.env.NODE_ENV === "development") {
    console.log("[Monitoring] Stub initialized (not configured yet)");
  }
}

/**
 * Log an error
 * TODO: Replace with Sentry.captureException or equivalent
 */
export function logError(
  error: Error,
  context?: MonitoringContext
) {
  console.error("[Monitoring] Error:", error, context);
}

/**
 * Log a message
 * TODO: Replace with appropriate logging solution
 */
export function logMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: MonitoringContext
) {
  const logFn = level === "error" ? console.error :
                level === "warning" ? console.warn :
                console.log;

  logFn(`[Monitoring] ${message}`, context);
}

/**
 * Track an event
 * TODO: Replace with PostHog or similar analytics
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  console.log(`[Monitoring] Event: ${eventName}`, properties);
}

/**
 * Set user context for monitoring
 * TODO: Replace with Sentry.setUser or equivalent
 */
export function setUser(user: { id: string; email: string } | null) {
  console.log("[Monitoring] User context set:", user);
}

/**
 * Add breadcrumb for debugging
 * TODO: Replace with Sentry.addBreadcrumb or equivalent
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>
) {
  console.log(`[Monitoring] Breadcrumb [${category}]:`, message, data);
}
