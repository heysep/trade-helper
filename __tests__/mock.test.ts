import { isMockMode, MOCK } from '../src/lib/mock';

describe('isMockMode', () => {
  it('true when explicitly forced', () => {
    expect(isMockMode({ EXPO_PUBLIC_USE_MOCK: '1', EXPO_PUBLIC_SUPABASE_URL: 'https://x.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBe(true);
  });
  it('true when supabase env missing', () => {
    expect(isMockMode({})).toBe(true);
  });
  it('false when env present and not forced', () => {
    expect(isMockMode({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBe(false);
  });
});

describe('MOCK dataset', () => {
  it('has 3 holdings incl KRX + US', () => {
    expect(MOCK.holdings).toHaveLength(3);
    expect(MOCK.holdings.some((h) => h.market === 'KRX')).toBe(true);
    expect(MOCK.holdings.some((h) => h.market === 'US')).toBe(true);
  });
  it('theses have soundness_review with counterpoints', () => {
    expect(MOCK.theses.length).toBeGreaterThanOrEqual(3);
    const reviewed = MOCK.theses.filter((t) => t.soundness_review);
    expect(reviewed.length).toBeGreaterThanOrEqual(2);
    expect(reviewed[0]!.soundness_review!.counterpoints.length).toBeGreaterThan(0);
  });
  it('check results today cover hold/watch/reduce', () => {
    const today = new Date().toISOString().slice(0, 10);
    const opinions = MOCK.checkResults.filter((r) => r.check_date === today).map((r) => r.opinion);
    expect(opinions).toEqual(expect.arrayContaining(['hold', 'watch', 'reduce']));
  });
  it('calendar items reference theses and have future dates', () => {
    expect(MOCK.checkConditions.length).toBeGreaterThanOrEqual(5);
    for (const c of MOCK.checkConditions) {
      expect(MOCK.theses.some((t) => t.id === c.thesis_id)).toBe(true);
      expect(c.next_check_date).toBeTruthy();
    }
  });
});
