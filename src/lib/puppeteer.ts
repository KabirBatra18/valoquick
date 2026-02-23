import puppeteerCore, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface PdfOptions {
  headerTemplate?: string;
  footerTemplate?: string;
  marginTop?: string;
  marginBottom?: string;
}

async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    });
  } else {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
    }) as unknown as Browser;
  }
}

export async function htmlToPdfBase64(html: string, options?: PdfOptions): Promise<string> {
  let browser: Browser | null = null;

  // Hard timeout: 90s — must finish before Vercel's function timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    if (controller.signal.aborted) throw new Error('PDF generation aborted');

    browser = await getBrowser();
    const page = await browser.newPage();

    try {
      page.setDefaultTimeout(30000);

      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Base64 images are inline — just give a short settle time
      await new Promise((r) => setTimeout(r, 1500));

      if (controller.signal.aborted) throw new Error('PDF generation aborted');

      const useHeaderFooter = !!(options?.headerTemplate || options?.footerTemplate);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: options?.marginTop || '10mm',
          right: '10mm',
          bottom: options?.marginBottom || '10mm',
          left: '10mm',
        },
        printBackground: true,
        displayHeaderFooter: useHeaderFooter,
        ...(useHeaderFooter && {
          headerTemplate: options!.headerTemplate || '<span></span>',
          footerTemplate: options!.footerTemplate || '<span></span>',
        }),
        timeout: 60000,
      });

      return Buffer.from(pdfBuffer).toString('base64');
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    clearTimeout(timer);
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
