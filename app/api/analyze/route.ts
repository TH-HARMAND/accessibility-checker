import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccessibilityIssue {
  type: string;
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const issues: AccessibilityIssue[] = await page.evaluate(() => {
      const problems: AccessibilityIssue[] = [];

      const imagesWithoutAlt = Array.from(document.querySelectorAll('img')).filter(
        (img) => !img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === ''
      );
      if (imagesWithoutAlt.length > 0) {
        problems.push({
          type: 'Images sans attribut alt',
          severity: 'critical',
          description: `${imagesWithoutAlt.length} image(s) sans texte alternatif détectée(s)`,
          count: imagesWithoutAlt.length,
        });
      }

      const inputsWithoutLabel = Array.from(
        document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
      ).filter((input) => {
        const id = input.id;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        return !hasLabel && !ariaLabel && !ariaLabelledby;
      });
      if (inputsWithoutLabel.length > 0) {
        problems.push({
          type: 'Champs de formulaire sans label',
          severity: 'critical',
          description: `${inputsWithoutLabel.length} champ(s) sans label accessible détecté(s)`,
          count: inputsWithoutLabel.length,
        });
      }

      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span, li, button'));
      let lowContrastCount = 0;

      const getContrast = (rgb1: number[], rgb2: number[]) => {
        const luminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((val) => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const l1 = luminance(rgb1);
        const l2 = luminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const parseRgb = (color: string): number[] | null => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
      };

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const color = parseRgb(style.color);
        const bgColor = parseRgb(style.backgroundColor);

        if (color && bgColor) {
          const contrast = getContrast(color, bgColor);
          if (contrast < 4.5) lowContrastCount++;
        }
      });

      if (lowContrastCount > 0) {
        problems.push({
          type: 'Contraste insuffisant',
          severity: 'moderate',
          description: `${lowContrastCount} élément(s) avec un contraste potentiellement insuffisant`,
          count: lowContrastCount,
        });
      }

      return problems;
    });

    await browser.close();

    let score = 100;
    issues.forEach((issue) => {
      if (issue.severity === 'critical') score -= issue.count * 5;
      if (issue.severity === 'moderate') score -= issue.count * 2;
      if (issue.severity === 'minor') score -= issue.count * 1;
    });
    score = Math.max(0, score);

    return NextResponse.json({
      url,
      score,
      issues,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur analyse:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
