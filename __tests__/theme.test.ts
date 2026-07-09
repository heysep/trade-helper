import { colors, type, space, radius } from '../src/theme';
import { BRAND, DISCLAIMER } from '../src/constants/brand';

describe('design tokens', () => {
  it('uses service-safe accent, not Binance yellow', () => {
    expect(colors.primary.toLowerCase()).toBe('#f5b301');
    const all = JSON.stringify(colors).toLowerCase();
    expect(all).not.toContain('#fcd535');
  });
  it('has dual canvas + trading semantics', () => {
    expect(colors.canvasDark).toBe('#0b0e11');
    expect(colors.tradingUp).toBe('#0ecb81');
    expect(colors.tradingDown).toBe('#f6465d');
    expect(colors.statusWatch).toBe(colors.primary);
  });
  it('numbers use IBM Plex Mono with tabular figures', () => {
    expect(type.numberMd.fontFamily).toContain('IBMPlexMono');
    expect(type.numberMd.fontVariant).toContain('tabular-nums');
    expect(type.bodyMd.fontFamily).toContain('Inter');
  });
  it('spacing/radius scales', () => {
    expect(space.section).toBe(56);
    expect(radius.md).toBe(6);
    expect(radius.pill).toBe(9999);
  });
  it('brand is centralized and disclaimer exists', () => {
    expect(BRAND.appName).toBe('WhyBuy');
    expect(BRAND.appNameKo).toBe('왜샀나');
    expect(DISCLAIMER.length).toBeGreaterThan(10);
  });
});
