import { describe, it, expect } from 'vitest';
import { escapeHtml } from '@/lib/pdf-templates';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('AT&T')).toBe('AT&amp;T');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('passes through normal text unchanged', () => {
    expect(escapeHtml('Smt Raj Khurana')).toBe('Smt Raj Khurana');
  });

  it('passes through numbers as strings unchanged', () => {
    expect(escapeHtml('12345')).toBe('12345');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles Indian addresses correctly', () => {
    const address = 'D-44, Block-F, Tagore Garden, New Delhi - 110027';
    expect(escapeHtml(address)).toBe(address);
  });

  it('escapes HTML attributes injection', () => {
    expect(escapeHtml('" onload="alert(1)')).toBe('&quot; onload=&quot;alert(1)');
  });

  it('escapes nested HTML tags', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
  });
});
