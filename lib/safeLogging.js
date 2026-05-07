export function maskEmail(value) {
  if (!value || typeof value !== 'string') return '[redacted-email]';

  const normalized = value.trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '[redacted-email]';

  const maskedLocal = local.length <= 2
    ? `${local[0] || '*'}***`
    : `${local[0]}***${local[local.length - 1]}`;
  const [domainName, ...domainRest] = domain.split('.');
  const maskedDomainName = domainName
    ? `${domainName[0]}***`
    : '***';
  const suffix = domainRest.length ? `.${domainRest.join('.')}` : '';

  return `${maskedLocal}@${maskedDomainName}${suffix}`;
}

export function maskIdentifier(value) {
  if (!value) return '[redacted-id]';

  const text = String(value);
  if (text.length <= 8) return '[redacted-id]';

  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export function safeErrorDetails(error) {
  if (!error || typeof error !== 'object') {
    return { type: typeof error };
  }

  return {
    name: error.name || undefined,
    code: error.code || error.statusCode || error.status || undefined,
    status: error.status || undefined,
  };
}
